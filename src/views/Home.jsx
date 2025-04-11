import React, { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { get } from "aws-amplify/api";
// Add this import for authentication check
import { getCurrentUser } from "aws-amplify/auth";
import { withTranslation } from "react-i18next";
import { 
  Users, 
  Package, 
  BarChart2, 
  AlertCircle, 
  Heart, 
  MapPin, 
  Clock, 
  CheckCircle,
  ArrowRight
} from "lucide-react";
import "./Home.css"; // Make sure to import the CSS file
import i18n from '../i18n'; // Adjust the path as needed

const apiName = "fcjemergency";
const path = "/requesters/count";
const volunteersPath = "/volunteers";

function Home(props) {
  const navigate = useNavigate();
  const [requestSum, setRequestSum] = useState([]);
  const [volunteer, setVolunteer] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Add this state to track authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { t, i18n } = props;

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuthStatus = async () => {
      try {
        // Attempt to get the current user, which will throw an error if no one is signed in
        const user = await getCurrentUser();
        setIsAuthenticated(true);

        // Only fetch data if user is authenticated
        await Promise.all([getAllRequests(), getNumberOfVolunteer()]);
      } catch (error) {
        console.log("User not authenticated", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
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

    return <div className="number">{count.toLocaleString(i18n.language === 'mi' ? 'my-MM' : 'en-US')}</div>;
  };

  console.log(i18n.language);

  return (
    <div className="home-container">
      <Outlet />

      <div className="hero">
        <div className="hero-content">
          <h1>{t('home.title')}</h1>
          <p>{t('home.des')}</p>

          <div className="hero-buttons">
            <button
              className="hero-button primary"
              onClick={() => navigate("/request")}
            >
              <AlertCircle size={20} />
              {t('home.req.btn-txt')}
              <ArrowRight size={20} />
            </button>
            <button
              className="hero-button secondary"
              onClick={() => navigate("/dashboard")}
            >
              <BarChart2 size={20} />
              {t('home.dash.btn-txt')}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h2 className="section-title">{t('home.features.title')}</h2>
        <div className="card-container">
          <div className="card">
            <div className="card-icon">
              <Users size={40} />
            </div>
            <h2>{t('home.req.title')}</h2>
            <p>{t('home.req.desc')}</p>
            <button
              className="card-button"
              onClick={() => navigate("/request")}
            >
              {t('home.req.btn-txt')}
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="card">
            <div className="card-icon">
              <Package size={40} />
            </div>
            <h2>{t('home.vol.title')}</h2>
            <p>{t('home.vol.desc')}</p>
            <button
              className="card-button"
              onClick={() => navigate("/requestList")}
            >
              {t('home.vol.btn-txt')}
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="card">
            <div className="card-icon">
              <BarChart2 size={40} />
            </div>
            <h2>{t('home.dash.title')}</h2>
            <p>{t('home.dash.desc')}</p>
            <button
              className="card-button"
              onClick={() => navigate("/dashboard")}
            >
              {t('home.dash.btn-txt')}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {isAuthenticated ? (
        <div className="statistics">
          <h2 className="stats-title">{t('home.disaster-title')}</h2>
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon">
                <AlertCircle size={32} />
              </div>
              <h3>{t('home.disaster-infor.1')}</h3>
              {isLoading ? (
                <div className="number">...</div>
              ) : (
                <AnimatedNumber value={requestSum.totalRequests || 0} />
              )}
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Users size={32} />
              </div>
              <h3>{t('home.disaster-infor.2')}</h3>
              {isLoading ? (
                <div className="number">...</div>
              ) : (
                <AnimatedNumber value={volunteer.length || 0} />
              )}
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <CheckCircle size={32} />
              </div>
              <h3>{t('home.disaster-infor.3')}</h3>
              {isLoading ? (
                <div className="number">...</div>
              ) : (
                <div className="number">-</div>
              )}
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <MapPin size={32} />
              </div>
              <h3>{t('home.disaster-infor.4')}</h3>
              {isLoading ? (
                <div className="number">...</div>
              ) : (
                <div className="number">-</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="cta-section">
        <h2>{t('home.cta.title')}</h2>
        <p>{t('home.cta.description')}</p>
        <button className="cta-button" onClick={() => navigate("/request")}>
          <Heart size={20} />
          {t('home.cta.button')}
          <ArrowRight size={20} />
        </button>
      </div>

      <footer className="home-footer">
        <p>{new Date().getFullYear()} © {t('home.footer')}</p>
      </footer>
    </div>
  );
}

export default withTranslation()(Home);