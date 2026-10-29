import React from "react";
import { subscribeToAvailability } from "../shared/availabilityEvents";
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
export const formatMoney = cents => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format((cents || 0) / 100);
export const indiaDate = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
export const STATUS_LABELS = { upcoming: "Upcoming", checked_in: "Checked in", completed: "Completed", cancelled: "Cancelled", no_show: "No-show" };
export function useAdminData(token, path) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    let pending = false, queued = false;
    async function load() {
      if (controller.signal.aborted) return;
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const response = await fetch(`${API}/admin/${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load dashboard data.");
        if (!controller.signal.aborted && !queued) { setData(result); setError(""); }
      } catch (err) { if (!controller.signal.aborted && !queued) setError(err.message); }
      finally {
        pending = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          if (queued) { queued = false; load(); }
        }
      }
    }
    load();
    const unsubscribe = subscribeToAvailability(load);
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); unsubscribe(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [token, path, revision]);
  return { data, loading, error, reload: () => setRevision(value => value + 1) };
}

export function downloadReport(report) {
  const rows = [
    ["ParkNova report", report.range.from, report.range.to], ["Timezone", report.range.timezone],
    ["Currency", "INR"], ["Payment note", "Recorded amounts only; no money collected"], [],
    ["Metric", "Value"], ["Bookings", report.totals.bookings], ["Payment records", report.totals.payments],
    ["Refund records", report.totals.refunds], ["Recorded amount (INR)", report.totals.grossCents / 100],
    ["Refund amount (INR)", report.totals.refundCents / 100], ["Net recorded amount (INR)", report.totals.netCents / 100],
    ["Booked parking value (INR)", report.totals.bookedAmountCents / 100], [],
    ["Booking status", "Count"], ...Object.entries(report.bookingStatuses).map(([status, count]) => [STATUS_LABELS[status], count]), [],
    ["Date", "Bookings by arrival", "Payment records", "Refund records", "Recorded INR", "Refund INR", "Net INR"],
    ...report.daily.map(row => [row.date, row.bookings, row.payments, row.refunds, row.grossCents / 100, row.refundCents / 100, row.netCents / 100]), [],
    ["Location", "Address", "Bookings", "Cancelled", "Booked parking value INR"],
    ...report.locations.map(row => [row.location, row.address, row.bookings, row.cancelled, row.bookedAmountCents / 100]),
  ];
  const quote = value => {
    let text = String(value ?? "");
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const url = URL.createObjectURL(new Blob(["\uFEFF", rows.map(row => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url;
  link.download = `parknova-report-${report.range.from}-to-${report.range.to}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
