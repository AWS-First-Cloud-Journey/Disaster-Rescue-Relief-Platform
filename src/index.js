import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./style.scss";
import reportWebVitals from "./reportWebVitals";
import "@cloudscape-design/global-styles/index.css";

// Import locale context
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

// Import amplify
import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports";

import {
  createHashRouter,
  Routes,
  Route,
  RouterProvider,
  BrowserRouter,
  Navigate
} from "react-router-dom";

//Import views
import App from "./App";
import ResquestForm from "./views/RequestForm";
import Home from "./views/Home";
import ResquestList from "./views/RequestList";
import AuthForm from "./components/AuthForm";
import Dashboard from "./views/Dashboard";
import RequestDetail from "./views/RequestDetail";
import VolunteerManagement from "./views/VolunteerManagement";
import FAQ from "./views/FAQ";


Amplify.configure(awsExports);
 
 const router = createHashRouter([
   {
     path: "/",
     element: <Home />,
   },
   {
     path: "/request",
     element: <ResquestForm />,
   },
   {
     path: "/requestList",
     element: <ResquestList />,
   },
 ]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="request" element={<ResquestForm />} />
            <Route path="requestList" element={<ResquestList />} />
            <Route path="requestList/:id" element={<RequestDetail />} />
            <Route path="management" element={<VolunteerManagement />} />
            <Route path="faq" element={<FAQ />} />
          </Route>
          <Route path="/auth" element={<AuthForm />} />
        </Routes>
      </BrowserRouter>
    </I18nextProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
