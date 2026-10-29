import React from "react";
import BrandLogo from "../shared/BrandLogo";

export default function LoginShell({ member = false, onSwitch, children }) {
  const [turning, setTurning] = React.useState(false);
  const turnTimer = React.useRef(null);
  const switching = React.useRef(false);

  React.useEffect(() => () => window.clearTimeout(turnTimer.current), []);

  function turnPage() {
    if (switching.current || !onSwitch) return;
    switching.current = true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onSwitch();
      return;
    }
    setTurning(true);
    turnTimer.current = window.setTimeout(onSwitch, 320);
  }

  return <div className="pn-scope pn-admin-login">
    <div className="pn-admin-shell">
      <aside className="pn-admin-intro">
        <div className="pn-admin-brand pn-brand-link"><BrandLogo /></div>
        <img className="pn-admin-lot-photo" src="/Images/parking-garage.jpg" alt="" />
      </aside>
      <main className="pn-admin-main">
        <div
          className={`pn-admin-form-wrap pn-login-page ${member ? "pn-login-page-member" : "pn-login-page-admin"}${turning ? " is-turning" : ""}`}
          aria-busy={turning}
          inert={turning ? true : undefined}
        >
          <div className="pn-access-switch">
            <button type="button" disabled={turning} onClick={turnPage} aria-label={`Switch to ${member ? "administrator" : "member"} login`}>
              {member ? "Member" : "Administrator"}
            </button>
          </div>
          {children}
        </div>
      </main>
    </div>
  </div>;
}
