import React from "react";
import { MEMBER_CREDENTIALS } from "./authCredentials";

const STRENGTH_LABELS = ["NOT LOOKING", "TOO SHORT", "GETTING THERE", "STRONG", "FORT KNOX"];

function UserLogin({ onGoToRegister, onLoginSuccess }) {
  const [submitted, setSubmitted] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [memberId, setMemberId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [showGoogleDemo, setShowGoogleDemo] = React.useState(false);
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

  function say(message) {
    setRobotMessage(message);
  }

  function finishLogin(callback) {
    setSubmitted(true);
    setRobotTurned(false);
    setRobotMood("success");
    say("Access granted. Welcome to ParkNova.");
    if (callback) window.setTimeout(callback, 420);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const isValid =
      memberId.trim() === MEMBER_CREDENTIALS.id &&
      password === MEMBER_CREDENTIALS.password;

    if (!isValid) {
      setError("That ID or password doesn't match a ParkNova account.");
      setShake(true);
      setRobotTurned(false);
      setRobotMood("watching");
      say("Access denied. Check those details and try again.");
      return;
    }
    setError("");

    if (onLoginSuccess) {
      finishLogin(onLoginSuccess);
      return;
    }
    finishLogin();
  }

  function handleGoogleDemoLogin() {
    setError("");
    setShowGoogleDemo(true);
    setRobotTurned(false);
    setRobotMood("happy");
    say("Google demo verification is ready.");
  }

  function completeGoogleDemoLogin() {
    setShowGoogleDemo(false);
    if (onLoginSuccess) {
      finishLogin(() => onLoginSuccess({ provider: "google-demo" }));
      return;
    }
    finishLogin();
  }

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
    <div className="pn-scope pn-login pn-robot-login">
      {showGoogleDemo && (
        <div className="pn-demo-verification" role="dialog" aria-modal="true">
          <div className="pn-demo-verification-card">
            <div className="pn-demo-check" aria-hidden="true">✓</div>
            <p className="pn-eyebrow">Google verification</p>
            <h2>Verification successful</h2>
            <p>Your demo Google account is ready. Continue to open ParkNova.</p>
            <button className="pn-button-primary" type="button" onClick={completeGoogleDemoLogin}>
              Continue <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}
      <div className="pn-login-brand">
        <span>P</span> ParkNova
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
          {!submitted ? (
            <>
              <p className="pn-eyebrow pn-anim-item" style={{ "--d": "0.05s" }}>
                Driver access
              </p>
              <h1 className="pn-anim-item" style={{ "--d": "0.1s" }}>
                Welcome, human. What brings you here today?
              </h1>
              <p className="pn-sub pn-anim-item" style={{ "--d": "0.15s" }}>
                Log in to manage your reservations and find your next spot.
              </p>

              <form
                className={`pn-form pn-anim-item${shake ? " pn-shake" : ""}`}
                style={{ "--d": "0.2s" }}
                onSubmit={handleSubmit}
                onAnimationEnd={() => setShake(false)}
              >
                <label className="pn-field">
                  <span>Email or member ID</span>
                  <input
                    required
                    type="text"
                    placeholder="olivia@example.com"
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

                {error && <p className="pn-form-error pn-anim-error">{error}</p>}

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
                  Log in <span aria-hidden="true">→</span>
                </button>
              </form>

              <div className="pn-divider pn-anim-item" style={{ "--d": "0.25s" }}>
                <span>or</span>
              </div>

              <button
                className="pn-button-google pn-anim-item"
                style={{ "--d": "0.3s" }}
                type="button"
                onClick={handleGoogleDemoLogin}
              >
                <span className="pn-google-mark">G</span> Continue with Google
              </button>

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
            <div className="pn-success pn-anim-success">
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
                Welcome back.
              </h2>
              <p className="pn-anim-item" style={{ "--d": "0.22s" }}>
                Let&apos;s find you a better place to park today.
              </p>
              <button
                className="pn-button-primary pn-anim-item"
                style={{ "--d": "0.3s" }}
                type="button"
                onClick={() => setSubmitted(false)}
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
