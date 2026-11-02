import React from "react";
import "./captcha.css";
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function CaptchaChallenge({ purpose, onChange, refreshKey, disabled }) {
  const [challenge, setChallenge] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [selected, setSelected] = React.useState([]);
  const [revision, setRevision] = React.useState(0);
  const publish = React.useRef(onChange);
  publish.current = onChange;
  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setChallenge(null); setSelected([]); publish.current({ id: "", answer: "" });
    fetch(`${API}/auth/captcha?purpose=${encodeURIComponent(purpose)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load CAPTCHA.");
        if (!controller.signal.aborted) { setChallenge(result); publish.current({ id: result.id, answer: "" }); }
      })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load the security image. Check the connection and try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [purpose, refreshKey, revision]);

  function toggleTile(index) {
    setSelected(current => {
      const next = current.includes(index) ? current.filter(tile => tile !== index) : [...current, index].sort((a, b) => a - b);
      publish.current({ id: challenge.id, answer: next.join(",") });
      return next;
    });
  }

  const gridSize = challenge?.gridSize || 4;
  return <section className="pn-captcha" aria-label="Image security check">
    <div className="pn-captcha-heading"><strong>Security check</strong><span>{challenge?.prompt || "Select all squares with traffic lights"}</span></div>
    <div className="pn-captcha-image-row">
      <div className="pn-captcha-picture pn-captcha-select-picture">
        {challenge ? <>
          <img src={challenge.image} alt="Street scene containing selectable squares" />
          <div className="pn-captcha-grid" role="group" aria-label="Select every square containing a traffic light" style={{ "--captcha-grid-size": gridSize }}>
            {Array.from({ length: gridSize * gridSize }, (_, index) => <button key={index} type="button" className={selected.includes(index) ? "is-selected" : ""}
              aria-label={`Square ${index + 1}`} aria-pressed={selected.includes(index)} disabled={disabled || loading} onClick={() => toggleTile(index)} />)}
          </div>
        </> : <span role="status">{loading ? "Loading image…" : "Image unavailable"}</span>}
      </div>
      <button type="button" className="pn-captcha-refresh" aria-label="Generate a new CAPTCHA" disabled={loading || disabled} onClick={() => setRevision(current => current + 1)}>↻<span>New image</span></button>
    </div>
    <div className="pn-captcha-actions"><span aria-live="polite">{selected.length ? `${selected.length} square${selected.length === 1 ? "" : "s"} selected` : "Select every matching square"}</span>
      <button type="button" disabled={!selected.length || disabled} onClick={() => { setSelected([]); publish.current({ id: challenge?.id || "", answer: "" }); }}>Clear selection</button>
    </div>
    {error && <p role="alert">{error} <button type="button" disabled={disabled || loading} onClick={() => setRevision(current => current + 1)}>Try again</button></p>}
  </section>;
}
