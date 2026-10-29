import React from "react";
import CancelBooking from "./CancelBooking";
import ViewBookingDetails from "./ViewBookingDetails";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "checked_in", label: "Checked in" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_LABEL = {
  upcoming: "Upcoming",
  checked_in: "Checked in",
  no_show: "No-show",
  completed: "Completed",
  cancelled: "Cancelled",
};

const VEHICLE_ICON = {
  Car: "🚗",
  "Two wheeler": "🛵",
  "SUV / Van": "🚙",
  EV: "⚡",
};

function formatDate(dateString) {
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function BookingHistory({ bookings, loading, error, onCancel, onFindSpot }) {
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [expandedId, setExpandedId] = React.useState(null);

  const sorted = [...bookings].sort((a, b) => new Date(b.startsAt || `${b.date}T${b.time}`) - new Date(a.startsAt || `${a.date}T${a.time}`));
  const visible = statusFilter === "all" ? sorted : sorted.filter((booking) => booking.status === statusFilter);

  function toggleExpanded(id) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <section className="pn-bookings-panel">
      {loading && <p role="status">Loading bookings…</p>}
      {error && <p role="alert">Could not load bookings: {error}</p>}
      <div className="pn-booking-tabs" role="tablist" aria-label="Filter bookings by status">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "all"
            ? bookings.length
            : bookings.filter((booking) => booking.status === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.key}
              className={statusFilter === tab.key ? "active" : ""}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label} <span>{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 && !loading && !error ? (
        <div className="pn-empty-results">
          <span className="pn-empty-results-icon" aria-hidden="true">🎫</span>
          <h2>No bookings here yet</h2>
          <p>Reserve a parking spot and it will show up in your booking history.</p>
          {onFindSpot && (
            <button className="pn-btn-secondary" type="button" onClick={onFindSpot}>
              Find a spot
            </button>
          )}
        </div>
      ) : (
        <ul className="pn-booking-list">
          {visible.map((booking) => {
            const isExpanded = expandedId === booking.id;
            return (
              <li className={`pn-booking-item is-${booking.status}${isExpanded ? " is-expanded" : ""}`} key={booking.id}>
                <button
                  type="button"
                  className="pn-booking-item-header"
                  onClick={() => toggleExpanded(booking.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="pn-booking-item-id">{booking.spotId}</span>
                  <span className="pn-booking-item-main">
                    <strong>{VEHICLE_ICON[booking.vehicle] || "🅿️"} {booking.location}</strong>
                    <small>{formatDate(booking.date)} · {booking.time}</small>
                  </span>
                  <span className={`pn-booking-status-badge is-${booking.status}`}>
                    {STATUS_LABEL[booking.status]}
                  </span>
                  <span className="pn-booking-item-chevron" aria-hidden="true">
                    {isExpanded ? "︿" : "﹀"}
                  </span>
                </button>

                {isExpanded && (
                  <>
                    <ViewBookingDetails booking={booking} />
                    {booking.status === "upcoming" && (
                      <div className="pn-booking-item-details">
                        <CancelBooking onCancel={() => onCancel(booking.id)} />
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default BookingHistory;
