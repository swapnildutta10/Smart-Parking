import React from "react";
import { formatDate, formatMoney } from "./paymentUtils";

export function PaymentCheckoutHeader({ booking, processing, onClose }) {
  return (
    <header className="pn-pay-head">
      <div>
        <span className="pn-pay-eyebrow">PARKNOVA / CHECKOUT</span>
        <h2 id="pn-pay-title">One step to your spot.</h2>
        <p>{booking.location} · {booking.spotId} · {formatDate(booking.date)} at {booking.time}</p>
      </div>
      <button type="button" className="pn-pay-close" onClick={onClose} disabled={processing} aria-label="Close">×</button>
    </header>
  );
}

export function PaymentCheckoutFooter({ fee, processing, disabled, failure }) {
  return (
    <footer className="pn-pay-checkout-footer">
      <p className="pn-pay-note">No money is charged. Your payment record and receipt will be saved to your account.</p>
      {failure && <p className="pn-pay-failure" role="alert">{failure}</p>}
      <button className="pn-pay-submit" type="submit" disabled={processing || disabled || !fee}>
        {processing ? <><i className="pn-pay-spinner" aria-hidden="true" /> Saving payment...</> : `Complete payment ${fee ? formatMoney(fee.totalCents) : ""}`}
      </button>
    </footer>
  );
}
