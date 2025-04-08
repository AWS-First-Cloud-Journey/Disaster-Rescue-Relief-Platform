import React, { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { get } from "aws-amplify/api";
import { withTranslation } from "react-i18next";
import "./Home.css"; // Make sure to import the CSS file

const apiName = "fcjemergency";
const path = "/requesters/count";
const volunteersPath = "/volunteers";

function Home(props) {
  const navigate = useNavigate();
  const [requestSum, setRequestSum] = useState([]);
  const [volunteer, setVolunteer] = useState([]);
  const { t } = props;

  useEffect(() => {
    getAllRequests();
    getNumberOfVolunteer();
  }, []);

  const getAllRequests = async () => {
    try {
      const restOperation = get({
        apiName: apiName,
        path: path,
      });
      const response = await restOperation.response;
      const json = await response.body.json();
      setRequestSum(json.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getNumberOfVolunteer = async () => {
    try {
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

  return (
    <div className="home-container">
      <Outlet />
      <div className="hero">
        <h1>{t("home.title")}</h1>
        <p>
          {t("home.des")}
        </p>
      </div>

      <div className="card-container">
        <div className="card">
          <div className="card-icon">👤</div>
          <h2>{t("home.req.title")}</h2>
          <p>{t("home.req.desc")}</p>
          <button className="card-button" onClick={() => navigate("/request")}>
            {t("home.req.btn-txt")}
          </button>
        </div>
        <div className="card">
          <div className="card-icon">📦</div>
          <h2>{t("home.vol.title")}</h2>
          <p>{t("home.vol.desc")}</p>
          <button className="card-button" onClick={() => navigate("/requestList")}>
            {t("home.vol.btn-txt")}
          </button>
        </div>
        <div className="card">
          <div className="card-icon">📊</div>
          <h2>{t("home.dash.title")}</h2>
          <p>{t("home.dash.desc")}</p>
          <button className="card-button" onClick={() => navigate("/dashboard")}>
            {t("home.dash.btn-txt")}
          </button>
        </div>
      </div>

      <div className="statistics">
        <h2 className="stats-stitle">{t("home.disaster-title")}</h2>
        <div className="stats-container">
          <div className="stat-card red">
            <h3>{t("home.disaster-infor.1")}</h3>
            <div className="number">{requestSum.totalRequests || 0}</div>
          </div>
          <div className="stat-card yellow">
            <h3>{t("home.disaster-infor.2")}</h3>
            <div className="number">{volunteer.length || 0}</div>
          </div>
          <div className="stat-card green">
            <h3>{t("home.disaster-infor.3")}</h3>
            <div className="number">-</div>
          </div>
          <div className="stat-card blue">
            <h3>{t("home.disaster-infor.4")}</h3>
            <div className="number">-</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withTranslation()(Home);