import { useState, useEffect } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import {
  TopNavigation,
  Input,
  ButtonDropdown,
  Button,
} from "@cloudscape-design/components";
import { withTranslation } from "react-i18next";
import { navigate, useNavigate } from "react-router-dom";
import { getCurrentUser, signOut, fetchUserAttributes } from "aws-amplify/auth";
import logo from "../assets/logo.jpg";
import { Languages } from "lucide-react";
import { use } from "i18next";

function NavBar(props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [language, setLanguage] = useState("en");
  const { t } = props;

  useEffect(() => {
    setLanguage(props.i18n.language);
  }, []);

  useEffect(() => {
    getUser();
  }, []);

  const logout = async () => {
    try {
      await signOut();
      setAuthenticated(false);
      setAuthChecked(false);
      setUser(null);
      navigate("/");
    } catch (error) {
      console.log("error signing out: ", error);
    }
  };

  const getUser = async () => {
    try {
      const user = await fetchUserAttributes();
      const user1 = await getCurrentUser();
      console.log("user", user1);
      setAuthChecked(true);
      setAuthenticated(true);
      setUser(user);
    } catch (error) {
      console.error("Error getting current user:", error);
      setAuthChecked(true);
      setAuthenticated(false);
    }
  };
  return (
    <>
      <nav class="navbar">
        <a onClick={() => navigate("/")} class="logo">
          <span>{t("nav.logo-text")}</span>
        </a>
        {!authChecked ? (
          <div class="nav-links">
            <a
              onClick={() => navigate("/request")}
              className={
                location.pathname === "/request" ? "nar-link-active" : ""
              }
            >
              {t("nav.links.links-req")}
            </a>
          </div>
          
        ) : authenticated && user["custom:role"] === "admin" ? (
          <div class="nav-links">
            <a
              onClick={() => navigate("/request")}
              className={
                location.pathname === "/request" ? "nar-link-active" : ""
              }
            >
              {t("nav.links.links-req")}
            </a>
            <a
              onClick={() => navigate("/requestList")}
              className={
                location.pathname === "/requestList" ? "nar-link-active" : ""
              }
            >
              {t("nav.links.links-vol")}
            </a>
            <a
              onClick={() => navigate("/dashboard")}
              className={
                location.pathname === "/dashboard" ? "nar-link-active" : ""
              }
            >
              {t("nav.links.links-dash")}
            </a>
            <a
              onClick={() => navigate("/management")}
              className={
                location.pathname === "/management" ? "nar-link-active" : ""
              }
            >
              {t("nav.links.links-management")}
            </a>
          </div>
        ) : (
          <div class="nav-links">
            <a
              onClick={() => navigate("/request")}
              className={
                location.pathname === "/request" ? "nar-link-active" : ""
              }
            >
              {t("nav.links.links-req")}
            </a>
            <a
              onClick={() => navigate("/requestList")}
              className={
                location.pathname === "/requestList" ? "nar-link-active" : ""
              }
            >
              {t("nav.links.links-vol")}
            </a>

            <a
              onClick={() => navigate("/faq")}
              className={
                location.pathname === "/faq" ? "nar-link-active" : ""
              }
            >
              {t("nav.links.links-faq")}
            </a>
          </div>
        )}

        {authenticated ? (
          <div>
            <Button
              variant="primary"
              class="regist-btn"
              onClick={() => logout()}
            >
              {t("nav.logout")}
            </Button>
          </div>
        ) : (
          <div>
            <Button class="login-btn" onClick={(e) => navigate("/auth")}>
              {t("nav.login")}
            </Button>
            {/* <button class="regist-btn" onClick={(e) => navigate("/auth")}>
              Register
            </button> */}
          </div>
        )}
        <ButtonDropdown
          onItemClick={(e) => {
            const newLang = e.detail.id;
            console.log(e.detail);
            props.i18n.changeLanguage(newLang);
            setLanguage(newLang);
          }}
          items={[
            { text: "English", id: "en", disabled: language === "en" },
            { text: "Burmese", id: "mi", disabled: language === "mi" },
          ]}
        >
          {language === "en" ? "English" : "Burmese"}
        </ButtonDropdown>
      </nav>
    </>
  );
}

export default withTranslation()(NavBar);
