import React from "react";
import "./captcha.css";
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function CaptchaChallenge({ purpose, value, onChange, refreshKey, disabled }) {
  const [challenge, setChallenge] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  const publish = React.useRef(onChange);
  publish.current = onChange;
  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setChallenge(null); publish.current({ id: "", answer: "" });
    fetch(`${API}/auth/captcha?purpose=${encodeURIComponent(purpose)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load CAPTCHA.");
        if (!controller.signal.aborted) { setChallenge(result); publish.current({ id: result.id, answer: "" }); }
      })
      .catch(err => { if (!controller.signal.aborted) setError("Could not load the security image. Check the connection and try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [purpose, refreshKey, revision]);
  return <div className="pn-captcha">
    <div className="pn-captcha-heading"><strong>Security check</strong><span>Enter the 5 characters</span></div>
    <div className="pn-captcha-image-row">
      <div className="pn-captcha-picture">{challenge ? <img src={challenge.image} width={190} height={66} alt="Five-character CAPTCHA challenge" /> : <span role="status">{loading ? "Loading image…" : "Image unavailable"}</span>}</div>
      <button type="button" className="pn-captcha-refresh" aria-label="Generate a new CAPTCHA" disabled={loading || disabled} onClick={() => setRevision(current => current + 1)}>↻<span>New image</span></button>
    </div>
    <label>Characters in the image<input required type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={5} minLength={5}
      disabled={disabled || loading || !challenge} value={value.answer} onChange={event => onChange({ id: challenge.id, answer: event.target.value.toUpperCase() })} placeholder="Enter CAPTCHA" /></label>
    {error && <p role="alert">{error} <button type="button" disabled={disabled || loading} onClick={() => setRevision(current => current + 1)}>Try again</button></p>}
  </div>;
}
