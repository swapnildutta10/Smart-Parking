import React from "react";

function formatRate(rate) {
  return typeof rate === "number" ? `$${rate}/day` : rate;
}

function ViewBookingDetails({ booking }) {
  return (
    <div className="pn-booking-item-details">
      <div className="pn-spot-detail-grid">
        <span>
          Booking ref<strong>{booking.id}</strong>
        </span>
        <span>
          Area<strong>{booking.area}</strong>
        </span>
        <span>
          Vehicle<strong>{booking.vehicle}</strong>
        </span>
        <span>
          Duration<strong>{booking.duration} {booking.duration === 1 ? "hour" : "hours"}</strong>
        </span>
        <span>
          Rate<strong>{formatRate(booking.rate)}</strong>
        </span>
        <span>
          Plate<strong>{booking.vehiclePlate || "Not provided"}</strong>
        </span>
      </div>
    </div>
  );
}

export default ViewBookingDetails;