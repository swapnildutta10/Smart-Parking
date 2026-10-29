import React from "react";

function PaymentPromoCode({ promoInput, promoMessage, processing, onChange, onApply }) {
  return (
    <>
        <div className="pn-pay-promo">
          <input value={promoInput} onChange={(event) => onChange(event.target.value)} placeholder="Promo code" aria-label="Promo code" disabled={processing} />
          <button type="button" disabled={processing} onClick={onApply}>Apply</button>
        </div>
        {promoMessage && <p className={`pn-pay-promo-note${promoMessage.ok ? " is-ok" : " is-bad"}`}>{promoMessage.text}</p>}
    </>
  );
}

export default PaymentPromoCode;
