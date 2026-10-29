import React from "react";
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
export default function MemberManagement({ token }) {
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  const [creating, setCreating] = React.useState(false);
  const [createdMessage, setCreatedMessage] = React.useState("");
  React.useEffect(() => {
    let active = true;
    let sequence = 0;
    const controller = new AbortController();
    setLoading(true); setError("");
    async function load() {
      const request = ++sequence;
      try {
        const response = await fetch(`${API}/admin/members`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load members.");
        if (!Array.isArray(result)) throw new Error("The server returned an invalid member list.");
        if (active && request === sequence) { setRows(result); setError(""); }
      } catch (err) {
        if (active && request === sequence) setError(err.message || "Could not reach the server.");
      } finally {
        if (active && request === sequence) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [token, reload]);
  async function createMember(event) {
    event.preventDefault();
    if (creating) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setCreating(true); setError(""); setCreatedMessage("");
    try {
      const response = await fetch(`${API}/admin/members`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), memberId: data.get("memberId"), password: data.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not create the member account.");
      form.reset(); setCreatedMessage(result.message); setReload(n => n + 1);
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  }
  async function updateStatus(id, accountStatus) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/admin/members/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ accountStatus }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update member.");
      setReload(n => n + 1);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="pn-users-page"><div className="pn-users-heading"><div><p className="pn-dash-kicker">Member accounts</p><h1>Manage members</h1><p>Create separate member credentials and manage account access.</p></div><button className="pn-users-button" disabled={loading || busy || creating} onClick={() => setReload(n => n + 1)}>Refresh</button></div>
    <details className="pn-member-create">
      <summary>Create member account</summary>
      <form onSubmit={createMember}>
        <fieldset disabled={creating}>
          <label className="pn-admin-field">Member name<input name="name" required maxLength={100} autoComplete="off" /></label>
          <label className="pn-admin-field">Member ID<input name="memberId" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,39}" placeholder="MEMBER-001" autoComplete="off" /></label>
          <label className="pn-admin-field">Member password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
          <label className="pn-admin-field">Email (optional)<input name="email" type="email" maxLength={254} autoComplete="off" /></label>
          <button className="pn-users-button" type="submit">{creating ? "Creating…" : "Create member"}</button>
        </fieldset>
      </form>
      <p>Give the assigned ID and password to the member. Active members can sign in directly.</p>
    </details>
    {createdMessage && <p className="pn-access-success" role="status">{createdMessage}</p>}
    {error && <p role="alert" className="pn-admin-error">{error}</p>}
    {loading ? <p role="status">Loading members…</p> : <div className="pn-users-table-wrap"><table className="pn-users-table"><thead><tr><th>Member</th><th>Member ID</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row._id}><td>{row.name}<br />{row.email}</td><td>{row.memberId}</td><td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td><td>{row.accountStatus}</td><td><button disabled={busy} onClick={() => updateStatus(row._id, row.accountStatus === "active" ? "suspended" : "active")}>{row.accountStatus === "active" ? "Suspend" : "Reactivate"}</button></td></tr>)}</tbody></table>{!rows.length && !error && <div role="status"><p>No member accounts yet.</p><p>Create a member account above to enable separate member login.</p></div>}</div>}
  </section>;
}
