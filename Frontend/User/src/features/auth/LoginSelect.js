import React from "react";


function LoginSelect({ onSelectUser, onSelectAdmin }) {
  return (
    <main className="module-page">
      <div className="module-header">
        <div className="brand">ParkNova</div>
      </div>

      <div className="module-content">
        <div className="module-intro">
          <p className="eyebrow">Choose how you&apos;d like to sign in</p>
          <h1>Welcome back to ParkNova.</h1>
          <p>Select the portal that matches your account to continue.</p>
        </div>

        <div className="module-grid">
          <div className="module-card">
            <div className="module-card-top">
              <span className="module-label">Driver</span>
              <div className="module-icon">🚗</div>
            </div>
            <h2>User login</h2>
            <p>Book, manage, and track your parking reservations.</p>
            <div className="module-options">
              <button
                className="module-option"
                type="button"
                onClick={onSelectUser}
              >
                Continue as a driver <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="module-card admin-module-card">
            <div className="module-card-top">
              <span className="module-label">Administrator</span>
              <div className="module-icon">⚙</div>
            </div>
            <h2>Admin login</h2>
            <p>Manage parking lots, pricing, and driver accounts.</p>
            <div className="module-options">
              <button
                className="module-option"
                type="button"
                onClick={onSelectAdmin}
              >
                Continue as admin <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default LoginSelect;
