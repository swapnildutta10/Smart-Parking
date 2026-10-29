import React from "react";
import { NOTIFICATION_COPY, NOTIFICATION_ICONS } from "./notificationUtils";
import "./notification.css";

function NotificationHistory({ notifications, bookings, loading, error, onRetry, onMarkParked }) {
  const [actionError, setActionError] = React.useState("");
  const [busyBooking, setBusyBooking] = React.useState(null);
  const working = React.useRef(false);
  async function markParked(bookingId) {
    if (working.current) return;
    working.current = true; setBusyBooking(bookingId); setActionError("");
    try { await onMarkParked(bookingId); }
    catch (err) { setActionError(err.message || "Could not confirm parking."); }
    finally { working.current = false; setBusyBooking(null); }
  }
  const sortedNotifications = [...notifications].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section className="pn-notification-history" aria-label="Notification history">
      {loading && <p role="status">Loading notification history…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={onRetry}>Try again</button></p>}
      {actionError && <p role="alert">{actionError}</p>}
      {sortedNotifications.length > 0 ? (
        <ol>
          {sortedNotifications.map((notification) => {
            const isOverdueActive = notification.kind === "overdue"
              && bookings.some((booking) => booking.id === notification.bookingId && booking.status === "upcoming" && !booking.parked
                && (!booking.endsAt || new Date(booking.endsAt).getTime() > Date.now()));
            const copy = NOTIFICATION_COPY[notification.kind] || { title: "Booking update", message: () => "Your booking has been updated." };

            return (
              <li className={`pn-notification-item is-${notification.kind}`} key={notification.id}>
                <span className="pn-notification-icon" aria-hidden="true">
                  {NOTIFICATION_ICONS[notification.kind]}
                </span>
                <div className="pn-notification-copy">
                  <strong>{copy.title}</strong>
                  <p>{copy.message(notification)}</p>
                  <time dateTime={new Date(notification.createdAt).toISOString()}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </time>
                </div>
                {isOverdueActive && (
                  <button type="button" disabled={Boolean(busyBooking)} onClick={() => markParked(notification.bookingId)}>
                    {busyBooking === notification.bookingId ? "Confirming…" : "I've parked"}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : !loading && !error && (
        <div className="pn-empty-results">
          <span className="pn-empty-results-icon" aria-hidden="true">♧</span>
          <h2>No notifications yet</h2>
          <p>Reservation updates and alerts will appear here.</p>
        </div>
      )}
    </section>
  );
}

export default NotificationHistory;
