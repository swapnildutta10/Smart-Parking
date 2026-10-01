import React from "react";
import { BOOKING_STATUS_LABELS } from "./bookingData";

function formatTimelineDateTime(dateTime) {
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return dateTime;
  }
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BookingDetails({ booking, onStatusChange }) {
  const [confirmingAction, setConfirmingAction] = React.useState(null);

  function requestStatusChange(status, label, needsConfirmation = false) {
    if (needsConfirmation) {
      setConfirmingAction({ status, label });
      return;
    }
    onStatusChange(booking.id, status, label);
  }

  function confirmStatusChange() {
    onStatusChange(booking.id, confirmingAction.status, confirmingAction.label);
    setConfirmingAction(null);
  }

  return (
    <div className="pn-admin-booking-expanded">
      <div className="pn-admin-booking-detail-grid">
        <div><span>User contact</span><strong>{booking.email}</strong><strong>{booking.phone}</strong></div>
        <div><span>Vehicle</span><strong>{booking.vehicle}</strong><strong>{booking.plate || "Plate not provided"}</strong></div>
        <div><span>Reservation</span><strong>{booking.duration} {booking.duration === 1 ? "hour" : "hours"}</strong><strong>{booking.spotId} · {booking.location}</strong></div>
      </div>

      <div className="pn-admin-booking-activity">
        <h3>Booking timeline</h3>
        <ol>
          {booking.timeline.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <span>{event.label}</span>
              <time dateTime={event.at}>{formatTimelineDateTime(event.at)}</time>
            </li>
          ))}
        </ol>
      </div>

      <div className="pn-admin-booking-actions">
        {booking.status === "upcoming" && (
          <>
            <button type="button" onClick={() => requestStatusChange("checked_in", "Checked in")}>Check in</button>
            <button type="button" onClick={() => requestStatusChange("completed", "Marked completed")}>Mark completed</button>
            <button type="button" onClick={() => requestStatusChange("no_show", "Marked no-show", true)}>Mark no-show</button>
            <button className="is-danger" type="button" onClick={() => requestStatusChange("cancelled", "Cancelled", true)}>Cancel booking</button>
          </>
        )}
        {booking.status === "checked_in" && (
          <button type="button" onClick={() => requestStatusChange("completed", "Marked completed")}>Mark completed</button>
        )}
        {confirmingAction && (
          <div className="pn-admin-booking-confirm" role="alertdialog" aria-label="Confirm booking status change">
            <span>Mark this booking {BOOKING_STATUS_LABELS[confirmingAction.status].toLowerCase()}?</span>
            <button type="button" onClick={confirmStatusChange}>Confirm</button>
            <button type="button" onClick={() => setConfirmingAction(null)}>Keep booking</button>
          </div>
        )}
        {!["upcoming", "checked_in"].includes(booking.status) && (
          <span className="pn-admin-booking-terminal-note">No actions available for this booking.</span>
        )}
      </div>
    </div>
  );
}

export default BookingDetails;