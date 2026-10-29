import React from "react";
import { parkingRequest } from "../parkingSpot/parkingApi";

export default function UserProfile({ user, edit, onUpdateUser, onEdit, onView, onLogin }) {
  const [profile, setProfile] = React.useState(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  const active = React.useRef(true);
  const working = React.useRef(false);
  const publish = React.useRef(onUpdateUser);
  publish.current = onUpdateUser;
  React.useEffect(() => {
    const controller = new AbortController(); active.current = true;
    if (!user?.id) { setLoading(false); return () => { active.current = false; }; }
    setLoading(true); setError("");
    parkingRequest("/users/profile", { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        setProfile(result.user); setName(result.user.name); setEmail(result.user.email); setPhone(result.user.phone || "");
        publish.current?.(result.user);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { active.current = false; controller.abort(); };
  }, [user?.id, revision]);

  async function save(event) {
    event.preventDefault();
    if (working.current || !profile) return;
    working.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const result = await parkingRequest("/users/profile", { method: "PATCH", body: { name, email, phone } });
      if (active.current) {
        setProfile(result.user); setName(result.user.name); setEmail(result.user.email); setPhone(result.user.phone || "");
        publish.current?.(result.user); setMessage("Your profile has been saved.");
      }
    } catch (err) { if (active.current) setError(err.message || "Could not save your profile."); }
    finally { working.current = false; if (active.current) setSaving(false); }
  }
  if (!user?.id) return <section className="pn-panel pn-user-inline-panel"><p>Sign in to view and update your profile.</p><button type="button" className="pn-btn-primary" onClick={onLogin}>Sign in</button></section>;
  return <section className="pn-panel pn-user-inline-panel">
    {loading && <p role="status">Loading your profile…</p>}
    {error && <p role="alert">{error} {!profile && <button type="button" onClick={() => setRevision(value => value + 1)}>Try again</button>}</p>}
    {message && <p role="status">{message}</p>}
    {profile && !edit && <>
      <div className="pn-profile-card"><strong>{profile.name}</strong><span>{profile.email}</span><span>Phone: {profile.phone || "Not added"}</span>
        <span>Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
      </div>
      <button type="button" className="pn-btn-primary" onClick={onEdit}>Update profile →</button>
      <button type="button" className="pn-user-outline-action" onClick={() => setRevision(value => value + 1)}>Refresh profile</button>
    </>}
    {profile && edit && <form className="pn-form-card" onSubmit={save}>
      <fieldset disabled={loading || saving} style={{ border: 0, padding: 0, display: "contents" }}>
        <label>Full name<input required autoComplete="name" maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Email address<input required autoComplete="email" type="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Phone number<input autoComplete="tel" type="tel" maxLength={32} value={phone} placeholder="e.g. +91 98765 43210" onChange={event => setPhone(event.target.value)} /></label>
        <small>Phone number is optional. Include your country code when needed.</small>
        <button className="pn-btn-primary" type="submit">{saving ? "Saving…" : "Save changes"} ✓</button>
        <button className="pn-user-outline-action" type="button" onClick={onView}>View profile</button>
      </fieldset>
    </form>}
  </section>;
}
