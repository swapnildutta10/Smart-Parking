import React from "react";
import { parkingRequest } from "../parkingSpot/parkingApi";

const STATUS_LABELS = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
const TOPIC_LABELS = { booking: "A booking", parking: "A parking location", account: "My account", other: "Something else" };

function HelpSupport({ user }) {
  const [requestSubmitted, setRequestSubmitted] = React.useState(null);
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loadError, setLoadError] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);
  const working = React.useRef(false);
  const revision = React.useRef(0);
  const attempt = React.useRef(null);
  React.useEffect(() => {
    if (!user?.id) { setLoading(false); return undefined; }
    const controller = new AbortController();
    async function load() {
      if (working.current) return;
      const version = revision.current;
      try {
        const result = await parkingRequest("/support", { signal: controller.signal });
        if (!controller.signal.aborted && revision.current === version) { setRequests(result.requests); setLoadError(""); }
      } catch (err) { if (!controller.signal.aborted) setLoadError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [user?.id, reloadKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (working.current || !user?.id) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = { topic: data.get("topic"), message: String(data.get("message") || "").trim() };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, requestId: window.crypto?.randomUUID?.()
      || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16); return (c === "x" ? r : (r & 3) | 8).toString(16); }) };
    working.current = true; revision.current += 1;
    setBusy(true); setError(""); setRequestSubmitted(null);
    try {
      const result = await parkingRequest("/support", { method: "POST", body: { ...payload, requestId: attempt.current.requestId } });
      setRequests(current => [result.request, ...current.filter(item => item.id !== result.request.id)]);
      setRequestSubmitted(result.request.id); attempt.current = null; form.reset();
    } catch (err) { setError(err.message || "Could not send your support request. Please try again."); }
    finally { working.current = false; setBusy(false); }
  }

  return (
    <section className="pn-user-support-grid">
      <article className="pn-user-panel pn-user-feature-page">
        <div className="pn-user-panel-heading">
          <div>
            <h2>Help &amp; support</h2>
            <p>Find answers or contact the ParkNova team</p>
          </div>
        </div>
        <div className="pn-user-support-contact">
          <span className="pn-user-stat-icon is-green" aria-hidden="true">@</span>
          <div><strong>Email support</strong><a href="mailto:support@parknova.com">support@parknova.com</a></div>
        </div>
        <div className="pn-user-support-faq">
          <details>
            <summary>How do I cancel a reservation?</summary>
            <p>Open My bookings, expand an upcoming reservation, and choose Cancel booking.</p>
          </details>
          <details>
            <summary>Where can I find my booking reference?</summary>
            <p>Open My bookings and select a reservation to see its reference and details.</p>
          </details>
          <details>
            <summary>Can I change my arrival time?</summary>
            <p>For now, cancel the reservation and create a new booking with the correct time.</p>
          </details>
        </div>
      </article>

      <article className="pn-user-panel pn-user-feature-page">
        <div className="pn-user-panel-heading">
          <div>
            <h2>Send a support request</h2>
            <p>Describe what you need help with</p>
          </div>
        </div>
        {requestSubmitted && (
          <p className="pn-user-support-success" role="status">
            Your request has been sent. Reference: {requestSubmitted}. Replies will appear below.
          </p>
        )}
        <form className="pn-form-card pn-user-support-form" onSubmit={handleSubmit}>
          <fieldset disabled={busy || !user?.id} style={{ border: 0, padding: 0, display: "contents" }}>
          <label>
            Topic
            <select name="topic" defaultValue="booking">
              <option value="booking">A booking</option>
              <option value="parking">A parking location</option>
              <option value="account">My account</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label>
            Message
            <textarea name="message" rows="4" maxLength={4000} placeholder="How can we help?" required />
          </label>
          <button className="pn-btn-primary" type="submit">{busy ? "Sending…" : "Send request"} <span aria-hidden="true">→</span></button>
          </fieldset>
        </form>
        {error && <p role="alert">{error}</p>}
        {!user?.id && <p>Sign in to send and track support requests.</p>}
      </article>
      <article className="pn-user-panel pn-user-feature-page">
        <div className="pn-user-panel-heading"><h2>Your support requests</h2><button type="button" disabled={busy || !user?.id} onClick={() => setReloadKey(key => key + 1)}>Refresh</button></div>
        {loading && <p role="status">Loading support requests…</p>}
        {loadError && <p role="alert">{loadError}</p>}
        {!loading && !loadError && !requests.length && <p>No support requests yet.</p>}
        {[...requests].sort((a, b) => b.updatedAt - a.updatedAt).map(request => <article className="pn-form-card" key={request.id}>
          <strong>{TOPIC_LABELS[request.topic]} · {STATUS_LABELS[request.status]}</strong>
          <p>{request.id} · {new Date(request.createdAt).toLocaleString()}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{request.message}</p>
          {request.replies.map(reply => <div key={reply.id}><strong>Support reply · {new Date(reply.createdAt).toLocaleString()}</strong><p style={{ whiteSpace: "pre-wrap" }}>{reply.message}</p></div>)}
        </article>)}
      </article>
    </section>
  );
}

export default HelpSupport;
