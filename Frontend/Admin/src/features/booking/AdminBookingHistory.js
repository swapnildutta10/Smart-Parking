import React from "react";
import BookingDetails from "./BookingDetails";
import BookingFilters from "./BookingFilters";
import { BOOKING_STATUS_LABELS } from "./bookingData";

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

function AdminBookingHistory({ bookings, onStatusChange }) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [slotFilter, setSlotFilter] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [expandedId, setExpandedId] = React.useState(null);
  const slots = [...new Map(bookings.map((booking) => [
    booking.spotId,
    { id: booking.spotId, location: booking.location },
  ])).values()];

  const filteredBookings = bookings.filter((booking) => {
    const searchValue = query.trim().toLowerCase();
    const matchesQuery = !searchValue || [
      booking.id,
      booking.userName,
      booking.email,
      booking.spotId,
      booking.location,
      booking.phone,
      booking.plate,
    ].some((value) => (value || "").toLowerCase().includes(searchValue));
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesSlot = slotFilter === "all" || booking.spotId === slotFilter;
    const matchesDateFrom = !dateFrom || booking.date >= dateFrom;
    const matchesDateTo = !dateTo || booking.date <= dateTo;
    return matchesQuery && matchesStatus && matchesSlot && matchesDateFrom && matchesDateTo;
  }).sort((first, second) => `${first.date}${first.time}`.localeCompare(`${second.date}${second.time}`));

  return (
    <section className="pn-admin-bookings-page">
      <div className="pn-dash-topbar">
        <div>
          <p className="pn-dash-kicker">Reservation records</p>
          <h1>Booking history</h1>
        </div>
        <span className="pn-capacity-value">{bookings.length} bookings</span>
      </div>

      <div className="pn-admin-booking-notice">
        Demo records are shown here. Live user bookings are not connected to the admin app yet.
      </div>

      <BookingFilters
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        slotFilter={slotFilter}
        onSlotChange={setSlotFilter}
        slots={slots}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
      />

      <div className="pn-admin-booking-table-wrap">
        <table className="pn-admin-booking-table">
          <thead>
            <tr>
              <th scope="col">Booking</th>
              <th scope="col">User</th>
              <th scope="col">Parking slot</th>
              <th scope="col">Date &amp; time</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="visually-hidden">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <React.Fragment key={booking.id}>
              <tr>
                <td>
                  <strong>{booking.id}</strong>
                  <small>{booking.duration} {booking.duration === 1 ? "hour" : "hours"}</small>
                </td>
                <td>
                  <strong>{booking.userName}</strong>
                  <small>{booking.email}</small>
                </td>
                <td>
                  <strong>{booking.spotId}</strong>
                  <small>{booking.location}</small>
                </td>
                <td>
                  <strong>{formatDate(booking.date)}</strong>
                  <small>{booking.time}</small>
                </td>
                <td>
                  <span className={`pn-admin-booking-status-tag is-${booking.status}`}>
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="pn-admin-booking-details-toggle"
                    aria-expanded={expandedId === booking.id}
                    onClick={() => {
                      setExpandedId((currentId) => currentId === booking.id ? null : booking.id);
                    }}
                  >
                    {expandedId === booking.id ? "Hide details" : "View details"}
                  </button>
                </td>
              </tr>
              {expandedId === booking.id && (
                <tr className="pn-admin-booking-expanded-row">
                  <td colSpan="6">
                    <BookingDetails booking={booking} onStatusChange={onStatusChange} />
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
            {filteredBookings.length === 0 && (
              <tr>
                <td className="pn-admin-bookings-empty" colSpan="6">
                  No bookings match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pn-admin-booking-count" aria-live="polite">
        Showing {filteredBookings.length} of {bookings.length} bookings
      </p>
    </section>
  );
}

export default AdminBookingHistory;