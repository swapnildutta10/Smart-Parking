import React from "react";
import { formatMoney } from "./paymentUtils";

function PaymentSummary({ booking, fee, children }) {
  return (
    <section className="pn-pay-order" aria-label="Booking summary">
      <div className="pn-pay-amount-banner">
        <div><span>Total to pay</span><strong>{formatMoney(fee.totalCents)}</strong><small>Includes service fee &amp; tax</small></div>
        <span className="pn-pay-spot"><small>YOUR SPOT</small><b>{booking.spotId}</b></span>
      </div>
      <div className="pn-pay-section-label">Booking summary</div>
      <div className="pn-pay-lines" aria-label="Fee breakdown">
        <div><span>Parking ({fee.description})</span><b>{formatMoney(fee.baseCents)}</b></div>
        {fee.discountCents > 0 && <div className="is-discount"><span>Promo {fee.promoCode}</span><b>{formatMoney(-fee.discountCents)}</b></div>}
        <div><span>Service fee</span><b>{formatMoney(fee.serviceFeeCents)}</b></div>
        <div><span>Tax</span><b>{formatMoney(fee.taxCents)}</b></div>
        <div className="is-total"><span>Total</span><b>{formatMoney(fee.totalCents)}</b></div>
      </div>

      {children}

    </section>
  );
}

export default PaymentSummary;
