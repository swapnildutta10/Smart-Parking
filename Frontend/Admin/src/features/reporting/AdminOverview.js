import React from "react";
import { useAdminData, formatMoney, STATUS_LABELS } from "./reportingApi";
import PaymentsChart from "./PaymentsChart";

export default function AdminOverview({ token, onNavigate }) {
  const { data, loading, error, reload } = useAdminData(token, "dashboard");
  const totals = data?.totals;
  const maximum = Math.max(1, ...(data?.topLocations || []).map(row => row.bookings));
  return <div className="pn-dashboard-home">
    <div className="pn-dash-topbar pn-dashboard-heading"><div><p className="pn-dashboard-breadcrumb">Home / Dashboard / Overview</p><h1>Admin dashboard</h1><p className="pn-dashboard-subtitle">Your parking network from current account records.</p></div><button type="button" onClick={reload}>Refresh</button></div>
    {loading && <p role="status">Loading dashboard…</p>}{error && <p role="alert">{error}</p>}
    {data && <>
      <p className="pn-dashboard-data-note">Updated {new Date(data.generatedAt).toLocaleString("en-IN", { timeZone: data.timezone })} IST</p>
      <div className="pn-stat-grid">
        {[
          ["Total users", totals.totalUsers.toLocaleString(), "Registered accounts", "pn-stat-users"],
          ["Available slots", totals.availableSlots.toLocaleString(), `Across ${totals.locations} bookable locations`, "available"],
          ["Active reservations", totals.activeBookings.toLocaleString(), "Upcoming or checked in; not expired", "booked"],
          ["This month's payments", formatMoney(totals.monthlyGrossCents), "Recorded amounts; no money collected", "pn-stat-revenue"],
        ].map(([label, value, note, className]) => <div className={`pn-stat-card ${className}`} key={label}><div className="pn-stat-card-heading"><span>{label}</span></div><strong>{value}</strong><div className="pn-stat-foot"><small>{note}</small></div></div>)}
      </div>
      <div className="pn-dashboard-analytics pn-dashboard-row-primary">
        <section className="pn-data-card pn-dashboard-panel"><div className="pn-dashboard-panel-head"><div><span>ALL BOOKINGS</span><h2>Top parking locations</h2></div><button type="button" onClick={() => onNavigate("locations")}>Manage locations</button></div>
          {!data.topLocations.length && <p>No bookings yet.</p>}
          <div className="pn-location-ranking">{data.topLocations.map((row, index) => <div className="pn-location-ranking-row" key={row.id}><span className={`pn-ranking-number rank-${index + 1}`}>{index + 1}</span><div className="pn-location-ranking-label"><strong>{row.location}</strong><small>{row.address}</small></div><div className="pn-ranking-track"><span className={`rank-fill-${index % 4}`} style={{ width: `${row.bookings / maximum * 100}%` }} /></div><strong className="pn-ranking-total">{row.bookings}<small> bookings</small></strong></div>)}</div>
        </section>
        <section className="pn-data-card pn-dashboard-panel"><div className="pn-dashboard-panel-head"><div><span>CURRENT CAPACITY</span><h2>Slot availability</h2></div></div>
          <div className="pn-capacity-overview"><div className="pn-capacity-ring" style={{ "--capacity-angle": `${totals.availablePercent * 3.6}deg` }}><div><small>Available</small><strong>{totals.availablePercent}%</strong></div></div><div className="pn-capacity-breakdown"><div><span>Available now</span><strong>{totals.availableSlots}</strong></div><div><span>Reserved now</span><strong>{totals.occupiedSlots}</strong></div><div><span>Total capacity</span><strong>{totals.totalSlots}</strong></div><div><span>Inventory entries</span><strong>{totals.inventory}</strong></div></div></div>
          <button type="button" className="pn-dashboard-text-link" onClick={() => onNavigate("slots")}>Manage inventory</button>
        </section>
      </div>
      <div className="pn-dashboard-analytics pn-dashboard-row-secondary">
        <section className="pn-data-card pn-dashboard-panel"><div className="pn-dashboard-panel-head"><div><span>PAYMENT RECORDS · INR</span><h2>Monthly payments and refunds</h2></div><span>{data.year}</span></div><div className="pn-chart-legend"><span><i className="capacity-cyan" />Recorded</span><span><i className="capacity-orange" />Refunded</span></div><PaymentsChart monthly={data.monthly} /><p className="pn-dashboard-data-note">Recorded amounts only. No money collected.</p></section>
        <section className="pn-data-card pn-dashboard-panel"><div className="pn-dashboard-panel-head"><div><span>BOOKINGS</span><h2>Booking summary</h2></div><button type="button" onClick={() => onNavigate("bookings")}>View bookings</button></div><strong>{totals.totalBookings} total bookings</strong><div className="pn-booking-summary-stats">{Object.entries(data.bookingStatuses).map(([status, count]) => <div key={status}><span>{STATUS_LABELS[status]}</span><strong>{count}</strong></div>)}</div><button type="button" onClick={() => onNavigate("support")}>{totals.openSupportRequests} open support requests</button></section>
      </div>
      <section className="pn-data-card pn-dashboard-panel"><div className="pn-dashboard-panel-head"><div><span>LATEST ACTIVITY</span><h2>Recent bookings</h2></div><button type="button" onClick={() => onNavigate("reports")}>View reports</button></div>
        <div className="pn-dashboard-table-wrap"><table className="pn-dashboard-table"><thead><tr><th>Customer</th><th>Location</th><th>Arrival (IST)</th><th>Status</th></tr></thead><tbody>{data.recentBookings.map(row => <tr key={row.id}><td>{row.userName}</td><td>{row.location} · {row.spotId}</td><td>{row.date} {row.time}</td><td><span className={`pn-status-tag ${row.status}`}>{STATUS_LABELS[row.status]}</span></td></tr>)}</tbody></table></div>{!data.recentBookings.length && <p>No bookings yet.</p>}
      </section>
    </>}
  </div>;
}
