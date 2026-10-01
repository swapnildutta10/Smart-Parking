import React from "react";
import { BOOKING_STATUS_LABELS } from "./bookingData";

function BookingFilters({
  query,
  onQueryChange,
  statusFilter,
  onStatusChange,
  slotFilter,
  onSlotChange,
  slots,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}) {
  return (
    <>
      <div className="pn-admin-booking-toolbar">
        <label className="pn-admin-booking-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search user, slot, location, or reference"
            aria-label="Search bookings"
          />
        </label>
        <label className="pn-admin-booking-status">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(BOOKING_STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="pn-admin-booking-filters">
        <label>
          <span>From</span>
          <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => onDateToChange(event.target.value)} />
        </label>
        <label>
          <span>Parking slot</span>
          <select value={slotFilter} onChange={(event) => onSlotChange(event.target.value)}>
            <option value="all">All slots</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>{slot.id} · {slot.location}</option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

export default BookingFilters;