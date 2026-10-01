import React from "react";
import { NOTIFICATION_COPY, NOTIFICATION_ICONS } from "./notificationUtils";
import "./notification.css";

function NotificationHistory({ notifications, bookings, onMarkParked }) {
  const sortedNotifications = [...notifications].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section className="pn-notification-history" aria-label="Notification history">
      {sortedNotifications.length > 0 ? (
        <ol>
          {sortedNotifications.map((notification) => {
            const isOverdueActive = notification.kind === "overdue"
              && bookings.some((booking) => booking.id === notification.bookingId && !booking.parked);
            const copy = NOTIFICATION_COPY[notification.kind];

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
                  <button type="button" onClick={() => onMarkParked(notification.bookingId)}>
                    I&apos;ve parked
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
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