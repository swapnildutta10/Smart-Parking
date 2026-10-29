import React from "react";
import { useAdminData, formatMoney, indiaDate, STATUS_LABELS, downloadReport } from "./reportingApi";

export default function AdminReports({ token }) {
  const today = indiaDate();
  const [from, setFrom] = React.useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = React.useState(today);
  const [range, setRange] = React.useState({ from: `${today.slice(0, 7)}-01`, to: today });
  const { data, loading, error, reload } = useAdminData(token, `reports?${new URLSearchParams(range)}`);
  return <section className="pn-admin-slots-page">
    <div className="pn-dash-topbar"><div><p className="pn-dash-kicker">Operational reports</p><h1>Reports</h1></div><button type="button" disabled={!data || loading || Boolean(error)} onClick={() => downloadReport(data)}>Export CSV</button></div>
    <form className="pn-admin-spot-form" onSubmit={event => { event.preventDefault(); setRange({ from, to }); }}>
      <label>From (IST)<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} required /></label>
      <label>To (IST)<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} required /></label>
      <button className="pn-admin-submit" type="submit">Apply dates</button><button type="button" onClick={reload}>Refresh</button>
    </form>
    {loading && <p role="status">Loading report…</p>}{error && <p role="alert">{error}</p>}
    {data && <>
      <p>{data.range.from} to {data.range.to} · India Standard Time. Bookings use arrival dates; payments and refunds use their recorded dates.</p>
      <div className="pn-stat-grid">{[["Bookings", data.totals.bookings], ["Recorded payments", formatMoney(data.totals.grossCents)], ["Recorded refunds", formatMoney(data.totals.refundCents)], ["Net recorded amount", formatMoney(data.totals.netCents)]].map(([label, value]) => <div className="pn-stat-card" key={label}><div className="pn-stat-card-heading">{label}</div><strong>{value}</strong></div>)}</div>
      <p className="pn-dashboard-data-note">Recorded amounts only. No money collected. Booked parking value excludes cancelled and no-show reservations.</p>
      <section className="pn-data-card"><div className="pn-data-card-head"><h2>Booking status</h2></div><div className="pn-booking-summary-stats">{Object.entries(data.bookingStatuses).map(([status, count]) => <div key={status}><span>{STATUS_LABELS[status]}</span><strong>{count}</strong></div>)}</div><p>Booked parking value: {formatMoney(data.totals.bookedAmountCents)}</p></section>
      <section className="pn-data-card"><div className="pn-data-card-head"><h2>By location</h2></div><div className="pn-dashboard-table-wrap"><table className="pn-dashboard-table"><thead><tr><th>Location</th><th>Bookings</th><th>Cancelled</th><th>Booked value</th></tr></thead><tbody>{data.locations.map(row => <tr key={row.id}><td>{row.location}<small>{row.address}</small></td><td>{row.bookings}</td><td>{row.cancelled}</td><td>{formatMoney(row.bookedAmountCents)}</td></tr>)}</tbody></table></div>{!data.locations.length && <p>No bookings in this date range.</p>}</section>
      <section className="pn-data-card"><div className="pn-data-card-head"><h2>Daily activity</h2></div><div className="pn-dashboard-table-wrap"><table className="pn-dashboard-table"><thead><tr><th>Date (IST)</th><th>Bookings</th><th>Payment records</th><th>Refund records</th><th>Recorded</th><th>Refunded</th><th>Net</th></tr></thead><tbody>{data.daily.map(row => <tr key={row.date}><td>{row.date}</td><td>{row.bookings}</td><td>{row.payments}</td><td>{row.refunds}</td><td>{formatMoney(row.grossCents)}</td><td>{formatMoney(row.refundCents)}</td><td>{formatMoney(row.netCents)}</td></tr>)}</tbody></table></div></section>
    </>}
  </section>;
}
