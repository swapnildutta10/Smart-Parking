import React from "react";
import useDialogFocus from "../shared/useDialogFocus";

function ParkingSpotDetails({ spot, onClose, onReserve }) {
  const dialogRef = useDialogFocus(Boolean(spot), onClose);
  if (!spot) {
    return null;
  }

  return (
    <div className="pn-spot-modal" role="dialog" aria-modal="true" aria-labelledby="spot-detail-title">
      <div ref={dialogRef} className="pn-spot-modal-card">
        <button className="pn-spot-modal-close" type="button" onClick={onClose} aria-label="Close spot details">
          ×
        </button>
        <p className="pn-kicker">Parking spot details</p>
        <span className="pn-slot-id">{spot.id}</span>
        <h2 id="spot-detail-title">{spot.location}</h2>
        <div className={`pn-availability-banner${spot.available === 0 ? " is-full" : ""}`}>
          <span className="pn-availability-dot" aria-hidden="true" />
          <strong>{spot.available > 0 ? "Available now" : "Fully booked"}</strong>
          <span>{spot.available > 0 ? `${spot.available} spaces remaining` : "Join the waitlist"}</span>
        </div>
        <div className="pn-spot-detail-grid">
          <span>Vehicle type<strong>{spot.vehicle}</strong></span>
          <span>Availability<strong>{spot.available} spaces</strong></span>
          <span>Rate<strong>₹{spot.rate}/hour</strong></span>
          <span>Access<strong>Open 24 hours</strong></span>
        </div>
        <button className="pn-btn-primary" type="button" onClick={onReserve}>
          Reserve this spot <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

export default ParkingSpotDetails;
