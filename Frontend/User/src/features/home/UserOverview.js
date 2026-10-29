import React from "react";
import { parkingRequest } from "../parkingSpot/parkingApi";
import { formatMoney } from "../Payment/paymentUtils";
import { subscribeToAvailability } from "../parkingSpot/availabilityEvents";

export default function UserOverview({ user, activityKey, onNavigate, onBook, onLogin }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    if (!user?.id) { setData(null); setLoading(false); return undefined; }
    let version = 0;
    async function load() {
      const requestVersion = ++version;
      try {
        const result = await parkingRequest("/dashboard", { signal: controller.signal });
        if (!controller.signal.aborted && version === requestVersion) { setData(result); setError(""); }
      } catch (err) { if (!controller.signal.aborted && version === requestVersion) setError(err.message); }
      finally { if (!controller.signal.aborted && version === requestVersion) setLoading(false); }
    }
    load();
    const unsubscribe = subscribeToAvailability(load);
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); unsubscribe(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [user?.id, activityKey, revision]);
  if (!user?.id) return <section className="pn-user-panel"><h2>Your dashboard</h2><p>Sign in to see your booking activity and account summary.</p><button type="button" onClick={onLogin}>Sign in</button></section>;
  const totals = data?.totals;
  const next = data?.nextBooking;
  const maxBookings = Math.max(1, ...(data?.yearlyActivity || []).map(row => row.bookings));
  const colors = ["#4aa8d8", "#e2764d", "#8a78d6"];
  let angle = 0;
  const slices = (data?.parkingMix || []).map((row, i) => {
    const start = angle; angle += totals.availableSpaces ? row.value / totals.availableSpaces * 360 : 0;
    return `${colors[i]} ${start}deg ${angle}deg`;
  });
  const pie = totals?.availableSpaces ? `conic-gradient(${slices.join(", ")})` : "#e5e7eb";
  return <>
    <section className="pn-user-welcome-banner"><div><p className="pn-user-dashboard-kicker">Parking made simple</p><h2>Find your next space without the circling.</h2><p>Compare locations, current availability and hourly prices.</p></div><button className="pn-user-primary-action" type="button" onClick={() => onNavigate("find")}>Find a spot →</button></section>
    <div className="pn-user-panel-heading"><p>{data ? `Updated ${new Date(data.generatedAt).toLocaleString("en-IN", { timeZone: data.timezone })} IST` : "Your account overview"}</p><button type="button" onClick={() => setRevision(value => value + 1)}>Refresh</button></div>
    {loading && <p role="status">Loading your dashboard…</p>}{error && <p role="alert">{error}</p>}
    {data && <>
      <section className="pn-user-stat-grid" aria-label="Parking summary">
        {[["Available spaces", totals.availableSpaces, `Of ${totals.totalSpaces} total spaces`, "is-green", "⌖"],
          ["Parking locations", totals.locations, "Bookable locations", "is-blue", "◉"],
          ["Average hourly rate", formatMoney(totals.averageHourlyRateCents), "Across active inventory", "is-orange", "₹"],
          ["Next reservation", next?.spotId || "None", next ? `${next.date} at ${next.time} IST` : "No upcoming reservation", "is-purple", "✓"]]
          .map(([label, value, note, color, icon]) => <article className="pn-user-stat-card" key={label}><span className={`pn-user-stat-icon ${color}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>)}
      </section>
      <section className="pn-user-stat-grid" aria-label="Your account summary">
        {[["My active bookings", totals.activeBookings, "bookings"], ["Awaiting payment", totals.pendingPayments, "payments"], ["Saved locations", totals.savedLocations, "saved"], ["Saved vehicles", totals.savedVehicles, "vehicles"]].map(([label, value, view]) => <article className="pn-user-stat-card" key={label}><div><small>{label}</small><strong>{value}</strong><button type="button" className="pn-user-outline-action" onClick={() => onNavigate(view)}>View →</button></div></article>)}
      </section>
      <section className="pn-user-dashboard-grid">
        <article className="pn-user-panel pn-mix-panel"><div className="pn-user-panel-heading"><div><h2>Parking mix</h2><p>Current availability by vehicle type</p></div></div><div className="pn-mix-content"><div className="pn-pie-chart" style={{ background: pie }} role="img" aria-label={data.parkingMix.map(row => `${row.label}: ${row.value} available`).join(", ")}><div><strong>{totals.availableSpaces}</strong><span>open spaces</span></div></div><div className="pn-pie-legend">{data.parkingMix.map((row, i) => <div key={row.label}><i style={{ background: colors[i] }} /><span>{row.label}</span><b>{row.value}</b></div>)}</div></div></article>
        <article className="pn-user-panel pn-user-booking-panel"><div className="pn-user-panel-heading"><div><h2>Next reservation</h2><p>Your next upcoming parking visit</p></div></div>{next ? <><div className="pn-booking-code">{next.spotId}</div><h3>{next.location}</h3><div className="pn-booking-details"><span><small>Date (IST)</small><strong>{next.date}</strong></span><span><small>Arrival</small><strong>{next.time}</strong></span><span><small>Hourly rate</small><strong>{formatMoney(Math.round(next.rate * 100))}</strong></span></div></> : <p className="pn-user-no-booking">No upcoming bookings yet. Find a spot to reserve one.</p>}<button type="button" className="pn-user-outline-action" onClick={() => onNavigate("bookings")}>Manage bookings →</button></article>
      </section>
      <section className="pn-user-panel pn-user-availability-panel"><div className="pn-user-panel-heading"><div><h2>Availability by area</h2><p>Available capacity as a share of each area's total</p></div></div><div className="pn-area-list">{data.availabilityByArea.map(row => <div className="pn-area-row" key={row.area}><div><strong>{row.area}</strong><span>{row.locations} locations · {row.totalSlots} total spaces</span></div><div className="pn-area-bar"><span style={{ width: `${row.availablePercent}%` }} /></div><b>{row.available} open</b></div>)}</div>{!data.availabilityByArea.length && <p>No parking inventory is available.</p>}</section>
      <section className="pn-user-panel pn-seat-map-panel"><div className="pn-user-panel-heading"><div><h2>Live parking capacity</h2><p>Choose a location and vehicle type to reserve a space</p></div></div><div className="pn-location-list">{data.inventory.map(spot => <button type="button" className="pn-location-item" key={spot.inventoryId} disabled={!spot.available} onClick={() => onBook(spot)}><span className="pn-location-pin">⌖</span><span><strong>{spot.location}</strong><small>{spot.vehicle} · {spot.available} of {spot.totalSlots} spaces available</small></span><b>{formatMoney(Math.round(spot.rate * 100))}<small>/hour</small></b></button>)}</div>{!data.inventory.length && <p>No parking locations available.</p>}</section>
      <section className="pn-user-panel pn-user-trend-panel"><div className="pn-user-panel-heading"><div><h2>Your yearly parking activity</h2><p>Your bookings by arrival year, including cancelled reservations</p></div></div><div className="pn-bar-chart" role="img" aria-label={data.yearlyActivity.map(row => `${row.year}: ${row.bookings} bookings`).join(", ")}>{data.yearlyActivity.map(row => <div className="pn-bar-col" key={row.year}><span className="pn-bar-value">{row.bookings}</span><div className="pn-bar-track"><div className="pn-bar-fill" style={{ height: `${row.bookings / maxBookings * 100}%` }} /></div><span className="pn-bar-year">{row.year}</span></div>)}</div></section>
      <section className="pn-user-panel"><div className="pn-user-panel-heading"><h2>Your payment and support summary</h2></div><p>Recorded payments: {formatMoney(totals.recordedPaidCents)} · Recorded refunds: {formatMoney(totals.recordedRefundCents)}. No money was charged.</p><button type="button" className="pn-user-outline-action" onClick={() => onNavigate("support")}>{totals.openSupportRequests} open support requests →</button></section>
    </>}
  </>;
}
