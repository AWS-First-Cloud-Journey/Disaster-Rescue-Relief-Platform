import React, { useState, useEffect } from "react";
import { navigate, useNavigate } from "react-router-dom";
import { get } from "aws-amplify/api";
import NavBar from "../components/NavBar";
import { withTranslation } from "react-i18next";

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
      // const response = await API.put(apiName, path, {body: data});
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

  return (
    <>
      {/* <div class="navbar">
        <a href="/" class="logo">
          <span class="icon">⚠️</span>
          <span>DisasterRescue</span>
        </a>
        <div class="nav-links">
          <a href="/request">Request Help</a>
          <a href="/requestList">Volunteer</a>
          <a href="/dashboard">Dashboard</a>
        </div>
        <div>
          <button class="login-btn" onClick={(e) => navigate("/auth")}>
            Login
          </button>
          <button class="regist-btn" onClick={(e) => navigate("/auth")}>
            Register
          </button>
        </div>
      </div> */}
      <NavBar />

      <div class="hero">
        <h1>{t("home.title")}</h1>
        <p>
          {t("home.des")}
        </p>
      </div>

      <div class="card-container">
        <div class="card">
          <div class="card-icon">👤</div>
          <h2>{t("home.req.title")}</h2>
          <p>{t("home.req.desc")}</p>
          <button class="card-button" onClick={(e) => navigate("/request")}>
            {t("home.req.btn-txt")}
          </button>
        </div>
        <div class="card">
          <div class="card-icon">📦</div>
          <h2>{t("home.vol.title")}</h2>
          <p>{t("home.vol.desc")}</p>
          <button class="card-button" onClick={(e) => navigate("/requestList")}>
            {t("home.vol.btn-txt")}
          </button>
        </div>
        <div class="card">
          <div class="card-icon">📊</div>
          <h2>{t("home.dash.title")}</h2>
          <p>{t("home.dash.desc")}</p>
          <button class="card-button" onClick={(e) => navigate("/dashboard")}>
            {t("home.dash.btn-txt")}
          </button>
        </div>
      </div>

      <div class="statistics">
        <h2 className="stats-stitle">{t("home.disaster-title")}</h2>
        <div class="stats-container">
          <div class="stat-card red">
            <h3>{t("home.disaster-infor.1")}</h3>
            <div class="number">{requestSum.totalRequests}</div>
          </div>
          <div class="stat-card yellow">
            <h3>{t("home.disaster-infor.2")}</h3>
            <div class="number">{volunteer.length}</div>
          </div>
          <div class="stat-card green">
            <h3>{t("home.disaster-infor.3")}</h3>
            <div class="number">-</div>
          </div>
          <div class="stat-card blue">
            <h3>{t("home.disaster-infor.4")}</h3>
            <div class="number">-</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default withTranslation()(Home);
