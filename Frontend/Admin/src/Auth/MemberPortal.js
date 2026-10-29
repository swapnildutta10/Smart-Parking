import React from "react";
import AdminDashboard from "../Dashboard/AdminDashboard";
import LoginShell from "./LoginShell";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function MemberPortal({ onBack }) {
  const [memberId, setMemberId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [member, setMember] = React.useState(null);
  const token = React.useRef(null);
  React.useEffect(() => {
    if (!member) return undefined;
    async function check() {
      try {
        const response = await fetch(`${API}/members/me`, { headers: { Authorization: `Bearer ${token.current}` } });
        if ([401, 403].includes(response.status)) {
          token.current = null; setMember(null); setError("Your member session ended or your account was suspended. Contact the administrator.");
        }
      } catch { /* Retry the access check on the next interval. */ }
    }
    const timer = window.setInterval(check, 15000);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", check); };
  }, [member]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/members/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: memberId.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not complete the request.");
      setPassword("");
      token.current = result.token;
      const profile = await fetch(`${API}/members/me`, { headers: { Authorization: `Bearer ${result.token}` } });
      if (!profile.ok) throw new Error("Member access could not be verified.");
      setMember((await profile.json()).member);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  if (member) return <AdminDashboard token={token.current} isMember onLogout={() => { token.current = null; setMember(null); }} />;
  return <LoginShell member onSwitch={onBack}>
    <p className="pn-admin-overline">MEMBER WORKSPACE</p>
    <>
      <h2>Member sign in</h2>
      <p className="pn-admin-form-intro">Sign in with the separate member ID and password assigned by your administrator.</p>
      <form className="pn-admin-form" onSubmit={submit}>
        <label className="pn-admin-field">Member ID<input required autoComplete="username" minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,39}" title="Use the member ID assigned by your administrator." placeholder="e.g. MEMBER-001" aria-describedby="pn-member-id-help" value={memberId} onChange={e => setMemberId(e.target.value)} /></label>
        <p id="pn-member-id-help" className="pn-admin-form-intro">Use your separate member credentials. Contact your administrator if you need a member account.</p>
        <label className="pn-admin-field">Member password<input required type="password" maxLength={128} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p className="pn-admin-error" role="alert">{error}</p>}
        <button className="pn-admin-submit" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</button>
      </form>
    </>
    <a className="pn-admin-back" href={process.env.REACT_APP_USER_SITE_URL || "http://localhost:3000"}>← Visit the ParkNova user site</a>
  </LoginShell>;
}
