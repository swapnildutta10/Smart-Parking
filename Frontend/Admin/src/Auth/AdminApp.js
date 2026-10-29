import React from "react";
import "../style/design.css";
import MemberPortal from "./MemberPortal";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "../Dashboard/AdminDashboard";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function AdminApp() {
  const [memberPortal, setMemberPortal] = React.useState(window.location.hash === "#member");
  const [token, setToken] = React.useState(null);
  const [restoringSession, setRestoringSession] = React.useState(true);

  React.useEffect(() => {
    const savedToken = localStorage.getItem("parknova-admin-token");
    if (!savedToken) {
      setRestoringSession(false);
      return undefined;
    }
    let cancelled = false;
    fetch(`${API_URL}/admin/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
      .then((response) => {
        if (!response.ok) throw Object.assign(new Error("Admin session has expired."), { status: response.status });
        if (!cancelled) setToken(savedToken);
      })
      .catch((error) => {
        if (cancelled) return;
        if ([401, 403].includes(error.status)) localStorage.removeItem("parknova-admin-token");
        else setToken(savedToken);
      })
      .finally(() => {
        if (!cancelled) setRestoringSession(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (restoringSession) return <main role="status" aria-live="polite">Checking admin session…</main>;

  if (!token) {
    return memberPortal ? <MemberPortal onBack={() => { window.location.hash = "admin"; setMemberPortal(false); }} /> : <AdminLogin onMemberLogin={() => { window.location.hash = "member"; setMemberPortal(true); }} onLoginSuccess={setToken} />;
  }

  return <AdminDashboard token={token} onLogout={() => {
    localStorage.removeItem("parknova-admin-token");
    setToken(null);
  }} />;
}

export default AdminApp;
