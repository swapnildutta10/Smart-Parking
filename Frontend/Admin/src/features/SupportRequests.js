import React from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const TOPICS = { booking: "Booking", parking: "Parking location", account: "Account", other: "Other" };

function RequestEditor({ request, onSave }) {
  const [status, setStatus] = React.useState(request.status);
  const [reply, setReply] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const attempt = React.useRef(null);
  const working = React.useRef(false);
  React.useEffect(() => { setStatus(request.status); }, [request.status]);
  async function submit(event) {
    event.preventDefault();
    if (working.current) return;
    const payload = { status, reply: reply.trim() };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, requestId: window.crypto?.randomUUID?.()
      || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16); return (c === "x" ? r : (r & 3) | 8).toString(16); }) };
    working.current = true; setBusy(true); setError(""); setSaved(false);
    try { await onSave(request.id, { ...payload, requestId: attempt.current.requestId }); setReply(""); attempt.current = null; setSaved(true); }
    catch (err) { setError(err.message || "Could not update support request."); }
    finally { working.current = false; setBusy(false); }
  }
  return <article className="pn-data-card">
    <div className="pn-data-card-head"><div><h2>{TOPICS[request.topic]} · {request.id}</h2><p>{request.customerName} · {request.customerEmail}</p><small>{new Date(request.createdAt).toLocaleString()}</small></div></div>
    <p style={{ whiteSpace: "pre-wrap" }}>{request.message}</p>
    {request.replies.map(item => <div key={item.id}><strong>Support · {new Date(item.createdAt).toLocaleString()}</strong><p style={{ whiteSpace: "pre-wrap" }}>{item.message}</p></div>)}
    <form className="pn-admin-spot-form" onSubmit={submit}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, display: "contents" }}>
        <label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label>
        <label>Reply<textarea rows={3} maxLength={4000} value={reply} onChange={event => setReply(event.target.value)} placeholder="Reply to this customer" /></label>
        <button className="pn-admin-submit" type="submit">{busy ? "Saving…" : "Save update"}</button>
      </fieldset>
    </form>
    {error && <p role="alert">{error}</p>}{saved && <p role="status">Support request updated.</p>}
  </article>;
}

export default function SupportRequests({ token }) {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);
  const [filter, setFilter] = React.useState("all");
  const revision = React.useRef(0);
  const saving = React.useRef(0);
  async function call(path = "", options = {}) {
    const response = await fetch(`${API}/admin/support${path}`, { ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not load support requests.");
    return result;
  }
  React.useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (saving.current) return;
      const version = revision.current;
      try {
        const response = await fetch(`${API}/admin/support`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load support requests.");
        if (!controller.signal.aborted && version === revision.current) { setRequests(result.requests); setError(""); }
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    const timer = window.setInterval(load, 15000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [token, reloadKey]);
  async function save(id, body) {
    saving.current += 1; revision.current += 1;
    try {
      const result = await call(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
      setRequests(current => current.map(request => request.id === id ? result.request : request));
    } finally { saving.current -= 1; }
  }
  const visible = requests.filter(request => filter === "all" || request.status === filter).sort((a, b) => b.updatedAt - a.updatedAt);
  return <section className="pn-admin-slots-page">
    <div className="pn-dash-topbar"><div><p className="pn-dash-kicker">Customer requests</p><h1>Help &amp; support</h1></div><button type="button" onClick={() => setReloadKey(key => key + 1)}>Refresh</button></div>
    <label>Status <select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label>
    {loading && <p role="status">Loading support requests…</p>}{error && <p role="alert">{error}</p>}
    {!loading && !error && !visible.length && <p>No support requests match this status.</p>}
    {visible.map(request => <RequestEditor key={request.id} request={request} onSave={save} />)}
  </section>;
}
