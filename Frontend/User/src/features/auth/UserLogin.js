import BrandLogo from "../shared/BrandLogo";
import React from "react";
import { authRequest } from "./authApi";
import CaptchaChallenge from "./CaptchaChallenge";
const STRENGTH_LABELS = ["NOT LOOKING", "TOO SHORT", "GETTING THERE", "STRONG", "FORT KNOX"];

function UserLogin({ onGoToRegister, onLoginSuccess }) {
  const [previewAccount, setPreviewAccount] = React.useState({ name: "Alex Morgan", email: "alex.morgan@example.com", initials: "AM" });
  const [googleStatus, setGoogleStatus] = React.useState("idle");
  const [submitted, setSubmitted] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [memberId, setMemberId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [captcha, setCaptcha] = React.useState({ id: "", answer: "" });
  const [captchaRefresh, setCaptchaRefresh] = React.useState(0);
  const [shake, setShake] = React.useState(false);
  const [robotMood, setRobotMood] = React.useState("idle");
  const [robotMessage, setRobotMessage] = React.useState("Hi. I'm Volt. I guard this form.");
  const [robotTurned, setRobotTurned] = React.useState(false);
  const [eyeOffset, setEyeOffset] = React.useState({ x: 0, y: 0 });

  let passwordStrength = 0;
  if (password.length >= 8) passwordStrength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) passwordStrength += 1;
  if (/\d/.test(password)) passwordStrength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) passwordStrength += 1;
  if (password.length > 0 && passwordStrength === 0) passwordStrength = 1;

  const say = React.useCallback((message) => {
    setRobotMessage(message);
  }, []);

  const finishLogin = React.useCallback((callback, delay = 420) => {
    setSubmitted(true);
    setRobotTurned(false);
    setRobotMood("success");
    say("Access granted. Welcome to ParkNova.");
    if (callback) window.setTimeout(callback, delay);
  }, [say]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await authRequest("login", { email: memberId.trim(), password, captchaId: captcha.id, captchaAnswer: captcha.answer });
      localStorage.setItem("parknova-auth-token", result.token);
      setError("");
      finishLogin(() => onLoginSuccess?.(result.user));
    } catch (loginError) {
      setCaptcha({ id: "", answer: "" });
      setCaptchaRefresh(value => value + 1);
      setError(loginError.message || "Could not reach the server. Check that the backend is running.");
      setShake(true);
      setRobotTurned(false);
      setRobotMood("watching");
      say("Access denied. Check those details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGooglePreview() {
    setError("");
    setGoogleStatus("choosing");
    setRobotTurned(false);
    setRobotMood("watching");
    say("Choose a sample account to preview your dashboard.");
  }

  React.useEffect(() => {
    if (googleStatus !== "verifying" && googleStatus !== "verified") return undefined;
    const timer = window.setTimeout(() => {
      if (googleStatus === "verifying") {
        setGoogleStatus("verified");
        setSubmitted(true);
        setRobotMood("success");
        say("All set. Opening your dashboard preview.");
      } else {
        onLoginSuccess?.({ ...previewAccount, provider: "preview", isPreview: true });
      }
    }, googleStatus === "verifying" ? 1000 : 1400);
    return () => window.clearTimeout(timer);
  }, [googleStatus, onLoginSuccess, previewAccount, say]);

  function handleRobotPointerMove(event) {
    if (robotTurned) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / bounds.width;
    const y = (event.clientY - bounds.top - bounds.height / 2) / bounds.height;
    setEyeOffset({ x: Math.max(-1, Math.min(1, x)) * 7, y: Math.max(-1, Math.min(1, y)) * 5 });
  }

  function handlePasswordBlur(event) {
    if (event.relatedTarget?.classList.contains("pn-robot-password-toggle")) return;
    setRobotTurned(false);
    if (!error && !submitted) setRobotMood("idle");
  }

  function handlePasswordToggle() {
    setShowPassword((visible) => !visible);
    say(showPassword
      ? "Secret hidden. My sensors are clear."
      : "Revealing it? Good thing I'm facing away.");
  }

  return (
    <div className="pn-scope pn-login pn-robot-login pn-modern-login">
      <div className="pn-login-brand pn-brand-link">
        <BrandLogo />
      </div>

      <aside className="pn-login-visual pn-anim-visual" aria-label="Volt, the ParkNova login robot">
        <div
          className="pn-robot-scene"
          onPointerMove={handleRobotPointerMove}
          onPointerLeave={() => setEyeOffset({ x: 0, y: 0 })}
        >
          <div className={`pn-robot pn-robot--${robotMood}${robotTurned ? " is-turned" : ""}`}>
            <div className="pn-robot-bubble" key={robotMessage} role="status" aria-live="polite">
              {robotMessage}
            </div>

            <div className="pn-robot-antenna" aria-hidden="true">
              <span className="pn-robot-antenna-rod" />
              <span className="pn-robot-antenna-tip" />
            </div>

            <div
              className="pn-robot-head3d"
              style={{
                "--robot-tilt-x": `${eyeOffset.x * -1.2}deg`,
                "--robot-tilt-y": `${eyeOffset.y}deg`,
              }}
              aria-hidden="true"
            >
              <div className="pn-robot-head">
                <span className="pn-robot-ear pn-robot-ear--left" />
                <span className="pn-robot-ear pn-robot-ear--right" />
                <div className="pn-robot-face pn-robot-face--front">
                  <div className="pn-robot-visor">
                    <div className="pn-robot-eyes" style={{ "--eye-x": `${eyeOffset.x}px`, "--eye-y": `${eyeOffset.y}px` }}>
                      <span />
                      <span />
                    </div>
                    <span className="pn-robot-cheek pn-robot-cheek--left" />
                    <span className="pn-robot-cheek pn-robot-cheek--right" />
                    <span className="pn-robot-mouth" />
                  </div>
                </div>
                <div className="pn-robot-face pn-robot-face--back">
                  <div className="pn-robot-back-panel">
                    <span className="pn-robot-panel-lights"><i /><i /><i /></span>
                    <div className="pn-robot-meter" data-level={passwordStrength}>
                      {[0, 1, 2, 3].map((level) => (
                        <i className={passwordStrength > level ? "is-on" : ""} key={level} />
                      ))}
                    </div>
                    <span className="pn-robot-panel-label">
                      {STRENGTH_LABELS[password ? passwordStrength : 0]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section className="pn-login-form-side">
        <div className="pn-login-form-wrap pn-anim-form-wrap">
          {googleStatus === "choosing" || googleStatus === "verifying" ? (
            <div className="pn-account-preview">
              <div className="pn-account-preview-top"><BrandLogo /><span className="pn-account-preview-tag">LOCAL PREVIEW</span></div>
              <h1>{googleStatus === "verifying" ? "Getting things ready" : "Choose an account"}</h1>
              <p>{googleStatus === "verifying" ? "Preparing your parking dashboard…" : "Continue to ParkNova with a sample profile."}</p>
              {googleStatus === "choosing" ? (
                <div className="pn-account-options">
                  {[{ name: "Alex Morgan", email: "alex.morgan@example.com", initials: "AM" }, { name: "Sam Taylor", email: "sam.taylor@example.com", initials: "ST" }].map((account) => (
                    <button type="button" key={account.email} className="pn-account-option" onClick={() => { setPreviewAccount(account); setGoogleStatus("verifying"); }}>
                      <span className="pn-account-avatar" aria-hidden="true">{account.initials}</span>
                      <span className="pn-account-copy"><strong>{account.name}</strong><small>{account.email}</small></span>
                      <span aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pn-account-loading" role="status">
                  <span className="pn-account-loader" aria-hidden="true" />
                  <strong>{previewAccount.name}</strong><small>{previewAccount.email}</small>
                  <span>Preparing preview…</span>
                </div>
              )}
              <p className="pn-account-disclosure">Sample accounts only. This preview does not connect to Google or request your password.</p>
              <button type="button" className="pn-account-back" onClick={() => setGoogleStatus("idle")}>Back to login</button>
            </div>
          ) : !submitted ? (
            <>
              <p className="pn-eyebrow pn-anim-item" style={{ "--d": "0.05s" }}>
                YOUR NEXT SPOT STARTS HERE
              </p>
              <h1 className="pn-anim-item" style={{ "--d": "0.1s" }}>
                Welcome back.
              </h1>
              <p className="pn-sub pn-anim-item" style={{ "--d": "0.15s" }}>
                Less searching. More arriving. Sign in to your parking space.
              </p>

              <form
                className={`pn-form pn-anim-item${shake ? " pn-shake" : ""}`}
                style={{ "--d": "0.2s" }}
                onSubmit={handleSubmit}
                onAnimationEnd={() => setShake(false)}
              >
                <label className="pn-field">
                  <span>Email address</span>
                  <input
                    required
                    placeholder="you@example.com"
                    type="email"
                    value={memberId}
                    autoComplete="username"
                    aria-invalid={Boolean(error)}
                    onFocus={() => {
                      setRobotTurned(false);
                      setRobotMood("watching");
                      say("Member ID noted. I'm paying attention.");
                    }}
                    onChange={(event) => setMemberId(event.target.value)}
                  />
                </label>
                <label className="pn-field">
                  <span>Password</span>
                  <span className="pn-robot-password-field">
                    <input
                      required
                      minLength="8"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      autoComplete="current-password"
                      aria-invalid={Boolean(error)}
                      onFocus={() => {
                        setRobotMood("shy");
                        setRobotTurned(true);
                        setEyeOffset({ x: 0, y: 0 });
                        say("Password detected. My eyes are off the screen.");
                      }}
                      onBlur={handlePasswordBlur}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (event.target.value) {
                          setRobotMood("shy");
                          setRobotTurned(true);
                        }
                      }}
                    />
                    <button
                      className="pn-robot-password-toggle"
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      onClick={handlePasswordToggle}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        {showPassword ? (
                          <>
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                            <path d="M9.9 5.2A11.5 11.5 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.3 3.1M6.2 6.2C3.9 7.6 2.7 9.7 2.5 12c.3.9 1.1 2 2.2 3.1A11 11 0 0012 19c1 0 2-.2 2.9-.5" />
                          </>
                        ) : (
                          <>
                            <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </>
                        )}
                      </svg>
                    </button>
                  </span>
                </label>

                <CaptchaChallenge purpose="user" value={captcha} onChange={setCaptcha} refreshKey={captchaRefresh} disabled={isSubmitting} />
                {error && <p className="pn-form-error pn-anim-error" role="alert">{error}</p>}

                <div className="pn-form-row">
                  <label className="pn-checkbox">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={() => setRemember((value) => !value)}
                    />
                    Remember me
                  </label>
                  <a className="pn-link" href="#forgot">
                    Forgot password?
                  </a>
                </div>

                <button
                  className="pn-button-primary"
                  type="submit"
                  disabled={isSubmitting || !captcha.id || captcha.answer.trim().length !== 5}
                  onPointerDown={() => {
                    setRobotMood("pressed");
                    say("Beep. Do that again.");
                  }}
                  onPointerUp={() => {
                    if (!error) setRobotMood("excited");
                  }}
                  onPointerEnter={() => {
                    setRobotTurned(false);
                    if (!error) setRobotMood("excited");
                    say("Ooh. Do it. Press it.");
                  }}
                  onPointerLeave={() => {
                    if (!error && !submitted) setRobotMood("idle");
                  }}
                  onFocus={() => {
                    setRobotTurned(false);
                    if (!error) setRobotMood("excited");
                  }}
                >
                  {isSubmitting ? "Logging in…" : "Log in"} <span aria-hidden="true">→</span>
                </button>
              </form>

              <div className="pn-divider pn-anim-item" style={{ "--d": "0.25s" }}>
                <span>or</span>
              </div>

              <div className="pn-google-login-wrap pn-anim-item" style={{ "--d": "0.3s" }}>
                <button type="button" className="pn-google-preview-button" onClick={handleGooglePreview}>
                  <svg className="pn-google-preview-logo" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
                    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z" />
                    <path fill="#FBBC05" d="M6.3 13.7a6 6 0 0 1 0-3.4V7.7H3a10 10 0 0 0 0 8.6l3.3-2.6Z" />
                    <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.7l3.3 2.6c.8-2.4 3.1-4.2 5.7-4.2Z" />
                  </svg>
                  Continue with Google
                </button>
              </div>

              <p className="pn-foot-link pn-anim-item" style={{ "--d": "0.35s" }}>
                Don&apos;t have an account?{" "}
                <a
                  href="#register"
                  onClick={(event) => {
                    if (onGoToRegister) {
                      event.preventDefault();
                      onGoToRegister();
                    }
                  }}
                >
                  Sign up
                </a>
              </p>
            </>
          ) : (
            <div className={`pn-success pn-anim-success${googleStatus === "verified" ? " pn-preview-success" : ""}`}>
              {googleStatus === "verified" && (
                <p className="pn-google-verification is-verified" role="status">
                  <span aria-hidden="true">✓</span> Google account verified
                </p>
              )}
              <svg
                className="pn-success-check"
                viewBox="0 0 64 64"
                width="56"
                height="56"
                aria-hidden="true"
              >
                <circle
                  className="pn-success-check-circle"
                  cx="32"
                  cy="32"
                  r="29"
                  fill="none"
                  strokeWidth="4"
                />
                <path
                  className="pn-success-check-mark"
                  d="M19 33.5 L28 42.5 L46 22.5"
                  fill="none"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2 className="pn-anim-item" style={{ "--d": "0.15s" }}>
                {googleStatus === "verified" ? "Verified" : "Welcome back."}
              </h2>
              <p className="pn-anim-item" style={{ "--d": "0.22s" }}>
                {googleStatus === "verified" ? "Your dashboard is getting ready." : "Let's find you a better place to park today."}
              </p>
              {googleStatus === "verified" && (
                <div className="pn-preview-transfer">
                  <div className="pn-preview-account"><span aria-hidden="true">{previewAccount.initials}</span><div><strong>{previewAccount.name}</strong><small>Dashboard preview · No real Google verification</small></div></div>
                  <div className="pn-preview-progress" aria-hidden="true"><span /></div>
                  <p role="status">Taking you to your dashboard…</p>
                </div>
              )}
              <button
                className="pn-button-primary pn-anim-item"
                style={{ "--d": "0.3s" }}
                type="button"
                onClick={() => { setSubmitted(false); setGoogleStatus("idle"); }}
              >
                Back to login <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default UserLogin;
