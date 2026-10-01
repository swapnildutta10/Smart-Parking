import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AdminApp from "./Auth/AdminApp";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
