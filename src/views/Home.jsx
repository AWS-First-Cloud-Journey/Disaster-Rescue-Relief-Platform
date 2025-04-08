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
  const [isLoading, setIsLoading] = useState(true);
  const { t } = props;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([getAllRequests(), getNumberOfVolunteer()]);
      setIsLoading(false);
    };
    
    fetchData();
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
      return json;
    } catch (error) {
      console.log(error);
      return null;
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
      return json;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  // Function to animate count up for statistics
  const AnimatedNumber = ({ value, duration = 2000 }) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      if (!value) return;
      
      let start = 0;
      const end = parseInt(value);
      const increment = end / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        setCount(Math.floor(start));
        if (start >= end) {
          clearInterval(timer);
          setCount(end);
        }
      }, 16);
      
      return () => clearInterval(timer);
    }, [value, duration]);
    
    return <div className="number">{count.toLocaleString()}</div>;
  };

  return (
    <div className="home-container">
      <Outlet />
      
      <div className="hero">
        <div className="hero-content">
          <h1>{t("home.title")}</h1>
          <p>{t("home.des")}</p>
          
          <div className="hero-buttons">
            <button 
              className="hero-button" 
              onClick={() => navigate("/request")}
            >
              {t("home.req.btn-txt")}
            </button>
            <button 
              className="hero-button secondary" 
              onClick={() => navigate("/dashboard")}
            >
              {t("home.dash.btn-txt")}
            </button>
          </div>
        </div>
      </div>

      <div className="card-container">
        <div className="card">
          <div className="card-icon">👤</div>
          <h2>{t("home.req.title")}</h2>
          <p>{t("home.req.desc")}</p>
          <button 
            className="card-button" 
            onClick={() => navigate("/request")}
          >
            {t("home.req.btn-txt")}
          </button>
        </div>
        
        <div className="card">
          <div className="card-icon">📦</div>
          <h2>{t("home.vol.title")}</h2>
          <p>{t("home.vol.desc")}</p>
          <button 
            className="card-button" 
            onClick={() => navigate("/requestList")}
          >
            {t("home.vol.btn-txt")}
          </button>
        </div>
        
        <div className="card">
          <div className="card-icon">📊</div>
          <h2>{t("home.dash.title")}</h2>
          <p>{t("home.dash.desc")}</p>
          <button 
            className="card-button" 
            onClick={() => navigate("/dashboard")}
          >
            {t("home.dash.btn-txt")}
          </button>
        </div>
      </div>

      <div className="statistics">
        <h2 className="stats-stitle">{t("home.disaster-title")}</h2>
        <div className="stats-container">
          <div className="stat-card red">
            <h3>{t("home.disaster-infor.1")}</h3>
            {isLoading ? (
              <div className="number">...</div>
            ) : (
              <AnimatedNumber value={requestSum.totalRequests || 0} />
            )}
          </div>
          
          <div className="stat-card yellow">
            <h3>{t("home.disaster-infor.2")}</h3>
            {isLoading ? (
              <div className="number">...</div>
            ) : (
              <AnimatedNumber value={volunteer.length || 0} />
            )}
          </div>
          
          <div className="stat-card green">
            <h3>{t("home.disaster-infor.3")}</h3>
            {isLoading ? (
              <div className="number">...</div>
            ) : (
              <div className="number">-</div>
            )}
          </div>
          
          <div className="stat-card blue">
            <h3>{t("home.disaster-infor.4")}</h3>
            {isLoading ? (
              <div className="number">...</div>
            ) : (
              <div className="number">-</div>
            )}
          </div>
        </div>
      </div>
      
      <footer className="home-footer">
        <p>{new Date().getFullYear()} © {t("home.footer", "Myanmar Earthquake Aid Coordination")}</p>
      </footer>
    </div>
  );
}

export default withTranslation()(Home);