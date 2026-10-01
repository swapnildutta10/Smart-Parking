import React from "react";
import { MEMBER_CREDENTIALS } from "../../shared/authCredentials";

const LIVE_DOT_INDICES = [2, 7, 9, 14, 19, 23];

function UserLogin({ onGoToRegister, onLoginSuccess }) {
  const [submitted, setSubmitted] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [memberId, setMemberId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [showGoogleDemo, setShowGoogleDemo] = React.useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const isValid =
      memberId.trim() === MEMBER_CREDENTIALS.id &&
      password === MEMBER_CREDENTIALS.password;

    if (!isValid) {
      setError("That ID or password doesn't match a ParkNova account.");
      return;
    }
    setError("");

    if (onLoginSuccess) {
      onLoginSuccess();
      return;
    }
    setSubmitted(true);
  }

  function handleGoogleDemoLogin() {
    setError("");
    setShowGoogleDemo(true);
  }

  function completeGoogleDemoLogin() {
    setShowGoogleDemo(false);
    if (onLoginSuccess) {
      onLoginSuccess({ provider: "google-demo" });
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="pn-scope pn-login">
      {showGoogleDemo && (
        <div className="pn-demo-verification" role="dialog" aria-modal="true">
          <div className="pn-demo-verification-card">
            <div className="pn-demo-check" aria-hidden="true">✓</div>
            <p className="pn-eyebrow">Google demo</p>
            <h2>Verification successful</h2>
            <p>Your demo Google account is ready. Continue to open ParkNova.</p>
            <button className="pn-button-primary" type="button" onClick={completeGoogleDemoLogin}>
              Continue <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}
      <aside className="pn-login-visual">
        <div className="pn-login-brand">
          <span>P</span> ParkNova
        </div>

        <div className="pn-login-map" aria-hidden="true">
          <div className="pn-map-grid">
            {Array.from({ length: 24 }).map((_, index) => (
              <span
                key={index}
                className={`pn-map-dot${LIVE_DOT_INDICES.includes(index) ? " is-live" : ""}`}
                style={{ animationDelay: `${(index % 6) * 0.3}s` }}
              />
            ))}
          </div>
          <div className="pn-map-pin">
            <span>✓</span> Spot A-24 reserved
          </div>
        </div>

        <div className="pn-login-stats">
          <div>
            <strong>12,480</strong>
            <span>Drivers onboard</span>
          </div>
          <div>
            <strong>18</strong>
            <span>Live locations</span>
          </div>
          <div>
            <strong>4.9</strong>
            <span>Average rating</span>
          </div>
        </div>
      </aside>

      <section className="pn-login-form-side">
        <div className="pn-login-form-wrap">
          {!submitted ? (
            <>
              <p className="pn-eyebrow">Driver access</p>
              <h1>Welcome back</h1>
              <p className="pn-sub">
                Log in to manage your reservations and find your next spot.
              </p>

              <form className="pn-form" onSubmit={handleSubmit}>
                <label className="pn-field">
                  <span>Email or member ID</span>
                  <input
                    required
                    type="text"
                    placeholder="olivia@example.com"
                    value={memberId}
                    onChange={(event) => setMemberId(event.target.value)}
                  />
                </label>
                <label className="pn-field">
                  <span>Password</span>
                  <input
                    required
                    minLength="8"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>

                {error && <p className="pn-form-error">{error}</p>}

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

                <button className="pn-button-primary" type="submit">
                  Log in <span aria-hidden="true">→</span>
                </button>
              </form>

              <div className="pn-divider">
                <span>or</span>
              </div>

              <button
                className="pn-button-google"
                type="button"
                onClick={handleGoogleDemoLogin}
              >
                <span className="pn-google-mark">G</span> Continue with Google
              </button>

              <p className="pn-foot-link">
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
            <div className="pn-success">
              <div className="pn-success-icon">✓</div>
              <h2>Welcome back.</h2>
              <p>Let&apos;s find you a better place to park today.</p>
              <button
                className="pn-button-primary"
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
