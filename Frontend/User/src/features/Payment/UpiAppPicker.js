import React from "react";
import { UPI_APPS } from "./paymentUtils";

function UpiAppPicker({ selectedApp, onSelect }) {
  return (
    <div className="pn-pay-upi-apps" role="group" aria-label="UPI apps">
      {UPI_APPS.map((app) => (
        <button key={app.key} type="button" aria-pressed={selectedApp === app.key}
          className={`pn-pay-upi-app${selectedApp === app.key ? " active" : ""}`}
          onClick={() => onSelect(app.key)}>
          <span className="pn-pay-app-mark" style={{ "--upi-app-color": app.color }} aria-hidden="true">{app.mark}</span>
          <span>{app.label}</span>
          <span className="pn-pay-app-check" aria-hidden="true">{selectedApp === app.key ? "\u2713" : ""}</span>
        </button>
      ))}
    </div>
  );
}

export default UpiAppPicker;
