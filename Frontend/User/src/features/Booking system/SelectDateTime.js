import React from "react";

const DURATION_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 4, label: "4 hours" },
  { value: 8, label: "8 hours" },
  { value: 24, label: "Full day" },
];

const VEHICLE_ICON = {
  Car: "🚗",
  "Two wheeler": "🛵",
  "SUV / Van": "🚙",
  EV: "⚡",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatRate(rate) {
  return typeof rate === "number" ? `$${rate}/day` : rate;
}

function ratePerDay(rate) {
  if (typeof rate === "number") return rate;
  const match = String(rate).match(/[\d.]+/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function estimateCost(rate, duration) {
  const perDay = ratePerDay(rate);
  const cost = duration >= 24 ? perDay * Math.ceil(duration / 24) : (perDay / 24) * duration;
  return cost < 1 ? cost.toFixed(2) : Math.round(cost * 100) / 100;
}

function SelectDateTime({ spot, onClose, onConfirm }) {
  const [date, setDate] = React.useState(todayISO());
  const [time, setTime] = React.useState("09:00");
  const [duration, setDuration] = React.useState(2);
  const [vehiclePlate, setVehiclePlate] = React.useState("");

  React.useEffect(() => {
    setDate(todayISO());
    setTime("09:00");
    setDuration(2);
    setVehiclePlate("");
  }, [spot]);

  if (!spot) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm({
      spotId: spot.id,
      location: spot.location,
      area: spot.area,
      vehicle: spot.vehicle,
      rate: spot.rate,
      vehiclePlate: vehiclePlate.trim(),
      date,
      time,
      duration,
    });
  }

  const icon = VEHICLE_ICON[spot.vehicle] || "🅿️";

  return (
    <div
      className="pn-scope pn-spot-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Book ${spot.location}`}
    >
      <div className="pn-spot-modal-card pn-booking-modal-card">
        <button type="button" className="pn-spot-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="pn-kicker">Select date &amp; time</p>
        <span className="pn-slot-id">{spot.id}</span>
        <h2>{spot.location}</h2>

        <span className="pn-booking-summary-chip">
          <span className="pn-vehicle-icon" aria-hidden="true">{icon}</span>
          {spot.vehicle} · {spot.area}
        </span>

        <form className="pn-booking-form" onSubmit={handleSubmit}>
          <div className="pn-booking-form-row">
            <label>
              Date
              <span className="pn-field-icon-wrap">
                <span className="pn-field-icon" aria-hidden="true">📅</span>
                <input
                  type="date"
                  required
                  min={todayISO()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </span>
            </label>
            <label>
              Time
              <span className="pn-field-icon-wrap">
                <span className="pn-field-icon" aria-hidden="true">🕒</span>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </span>
            </label>
          </div>

          <label>
            Duration
            <span className="pn-field-icon-wrap">
              <span className="pn-field-icon" aria-hidden="true">⏳</span>
              <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <label>
            Vehicle plate <span className="pn-optional-tag">(optional)</span>
            <span className="pn-field-icon-wrap">
              <span className="pn-field-icon" aria-hidden="true">🔖</span>
              <input
                type="text"
                placeholder="e.g. WB 20 AB 1234"
                value={vehiclePlate}
                onChange={(event) => setVehiclePlate(event.target.value)}
              />
            </span>
          </label>

          <div className="pn-spot-detail-grid">
            <span>
              Vehicle type<strong>{spot.vehicle}</strong>
            </span>
            <span className="pn-detail-highlight">
              Rate<strong>{formatRate(spot.rate)}</strong>
            </span>
          </div>

          <div className="pn-booking-cost-row">
            <div>
              <small>Estimated cost</small>
              <strong>${estimateCost(spot.rate, duration)}</strong>
            </div>
            <span aria-hidden="true">💳</span>
          </div>

          <button className="pn-btn-primary" type="submit">
            Confirm booking <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default SelectDateTime;