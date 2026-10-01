import React from "react";
import "../../styles/payment.css";
import { downloadReceipt, getReceiptSections, printReceipt } from "./receiptUtils";

function PaymentReceipt({ payment, onClose }) {
  const { details, charges, total } = getReceiptSections(payment);

  React.useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pn-pay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="pn-pay-card pn-pay-receipt-wrap" role="dialog" aria-modal="true" aria-label="Payment receipt">
        <article className="pn-pay-paper">
          <header>
            <strong>ParkNova</strong>
            <span className={`pn-pay-stamp${payment.status === "refunded" ? " is-refunded" : ""}`}>
              {payment.status === "refunded" ? "Refunded" : "Paid"}
            </span>
          </header>
          <dl className="pn-pay-paper-rows">
            {details.map(([label, value]) => (<div key={label}><dt>{label}</dt><dd>{value}</dd></div>))}
          </dl>
          <dl className="pn-pay-paper-rows is-charges">
            {charges.map(([label, value]) => (<div key={label}><dt>{label}</dt><dd>{value}</dd></div>))}
            <div className="is-total"><dt>Total</dt><dd>{total}</dd></div>
          </dl>
        </article>
        <div className="pn-pay-actions">
          <button type="button" className="pn-pay-secondary" onClick={() => printReceipt(payment)}>Print</button>
          <button type="button" className="pn-pay-secondary" onClick={() => downloadReceipt(payment)}>Download</button>
          <button type="button" className="pn-pay-submit" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

export default PaymentReceipt;
