import React from "react";
import "../../styles/payment.css";
import { calculateFee, formatDate, formatDateTime, formatMoney, isBookingPaid } from "../Payment/paymentUtils";

function PaymentHistory({ bookings, payments, onPay, onViewReceipt }) {
  const dueBookings = bookings
    .filter((booking) => booking.status !== "cancelled" && !isBookingPaid(payments, booking.id))
    .sort((first, second) => `${first.date}${first.time}`.localeCompare(`${second.date}${second.time}`));
  const sortedPayments = [...payments].sort((first, second) => second.paidAt - first.paidAt);

  const totalPaidCents = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const dueCents = dueBookings.reduce(
    (sum, booking) => sum + calculateFee({ rate: booking.rate, duration: booking.duration }).totalCents,
    0,
  );

  return (
    <section className="pn-user-panel pn-user-feature-page">
      <div className="pn-user-panel-heading">
        <div>
          <h2>Payment history</h2>
          <p>Pay for bookings and keep your receipts</p>
        </div>
      </div>
      <p className="pn-user-feature-notice">Demo mode: payments are simulated and no real money is charged.</p>

      <div className="pn-pay-summary">
        <div><small>Total paid</small><strong>{formatMoney(totalPaidCents)}</strong></div>
        <div><small>Due now</small><strong>{formatMoney(dueCents)}</strong></div>
      </div>

      {dueBookings.length > 0 && (
        <>
          <h3 className="pn-pay-section-title">Awaiting payment</h3>
          <div className="pn-user-payment-list">
            {dueBookings.map((booking) => {
              const fee = calculateFee({ rate: booking.rate, duration: booking.duration });
              return (
                <article className="pn-user-payment-row" key={booking.id}>
                  <span className="pn-user-payment-icon" aria-hidden="true">$</span>
                  <div className="pn-user-payment-copy">
                    <strong>{booking.location}</strong>
                    <small>{booking.id} · {booking.spotId} · {formatDate(booking.date)} at {booking.time}</small>
                  </div>
                  <div className="pn-pay-row-end">
                    <span className="pn-user-payment-amount">{formatMoney(fee.totalCents)}</span>
                    <button type="button" className="pn-pay-action" onClick={() => onPay(booking)}>Pay now</button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {sortedPayments.length > 0 && (
        <>
          <h3 className="pn-pay-section-title">Payments</h3>
          <div className="pn-user-payment-list">
            {sortedPayments.map((payment) => (
              <article className="pn-user-payment-row" key={payment.id}>
                <span className="pn-user-payment-icon" aria-hidden="true">✓</span>
                <div className="pn-user-payment-copy">
                  <strong>{payment.location}</strong>
                  <small>{payment.receiptNo} · {payment.method} · {formatDateTime(payment.paidAt)}</small>
                </div>
                <div className="pn-pay-row-end">
                  <span className="pn-user-payment-amount">{formatMoney(payment.amountCents)}</span>
                  <span className={`pn-pay-badge${payment.status === "refunded" ? " is-refunded" : ""}`}>
                    {payment.status === "refunded" ? "Refunded" : "Paid"}
                  </span>
                  <button type="button" className="pn-pay-action is-ghost" onClick={() => onViewReceipt(payment)}>Receipt</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {dueBookings.length === 0 && sortedPayments.length === 0 && (
        <div className="pn-user-feature-empty">
          <h3>No payments yet</h3>
          <p>Book a spot and it will show up here, ready to pay.</p>
        </div>
      )}
    </section>
  );
}

export default PaymentHistory;
