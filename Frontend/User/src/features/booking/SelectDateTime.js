import React from "react";
import { parkingRequest, bookingWindow, nextBookingSelection } from "../parkingSpot/parkingApi";
import { subscribeToAvailability } from "../parkingSpot/availabilityEvents";

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
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

function formatRate(rate) {
  return typeof rate === "number" ? `₹${rate}/hour` : rate;
}

function ratePerDay(rate) {
  if (typeof rate === "number") return rate;
  const match = String(rate).match(/[\d.]+/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function estimateCost(rate, duration) {
  const perDay = ratePerDay(rate);
  const cost = perDay * Math.ceil(duration);
  return cost < 1 ? cost.toFixed(2) : Math.round(cost * 100) / 100;
}

function SelectDateTime({ spot, vehicles = [], onClose, onConfirm }) {
  const [date, setDate] = React.useState(() => nextBookingSelection().date);
  const [time, setTime] = React.useState(() => nextBookingSelection().time);
  const [duration, setDuration] = React.useState(2);
  const [vehiclePlate, setVehiclePlate] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [available, setAvailable] = React.useState(null);
  const [checking, setChecking] = React.useState(false);
  const requestId = React.useRef(null);
  const submitting = React.useRef(false);

  React.useEffect(() => {
    const initial = spot?.bookingSelection || nextBookingSelection();
    setDate(initial.date);
    setTime(initial.time);
    setDuration(initial.duration);
    setVehiclePlate("");
    setError("");
    setSaving(false);
    submitting.current = false;
    requestId.current = null;
  }, [spot]);

  React.useEffect(() => {
    if (!spot?.inventoryId) return undefined;
    const controller = new AbortController();
    setAvailable(null);
    setChecking(true);
    let query;
    try { query = new URLSearchParams(bookingWindow(date, time, duration)); }
    catch { setChecking(false); return undefined; }
    let version = 0;
    async function load() {
      const current = ++version;
      try {
        const result = await parkingRequest(`/parking?${query}`, { signal: controller.signal });
        if (!controller.signal.aborted && version === current) {
          setAvailable(result.parking.find(item => item.inventoryId === spot.inventoryId)?.available ?? 0);
        }
      } catch (e) {
        if (!controller.signal.aborted && version === current) { setAvailable(0); setError(e.message); }
      } finally { if (!controller.signal.aborted && version === current) setChecking(false); }
    }
    load();
    const unsubscribe = subscribeToAvailability(load);
    return () => { controller.abort(); unsubscribe(); };
  }, [spot, date, time, duration]);

  React.useEffect(() => { requestId.current = null; }, [date, time, duration, vehiclePlate]);

  if (!spot) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      if (!requestId.current) {
        requestId.current = window.crypto?.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
          const random = Math.floor(Math.random() * 16);
          return (char === "x" ? random : (random & 3) | 8).toString(16);
        });
      }
      await onConfirm({
      inventoryId: spot.inventoryId,
      requestId: requestId.current,
      spotId: spot.id,
      location: spot.location,
      area: spot.area,
      vehicle: spot.vehicle,
      rate: spot.rate,
      vehiclePlate: vehiclePlate.trim(),
      date,
      time,
      duration,
    }); }
    catch (e) { setError(e.message || "The booking could not be saved. Please try again."); }
    finally { submitting.current = false; setSaving(false); }
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
        <button type="button" className="pn-spot-modal-close" onClick={onClose} disabled={saving} aria-label="Close">
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
          <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
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
            Vehicle registration number
            <span className="pn-field-icon-wrap">
              <span className="pn-field-icon" aria-hidden="true">🔖</span>
              <input
                type="text"
                required
                maxLength={20}
                placeholder="e.g. WB 20 AB 1234"
                value={vehiclePlate}
                onChange={(event) => setVehiclePlate(event.target.value)}
              />
            </span>
          </label>
          {vehicles.some(vehicle => vehicle.type === spot.vehicle) && <label>
            Use a saved vehicle
            <select value={vehicles.find(vehicle => vehicle.type === spot.vehicle && vehicle.plate === vehiclePlate)?.id || ""}
              onChange={event => setVehiclePlate(vehicles.find(vehicle => vehicle.id === event.target.value)?.plate || "")}>
              <option value="">Enter registration manually</option>
              {vehicles.filter(vehicle => vehicle.type === spot.vehicle).map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>)}
            </select>
          </label>}

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
              <strong>₹{estimateCost(spot.rate, duration)}</strong>
            </div>
            <span aria-hidden="true">💳</span>
          </div>

          <p role="status">{checking ? "Checking your selected time…" : available === null ? "Availability is checked when you confirm." : `${available} spaces available for your selected time`}</p>
          {error && <p role="alert">{error}</p>}
          <button className="pn-btn-primary" type="submit" disabled={saving || checking || available === 0}>
            {saving ? "Saving booking…" : "Confirm booking"} <span aria-hidden="true">→</span>
          </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}

export default SelectDateTime;
