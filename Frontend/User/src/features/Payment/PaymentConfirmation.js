import React from "react";
import "../../styles/payment.css";
import { formatMoney } from "./paymentUtils";

function PaymentConfirmation({ payment, onViewReceipt, onClose }) {
  React.useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pn-pay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="pn-pay-card pn-pay-confirm" role="dialog" aria-modal="true" aria-labelledby="pn-pay-confirm-title">
        <span className="pn-pay-check" aria-hidden="true">✓</span>
        <h2 id="pn-pay-confirm-title">Payment successful</h2>
        <p className="pn-pay-confirm-amount">{formatMoney(payment.amountCents)}</p>
        <p>Your spot {payment.spotId} at {payment.location} is paid for.</p>
        <dl className="pn-pay-confirm-meta">
          <div><dt>Receipt no.</dt><dd>{payment.receiptNo}</dd></div>
          <div><dt>Transaction ID</dt><dd>{payment.transactionId}</dd></div>
          <div><dt>Paid with</dt><dd>{payment.method}</dd></div>
        </dl>
        <div className="pn-pay-actions">
          <button type="button" className="pn-pay-secondary" onClick={onViewReceipt}>View receipt</button>
          <button type="button" className="pn-pay-submit" onClick={onClose}>Done</button>
        </div>
      </section>
    </div>
  );
}

export default PaymentConfirmation;
