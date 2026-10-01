import React from "react";
import "../style/design.css";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "../Dashboard/AdminDashboard";

function AdminApp() {
  const [loggedIn, setLoggedIn] = React.useState(false);

  if (!loggedIn) {
    return <AdminLogin onLoginSuccess={() => setLoggedIn(true)} />;
  }

  return <AdminDashboard onLogout={() => setLoggedIn(false)} />;
}

export default AdminApp;
