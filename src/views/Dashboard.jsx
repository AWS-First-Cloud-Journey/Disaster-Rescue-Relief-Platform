import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { DynamoDBClient, RequestLimitExceeded } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { get } from "aws-amplify/api";
import { withTranslation } from "react-i18next";
import './Dashboard.css';

// Initialize DynamoDB client
// const client = new DynamoDBClient({
//   region: 'ap-southeast-1', // replace with your AWS region
//   credentials: {
//     // Replace with your preferred authentication method
//     // For development, you might use environment variables or AWS Amplify
//     accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
//   },
// });

// const docClient = DynamoDBDocumentClient.from(client);

const apiName = "fcjemergency";
const path = "/requesters/count";
const countByDate = "/requesters/count-by-date";
const volunteersPath = "/volunteers";

const Dashboard = (props) => {
  // State for date range
  const { t } = props;
  const [startDate, setStartDate] = useState('03/26/2025');
  const [endDate, setEndDate] = useState('04/04/2025');

  // State for dashboard data
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    activeRequests: { count: 0, change: 0 },
    volunteers: { count: 0, change: 0 },
    fulfilledRequests: { count: 0, change: 0 },
    affectedAreas: { count: 0, change: 0 },
  });
  // const [dashboardStats, setDashboardStats] = useState({});
  const [recentRequests, setRecentRequests] = useState([]);
  const [requestTypes, setRequestTypes] = useState({
    medical: 0,
    water: 0,
    food: 0,
    shelter: 0,
    other: 0
  });
  const [requestStatus, setRequestStatus] = useState({
    pending: 0,
    verified: 0,
    fulfilled: 0
  });
  const [filterByDateData, setFilterByDateData] = useState({});
  const [totalRequests, setTotalRequests] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;
  const [requestSum, setRequestSum] = useState([]);
  const [volunteer, setVolunteer] = useState([]);

  useEffect(() => {
    // getAllRequests();
    getNumberOfVolunteer();
  }, []);

  const getAllRequests = async () => {
    try {
      // const response = await API.put(apiName, path, {body: data});
      const restOperation = get({
        apiName: apiName,
        path: path,
      });
      const response = await restOperation.response;
      const json = await response.body.json();
      console.log(json.data);
      setRequestSum(json.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getNumberOfVolunteer = async () => {
    try {
      // const response = await API.put(apiName, path, {body: data});
      const restOperation = get({
        apiName: apiName,
        path: volunteersPath,
      });
      const response = await restOperation.response;
      const json = await response.body.json();
      setVolunteer(json.volunteers);
    } catch (error) {
      console.log(error);
    }
  };

  // Function to fetch data from DynamoDB
  // const fetchData = async () => {
  //   setIsLoading(true);
  //   try {
  //     // Fetch all requests from the table
  //     const scanParams = {
  //       TableName: 'EmergencyInfor-dev', // replace with your actual table name
  //     };

  //     const scanResponse = await docClient.send(new ScanCommand(scanParams));
  //     const allRequests = scanResponse.Items || [];

  //     // Calculate total requests
  //     setTotalRequests(allRequests.length);
  //     setTotalPages(Math.ceil(allRequests.length / itemsPerPage));

  //     // Process requests data
  //     processRequestsData(allRequests);

  //     // Get recent requests for the table (paginated)
  //     const startIndex = (currentPage - 1) * itemsPerPage;
  //     const recentItems = allRequests
  //       .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  //       .slice(startIndex, startIndex + itemsPerPage)
  //       .map(item => ({
  //         id: `#${item.id}`,
  //         name: item.req_full_name,
  //         location: item.req_address,
  //         type: item.req_all_types || item.req_type,
  //         date: formatDate(item.created_at),
  //         status: capitalizeFirstLetter(item.status)
  //       }));

  //     setRecentRequests(recentItems);
  //   } catch (error) {
  //     console.error('Error fetching data from DynamoDB:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // Helper function to process and analyze the data
  const processRequestsData = (requests) => {
    // Count request types
    const types = {
      medical: 0,
      water: 0,
      food: 0,
      shelter: 0,
      other: 0
    };

    // Count request statuses
    const statuses = {
      pending: 0,
      verified: 0,
      fulfilled: 0
    };

    // Set of unique affected areas
    const affectedAreas = new Set();

    // Count requests by type and status
    requests.forEach(request => {
      // Add location to affected areas
      if (request.req_address) {
        affectedAreas.add(request.req_address);
      }

      // Count by status
      if (request.status) {
        const status = request.status.toLowerCase();
        if (statuses.hasOwnProperty(status)) {
          statuses[status]++;
        }
      }

      // Count by type
      const reqType = request.req_type ? request.req_type.toLowerCase() : '';
      if (reqType.includes('medical')) types.medical++;
      if (reqType.includes('water')) types.water++;
      if (reqType.includes('food')) types.food++;
      if (reqType.includes('shelter')) types.shelter++;

      // If has quantities, also count those
      if (request.medical_supplies_quantity > 0) types.medical++;
      if (request.water_liters > 0) types.water++;
      if (request.food_meals_quantity > 0) types.food++;
      if (request.shelter_people_quantity > 0) types.shelter++;

      // If none of the above, count as other
      if (!reqType.includes('medical') &&
        !reqType.includes('water') &&
        !reqType.includes('food') &&
        !reqType.includes('shelter') &&
        !request.medical_supplies_quantity &&
        !request.water_liters &&
        !request.food_meals_quantity &&
        !request.shelter_people_quantity) {
        types.other++;
      }
    });

    // Calculate some mock percent changes (in a real app, this would compare to previous period)
    const activeChange = Math.floor(Math.random() * 15);
    const volunteersChange = Math.floor(Math.random() * 10);
    const fulfilledChange = Math.floor(Math.random() * 20);

    // Update state with calculated values
    setRequestTypes(types);
    setRequestStatus(statuses);
    setDashboardStats({
      activeRequests: { count: requests.length, change: activeChange },
      volunteers: { count: requests.filter(r => r.assigned_user).length, change: volunteersChange },
      fulfilledRequests: { count: statuses.fulfilled, change: fulfilledChange },
      affectedAreas: { count: affectedAreas.size, change: 0 }
    });
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Helper function to capitalize the first letter
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Fetch data when component mounts or when date range changes
  // useEffect(() => {
  //   fetchData();
  // }, [currentPage, startDate, endDate]);

  // Convert request type counts to chart heights
  const getChartHeight = (value, maxValue) => {
    if (maxValue === 0) return '0px';
    return `${(value / maxValue) * 220}px`;
  };

  // Function to apply date filter
  // const applyDateFilter = () => {
  //   fetchData();
  // };

  // Calculate maximum values for charts
  const maxRequestType = Math.max(...Object.values(requestTypes));
  const maxRequestStatus = Math.max(...Object.values(requestStatus));

  const loadDataByDate = async () => {
    try {
      console.log("startDate", startDate )
      const restOperation = get({
        apiName: apiName, path: countByDate, options: {
          queryParams: {
            startDate: startDate,
            endDate: endDate
          }
        }
      })
      const response = await restOperation.response;
      const json = await response.body.json();
      console.log(json.data);
      setFilterByDateData(json.data)
    } catch (error) {

    }
  }

  return (
    <>
      <NavBar />
      <div className="dashboard-container">
        {/* Dashboard Title */}
        <div className="dashboard-header">
          <h2>{t("dashboard-page.title")}</h2>
          <p>{t("dashboard-page.des")}</p>
        </div>

        {/* Date Range Selector */}
        <div className="date-range-container">
          <div className="date-range-label">{t("dashboard-page.data-text")}</div>
          <div className="date-inputs">
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
            <span>{t("dashboard-page.to")}</span>
            <input
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
            <button className="apply-button" onClick={(e) => loadDataByDate()}>{t("dashboard-page.apply")}</button>
          </div>
          <button className="export-button">{t("dashboard-page.export-data")}</button>
        </div>

        {/* Stat Cards */}
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-title">{t("dashboard-page.card.active-req")}</div>
            <div className="stat-value">{filterByDateData.byStatus?.PENDING || 0}</div>
            <div className={`stat-change ${dashboardStats.activeRequests.change > 0 ? 'increase' : dashboardStats.activeRequests.change < 0 ? 'decrease' : 'no-change'}`}>
              {dashboardStats.activeRequests.change > 0 ? '↑' : dashboardStats.activeRequests.change < 0 ? '↓' : ''} {Math.abs(dashboardStats.activeRequests.change)}% {t("dashboard-page.from_per_week")}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-title">{t("dashboard-page.card.vol")}</div>
            <div className="stat-value">{volunteer.length}</div>
            <div className={`stat-change ${dashboardStats.volunteers.change > 0 ? 'increase' : dashboardStats.volunteers.change < 0 ? 'decrease' : 'no-change'}`}>
              {dashboardStats.volunteers.change > 0 ? '↑' : dashboardStats.volunteers.change < 0 ? '↓' : ''} {Math.abs(dashboardStats.volunteers.change)}% {t("dashboard-page.from_per_week")}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-title">{t("dashboard-page.card.fulfilled")}</div>
            <div className="stat-value">{filterByDateData.byStatus?.DONE || 0}</div>
            <div className={`stat-change ${filterByDateData.completionRate > 0 ? 'increase' : filterByDateData.completionRate < 0 ? 'decrease' : 'no-change'}`}>
              {filterByDateData.completionRate > 0 ? '↑' : filterByDateData.completionRate < 0 ? '↓' : ''} {Math.abs(filterByDateData.completionRate)}% {t("dashboard-page.from_per_week")}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-title">{t("dashboard-page.card.affected")}</div>
            <div className="stat-value">_</div>
            <div className="stat-change no-change">
              {t("dashboard-page.card.no-data")}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-container">
          {/* Request Types Chart */}
          <div className="chart-box">
            <div className="chart-header">
              <h3>{t("dashboard-page.chart.title")}</h3>
              <div className="time-filters">
                <button className="time-filter active">{t("dashboard-page.chart.time.time-1")}</button>
                <button className="time-filter">{t("dashboard-page.chart.time.time-2")}</button>
                <button className="time-filter">{t("dashboard-page.chart.time.time-3")}</button>
              </div>
            </div>

            <div className="chart-content">
              {isLoading ? (
                <div className="loading-indicator">{t("dashboard-page.chart.loading_chart")}</div>
              ) : (
                <div className="bar-chart request-types-chart">
                  <div className="bar medical" style={{ height: getChartHeight(requestTypes.medical, maxRequestType) }}></div>
                  <div className="bar water" style={{ height: getChartHeight(requestTypes.water, maxRequestType) }}></div>
                  <div className="bar food" style={{ height: getChartHeight(requestTypes.food, maxRequestType) }}></div>
                  <div className="bar shelter" style={{ height: getChartHeight(requestTypes.shelter, maxRequestType) }}></div>
                  <div className="bar other" style={{ height: getChartHeight(requestTypes.other, maxRequestType) }}></div>
                </div>
              )}
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color medical"></span>
                  <span>{t("dashboard-page.supply")} ({requestTypes.medical})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color water"></span>
                  <span>{t("dashboard-page.water")} ({requestTypes.water})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color food"></span>
                  <span>{t("dashboard-page.food")} ({requestTypes.food})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color shelter"></span>
                  <span>{t("dashboard-page.shelter")} ({requestTypes.shelter})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color other"></span>
                  <span>{t("dashboard-page.other")} ({requestTypes.other})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Status Chart */}
          <div className="chart-box">
            <div className="chart-header">
              <h3>{t("dashboard-page.status_chart")}</h3>
              <div className="time-filters">
                <button className="time-filter active">{t("dashboard-page.chart.time.time-1")}</button>
                <button className="time-filter">{t("dashboard-page.chart.time.time-2")}</button>
                <button className="time-filter">{t("dashboard-page.chart.time.time-3")}</button>
              </div>
            </div>

            <div className="chart-content">
              {isLoading ? (
                <div className="loading-indicator">{t("dashboard-page.chart.loading_chart")}</div>
              ) : (
                <div className="bar-chart request-status-chart">
                  <div className="bar pending" style={{ height: getChartHeight(requestStatus.pending, maxRequestStatus) }}></div>
                  <div className="bar verified" style={{ height: getChartHeight(requestStatus.verified, maxRequestStatus) }}></div>
                  <div className="bar fulfilled" style={{ height: getChartHeight(requestStatus.fulfilled, maxRequestStatus) }}></div>
                </div>
              )}
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color pending"></span>
                  <span>{t("dashboard-page.pending")} ({requestStatus.pending})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color verified"></span>
                  <span>{t("dashboard-page.in-progress")} ({requestStatus.verified})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color fulfilled"></span>
                  <span>{t("dashboard-page.done")} ({requestStatus.fulfilled})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Request Locations */}
        <div className="locations-section">
          <div className="section-header">
            <h3>{t("dashboard-page.req_type")}</h3>
            <div className="section-filters">
              <select className="filter-select">
                <option>{t("dashboard-page.all_req")}</option>
                <option>{t("dashboard-page.pending")}</option>
                <option>{t("dashboard-page.in-progress")}</option>
                <option>{t("dashboard-page.done")}</option>
              </select>
              <select className="filter-select">
                <option>{t("dashboard-page.all_type")}</option>
                <option>{t("dashboard-page.supply")}</option>
                <option>{t("dashboard-page.water")}</option>
                <option>{t("dashboard-page.food")}</option>
                <option>{t("dashboard-page.shelter")}</option>
                <option>{t("dashboard-page.other")}</option>
              </select>
            </div>
          </div>
          <div className="map-container">
            {/* In a real implementation, you would integrate a map library like Google Maps, Mapbox, etc. */}
            <div className="map-placeholder">
              <div className="placeholder-text">
                {isLoading ? t("dashboard-page.loading_map") : t("dashboard-page.map_view")}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="requests-section">
          <div className="section-header">
            <h3>{t("dashboard-page.recent_requests")}</h3>
            <div className="section-filters">
              <select className="filter-select">
                <option>{t("dashboard-page.all_status")}</option>
                <option>{t("dashboard-page.pending")}</option>
                <option>{t("dashboard-page.in-progress")}</option>
                <option>{t("dashboard-page.done")}</option>
              </select>
              <select className="filter-select">
                <option>{t("dashboard-page.all_type")}</option>
                <option>{t("dashboard-page.supply")}</option>
                <option>{t("dashboard-page.water")}</option>
                <option>{t("dashboard-page.food")}</option>
                <option>{t("dashboard-page.shelter")}</option>
                <option>{t("dashboard-page.other")}</option>
              </select>
            </div>
          </div>
          <div className="requests-table-container">
            {isLoading ? (
              <div className="loading-indicator">{t("dashboard-page.loading_req")}</div>
            ) : (
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>{t("dashboard-page.id")}</th>
                    <th>{t("detail-request-page.card.name")}</th>
                    <th>{t("detail-request-page.card.location")}</th>
                    <th>{t("dashboard-page.req_type")}</th>
                    <th>{t("dashboard-page.date")}</th>
                    <th>{t("detail-request-page.card.status")}</th>
                    <th>{t("dashboard-page.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.id}</td>
                      <td>{request.name}</td>
                      <td>{request.location}</td>
                      <td>{request.type}</td>
                      <td>{request.date}</td>
                      <td>
                        <span className={`status-badge ${request.status.toLowerCase()}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        <button className="view-button">{t("dashboard-page.view")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span className="page-info">
              {t("dashboard-page.show")} {isLoading ? '...' : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalRequests)}`} {t("dashboard-page.of")} {totalRequests} {t("dashboard-page.req-l")}
            </span>
            <div className="page-controls">
              <button
                className="page-button"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                «
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                // Show 5 pages max, centered around current page
                const pageOffset = Math.max(0, currentPage - 3);
                const pageNum = i + 1 + pageOffset;
                if (pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      className={`page-button ${pageNum === currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
              <button
                className="page-button"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default withTranslation()(Dashboard);