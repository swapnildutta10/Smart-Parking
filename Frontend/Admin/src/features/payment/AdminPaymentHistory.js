import React from "react";

const PAYMENT_STORAGE_KEY = "parknova-payment-history";

function readPayments() {
  try {
    const payments = JSON.parse(localStorage.getItem(PAYMENT_STORAGE_KEY) || "[]");
    return Array.isArray(payments) ? payments : [];
  } catch {
    return [];
  }
}

function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
}

function AdminPaymentHistory() {
  const [payments, setPayments] = React.useState(readPayments);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  React.useEffect(() => {
    function syncPayments(event) {
      if (!event || event.key === PAYMENT_STORAGE_KEY || event.key === null) {
        setPayments(readPayments());
      }
    }

    window.addEventListener("storage", syncPayments);
    return () => window.removeEventListener("storage", syncPayments);
  }, []);

  const searchTerm = query.trim().toLowerCase();
  const filteredPayments = payments.filter((payment) => {
    const matchesQuery = !searchTerm || [
      payment.customerName,
      payment.customerEmail,
      payment.id,
      payment.receiptNo,
      payment.transactionId,
      payment.bookingId,
      payment.spotId,
      payment.location,
      payment.method,
    ].some((value) => String(value || "").toLowerCase().includes(searchTerm));
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesQuery && matchesStatus;
  }).sort((first, second) => Number(second.paidAt || 0) - Number(first.paidAt || 0));

  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const refundedPayments = payments.filter((payment) => payment.status === "refunded");
  const netCollectedCents = payments.reduce((total, payment) => (
    total + (payment.status === "paid" ? Number(payment.amountCents || 0) : -Number(payment.amountCents || 0))
  ), 0);

  return (
    <section className="pn-admin-payments-page">
      <div className="pn-dash-topbar">
        <div>
          <p className="pn-dash-kicker">Transactions</p>
          <h1>Payment history</h1>
        </div>
        <span className="pn-capacity-value">{payments.length} records</span>
      </div>

      <div className="pn-admin-payment-notice">
        Payment details are demo records. The user and admin apps must share a browser origin for records to appear here.
      </div>

      <div className="pn-admin-payment-summary" aria-label="Payment totals">
        <article>
          <span>Paid transactions</span>
          <strong>{paidPayments.length}</strong>
        </article>
        <article>
          <span>Refunded</span>
          <strong>{refundedPayments.length}</strong>
        </article>
        <article>
          <span>Net collected</span>
          <strong>{formatMoney(netCollectedCents)}</strong>
        </article>
      </div>

      <div className="pn-admin-payment-toolbar">
        <label className="pn-admin-booking-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer, transaction, or booking"
            aria-label="Search payment history"
          />
        </label>
        <label className="pn-admin-payment-status">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
      </div>

      <div className="pn-admin-booking-table-wrap">
        <table className="pn-admin-booking-table pn-admin-payment-table">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Transaction</th>
              <th scope="col">Booking</th>
              <th scope="col">Method</th>
              <th scope="col">Amount</th>
              <th scope="col">Paid at</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <strong>{payment.customerName || "Customer"}</strong>
                  <small>{payment.customerEmail || "Email unavailable"}</small>
                </td>
                <td>
                  <strong>{payment.transactionId || payment.id}</strong>
                  <small>{payment.receiptNo || "No receipt"}</small>
                </td>
                <td>
                  <strong>{payment.bookingId}</strong>
                  <small>{payment.spotId} · {payment.location}</small>
                </td>
                <td><strong>{payment.method || "—"}</strong></td>
                <td><strong>{formatMoney(payment.amountCents)}</strong></td>
                <td><strong>{formatDateTime(payment.paidAt)}</strong></td>
                <td>
                  <span className={`pn-admin-payment-status-tag is-${payment.status}`}>
                    {payment.status || "unknown"}
                  </span>
                </td>
              </tr>
            ))}
            {filteredPayments.length === 0 && (
              <tr>
                <td className="pn-admin-bookings-empty" colSpan="7">
                  {payments.length === 0
                    ? "No payment records are available on this browser origin yet."
                    : "No payments match this search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pn-admin-booking-count" aria-live="polite">
        Showing {filteredPayments.length} of {payments.length} payment records
      </p>
    </section>
  );
}

export default AdminPaymentHistory;