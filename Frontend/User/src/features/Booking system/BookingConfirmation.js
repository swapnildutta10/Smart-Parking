import React from "react";

function formatRate(rate) {
  return typeof rate === "number" ? `$${rate}/day` : rate;
}

function formatDate(dateString) {
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Shown right after a booking is created. Gives the user a reference code
// and a quick path either back to what they were doing or into their
// booking history.
function BookingConfirmation({ booking, onClose, onViewBookings }) {
  if (!booking) {
    return null;
  }

  return (
    <div
      className="pn-scope pn-spot-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Booking confirmed"
    >
      <div className="pn-spot-modal-card pn-booking-confirm-card">
        <button type="button" className="pn-spot-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="pn-booking-confirm-icon" aria-hidden="true">✓</div>
        <p className="pn-kicker">Booking confirmed</p>
        <h2>You&rsquo;re all set at {booking.location}.</h2>

        <div className="pn-booking-ref">
          <span>Booking reference</span>
          <strong>{booking.id}</strong>
        </div>

        <div className="pn-spot-detail-grid">
          <span>
            Date<strong>{formatDate(booking.date)}</strong>
          </span>
          <span>
            Time<strong>{booking.time}</strong>
          </span>
          <span>
            Duration<strong>{booking.duration} {booking.duration === 1 ? "hour" : "hours"}</strong>
          </span>
          <span>
            Rate<strong>{formatRate(booking.rate)}</strong>
          </span>
        </div>

        <button className="pn-btn-primary" type="button" onClick={onViewBookings}>
          View my bookings <span aria-hidden="true">→</span>
        </button>
        <button className="pn-btn-secondary pn-booking-confirm-done" type="button" onClick={onClose}>
          Done
        </button>
        <p className="pn-booking-confirm-hint">A copy of this reference is saved to your booking history.</p>
      </div>
    </div>
  );
}

export default BookingConfirmation;
