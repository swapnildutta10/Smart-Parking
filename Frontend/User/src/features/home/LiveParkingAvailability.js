import React from "react";
import { parkingRequest, bookingWindow, nextBookingSelection } from "../parkingSpot/parkingApi";
import { formatMoney } from "../Payment/paymentUtils";
import ParkingCapacityVisual from "./ParkingCapacityVisual";
import { subscribeToAvailability } from "../parkingSpot/availabilityEvents";
import "../../styles/live-availability.css";

export default function LiveParkingAvailability({ onBook }) {
  const [mode, setMode] = React.useState("now");
  const [selection, setSelection] = React.useState(() => nextBookingSelection());
  const [applied, setApplied] = React.useState(null);
  const [locationId, setLocationId] = React.useState("");
  const [vehicle, setVehicle] = React.useState("");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  const query = applied ? `?${new URLSearchParams(bookingWindow(applied.date, applied.time, applied.duration))}` : "";
  React.useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    let queued = false;
    setLoading(true); setData(null); setError("");
    async function load() {
      if (controller.signal.aborted) return;
      if (pending) { queued = true; return; }
      pending = true; setRefreshing(true);
      try {
        const result = await parkingRequest(`/availability${query}`, { signal: controller.signal });
        if (!controller.signal.aborted) { setData(result); setError(""); }
      } catch (err) { if (!controller.signal.aborted) setError(err.message || "Could not load availability."); }
      finally {
        pending = false;
        if (!controller.signal.aborted) {
          setLoading(false); setRefreshing(false);
          if (queued) { queued = false; load(); }
        }
      }
    }
    load();
    const unsubscribe = subscribeToAvailability(load);
    const timer = window.setInterval(load, 10000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); unsubscribe(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [query, revision]);
  const visible = (data?.locations || []).filter(location => !locationId || location.parkingId === locationId)
    .map(location => ({ ...location, inventory: location.inventory.filter(row => !vehicle || row.vehicle === vehicle) }))
    .filter(location => location.inventory.length);
  const inventory = visible.flatMap(location => location.inventory);
  const available = inventory.reduce((sum, row) => sum + row.available, 0);
  const total = inventory.reduce((sum, row) => sum + row.totalSlots, 0);
  function apply(event) {
    event.preventDefault();
    setApplied(mode === "window" ? { ...selection } : null); setRevision(value => value + 1);
  }
  return <section className="pn-live-availability">
    <header className="pn-live-hero">
      <div><span className="pn-live-eyebrow"><i /> LIVE PARKING AVAILABILITY</span><h2>Less circling.<br /><span>More arriving.</span></h2><p>Find an open space, pick your location, and make it yours.</p><button type="button" className="pn-live-refresh" disabled={refreshing} onClick={() => setRevision(value => value + 1)}>{refreshing ? "↻ Updating…" : "↻ Refresh availability"}</button></div>
      <div className="pn-live-hero-count"><span className="pn-live-hero-orbit" aria-hidden="true">P</span><div><small>SPACES AVAILABLE</small><strong>{data ? available : "—"}</strong><span>{data ? `across ${visible.length} locations` : "Finding your next space…"}</span></div></div>
    </header>
    <form className="pn-live-filters" onSubmit={apply}>
      <label>Show availability<select value={mode} onChange={event => setMode(event.target.value)}><option value="now">Right now</option><option value="window">Planned booking window</option></select></label>
      <label>Date (IST)<input type="date" required disabled={mode === "now"} value={selection.date} min={new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)} onChange={event => setSelection(current => ({ ...current, date: event.target.value }))} /></label>
      <label>Arrival (IST)<input type="time" required disabled={mode === "now"} value={selection.time} onChange={event => setSelection(current => ({ ...current, time: event.target.value }))} /></label>
      <label>Duration<select disabled={mode === "now"} value={selection.duration} onChange={event => setSelection(current => ({ ...current, duration: Number(event.target.value) }))}>{[1, 2, 4, 8, 24].map(hours => <option key={hours} value={hours}>{hours} {hours === 1 ? "hour" : "hours"}</option>)}</select></label>
      <button className="pn-btn-primary" type="submit">Check availability</button>
    </form>
    <div className="pn-live-filters">
      <label>Parking location<select value={locationId} onChange={event => setLocationId(event.target.value)}><option value="">All locations</option>{locationId && !data?.locations.some(location => location.parkingId === locationId) && <option value={locationId}>Unavailable location</option>}{(data?.locations || []).map(location => <option value={location.parkingId} key={location.parkingId}>{location.location} — {location.area}</option>)}</select></label>
      <label>Vehicle type<select value={vehicle} onChange={event => setVehicle(event.target.value)}><option value="">All vehicle types</option><option>Car</option><option>Two wheeler</option><option>SUV / Van</option></select></label>
    </div>
    {loading && <p role="status">Loading live availability…</p>}
    {error && <p role="alert">{error} Availability may have changed. Refresh to try again.</p>}
    {data && <>
      <p className="pn-live-updated">Updated {new Date(data.generatedAt).toLocaleTimeString("en-IN", { timeZone: data.timezone })} IST · Updates automatically when reservations change</p>
      <p>{data.mode === "now" ? "Showing availability right now." : `Showing ${new Date(data.startsAt).toLocaleString("en-IN", { timeZone: data.timezone })} to ${new Date(data.endsAt).toLocaleString("en-IN", { timeZone: data.timezone })} IST.`}</p>
      <div className="pn-live-summary"><div><span className="pn-live-metric-icon">↗</span><small>Ready for you</small><strong>{available}</strong><span>available spaces</span></div><div><span className="pn-live-metric-icon">▰</span><small>Already reserved</small><strong>{total - available}</strong><span>reserved spaces</span></div><div><span className="pn-live-metric-icon">▦</span><small>Parking network</small><strong>{total}</strong><span>total spaces</span></div><div><span className="pn-live-metric-icon">⌖</span><small>Places to park</small><strong>{visible.length}</strong><span>locations</span></div></div>
      {!visible.length && <p>No parking inventory matches these filters.</p>}
      <div className="pn-live-locations">{visible.map(location => {
        const capacity = location.inventory.reduce((sum, row) => sum + row.totalSlots, 0);
        const open = location.inventory.reduce((sum, row) => sum + row.available, 0);
        return <article className="pn-user-panel pn-live-location" key={location.parkingId}>
          <div className="pn-user-panel-heading"><div><h2>{location.location}</h2><p>{location.area}</p></div><span className={`pn-live-status ${open ? "is-open" : "is-full"}`}>{open ? `${open} available` : "Fully reserved"}</span></div>
          <div className="pn-live-capacity" role="img" aria-label={`${open} of ${capacity} spaces available`}><span style={{ width: `${capacity ? open / capacity * 100 : 0}%` }} /></div>
          {location.inventory.map(spot => <React.Fragment key={spot.inventoryId}>
            <ParkingCapacityVisual total={spot.totalSlots} available={spot.available} vehicle={spot.vehicle} />
            <div className="pn-live-inventory">
            <div><strong>{spot.vehicle}</strong><p>{spot.available} available · {spot.reserved} reserved · {spot.totalSlots} total</p><small>{formatMoney(Math.round(spot.rate * 100))}/hour</small></div>
            <button type="button" className="pn-user-outline-action" disabled={!spot.available || Boolean(error) || loading}
              onClick={() => onBook({ ...spot, ...(applied ? { bookingSelection: applied } : {}) })}>{spot.available ? "Reserve a space →" : "Fully reserved"}</button>
          </div></React.Fragment>)}
        </article>;
      })}</div>
      <p>Counts represent reservable capacity, rather than assigned bay numbers. Availability is checked again when you confirm a booking.</p>
    </>}
  </section>;
}
