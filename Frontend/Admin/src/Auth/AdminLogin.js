import React from "react";
import { ADMIN_CREDENTIALS } from "./authCredentials";

const USER_SITE_URL =
  process.env.REACT_APP_USER_SITE_URL || "http://localhost:3000";

function AdminLogin({ onLoginSuccess }) {
  const [adminId, setAdminId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const isValid =
      adminId.trim() === ADMIN_CREDENTIALS.id &&
      password === ADMIN_CREDENTIALS.password;

    if (!isValid) {
      setError("That admin ID or password isn't recognized.");
      return;
    }
    setError("");
    setSubmitted(true);

    if (onLoginSuccess) {
      onLoginSuccess();
    }
  }

  return (
    <div className="pn-scope pn-admin-login">
      <div className="pn-admin-shell">
        <aside className="pn-admin-intro">
          <div className="pn-admin-brand">
            <span className="pn-admin-brand-mark" aria-hidden="true">P</span>
            <span>ParkNova</span>
          </div>
          <img
            className="pn-admin-lot-photo"
            src="/Images/parking-garage.jpg"
            alt=""
          />
        </aside>

        <main className="pn-admin-main">
          <div className="pn-admin-form-wrap">
            {!submitted ? (
              <>
                <p className="pn-admin-overline">ADMINISTRATOR SIGN IN</p>
                <h2>Welcome back</h2>
                <p className="pn-admin-form-intro">Sign in to continue to your workspace.</p>

                <form className="pn-admin-form" onSubmit={handleSubmit}>
                  <label className="pn-admin-field">
                    Admin ID
                    <input
                      required
                      autoComplete="username"
                      type="text"
                      placeholder="Enter your admin ID"
                      value={adminId}
                      onChange={(event) => setAdminId(event.target.value)}
                      aria-invalid={Boolean(error)}
                    />
                  </label>
                  <label className="pn-admin-field">
                    Password
                    <span className="pn-admin-password-wrap">
                      <input
                        required
                        minLength="8"
                        autoComplete="current-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        aria-invalid={Boolean(error)}
                      />
                      <button
                        className="pn-admin-password-toggle"
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
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

                  {error && <p className="pn-admin-error" role="alert">{error}</p>}

                  <button className="pn-admin-submit" type="submit">
                    Sign in to dashboard <span aria-hidden="true">→</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="pn-success">
                <div className="pn-success-icon">✓</div>
                <h2>Welcome, admin.</h2>
                <p>Redirecting you to the ParkNova dashboard.</p>
              </div>
            )}

            <div className="pn-status-strip">
              <span className="pn-status-dot" aria-hidden="true" />
              Authorized administrator access
            </div>

            <a
              className="pn-admin-back"
              href={USER_SITE_URL}
              onClick={(event) => {
                event.preventDefault();
                window.location.href = USER_SITE_URL;
              }}
            >
              ← Visit the ParkNova user site
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLogin;
