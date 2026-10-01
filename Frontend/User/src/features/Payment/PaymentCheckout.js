import React from "react";
import "../../styles/payment.css";
import {
  BANKS, PAYMENT_METHODS, PROMO_CODES, WALLETS,
  calculateFee, createPayment, formatDate, formatMoney, processPayment, validatePayment,
} from "./paymentUtils";

const EMPTY_VALUES = { upiId: "", cardName: "", cardNumber: "", expiry: "", cvv: "", bank: "", wallet: "" };

const formatCardNumber = (value) => value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

function Field({ label, error, children }) {
  return (
    <label className="pn-pay-field">
      <span>{label}</span>
      {children}
      {error && <small className="pn-pay-error" role="alert">{error}</small>}
    </label>
  );
}

function PaymentCheckout({ booking, onClose, onPaid }) {
  const [method, setMethod] = React.useState("upi");
  const [values, setValues] = React.useState(EMPTY_VALUES);
  const [errors, setErrors] = React.useState({});
  const [promoInput, setPromoInput] = React.useState("");
  const [promoCode, setPromoCode] = React.useState("");
  const [promoMessage, setPromoMessage] = React.useState(null);
  const [processing, setProcessing] = React.useState(false);
  const [failure, setFailure] = React.useState("");
  const mounted = React.useRef(true);

  const fee = React.useMemo(
    () => calculateFee({ rate: booking.rate, duration: booking.duration, promoCode }),
    [booking, promoCode],
  );

  React.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  React.useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape" && !processing) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [processing, onClose]);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) { setPromoCode(""); setPromoMessage(null); return; }
    if (PROMO_CODES[code]) {
      setPromoCode(code);
      setPromoMessage({ ok: true, text: `${code} applied: ${Math.round(PROMO_CODES[code] * 100)}% off parking` });
    } else {
      setPromoCode("");
      setPromoMessage({ ok: false, text: "That code isn't valid." });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (processing) return;
    const found = validatePayment(method, values);
    setErrors(found);
    setFailure("");
    if (Object.keys(found).length > 0) return;

    setProcessing(true);
    const result = await processPayment({ method, values });
    if (!mounted.current) return;
    if (result.ok) {
      onPaid(createPayment({ booking, fee, method, values, transactionId: result.transactionId }));
    } else {
      setProcessing(false);
      setFailure(result.message);
    }
  }

  return (
    <div className="pn-pay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !processing) onClose(); }}>
      <form className="pn-pay-card" role="dialog" aria-modal="true" aria-labelledby="pn-pay-title" onSubmit={handleSubmit} noValidate>
        <header className="pn-pay-head">
          <div>
            <h2 id="pn-pay-title">Pay for your booking</h2>
            <p>{booking.location} · {booking.spotId} · {formatDate(booking.date)} at {booking.time}</p>
          </div>
          <button type="button" className="pn-pay-close" onClick={onClose} disabled={processing} aria-label="Close">×</button>
        </header>

        <div className="pn-pay-lines" aria-label="Fee breakdown">
          <div><span>Parking ({fee.description})</span><b>{formatMoney(fee.baseCents)}</b></div>
          {fee.discountCents > 0 && <div className="is-discount"><span>Promo {fee.promoCode}</span><b>{formatMoney(-fee.discountCents)}</b></div>}
          <div><span>Service fee</span><b>{formatMoney(fee.serviceFeeCents)}</b></div>
          <div><span>Tax</span><b>{formatMoney(fee.taxCents)}</b></div>
          <div className="is-total"><span>Total</span><b>{formatMoney(fee.totalCents)}</b></div>
        </div>

        <div className="pn-pay-promo">
          <input
            value={promoInput}
            onChange={(event) => setPromoInput(event.target.value)}
            placeholder="Promo code"
            aria-label="Promo code"
          />
          <button type="button" onClick={applyPromo}>Apply</button>
        </div>
        {promoMessage && <p className={`pn-pay-promo-note${promoMessage.ok ? " is-ok" : " is-bad"}`}>{promoMessage.text}</p>}

        <div className="pn-pay-methods" role="radiogroup" aria-label="Payment method">
          {PAYMENT_METHODS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={method === item.key}
              className={method === item.key ? "active" : ""}
              onClick={() => { setMethod(item.key); setErrors({}); setFailure(""); }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="pn-pay-fields">
          {method === "upi" && (
            <Field label="UPI ID" error={errors.upiId}>
              <input value={values.upiId} onChange={(e) => update("upiId", e.target.value)} placeholder="name@bank" autoComplete="off" />
            </Field>
          )}
          {method === "card" && (
            <>
              <Field label="Name on card" error={errors.cardName}>
                <input value={values.cardName} onChange={(e) => update("cardName", e.target.value)} autoComplete="cc-name" />
              </Field>
              <Field label="Card number" error={errors.cardNumber}>
                <input
                  value={values.cardNumber}
                  onChange={(e) => update("cardNumber", formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </Field>
              <div className="pn-pay-fields-row">
                <Field label="Expiry" error={errors.expiry}>
                  <input value={values.expiry} onChange={(e) => update("expiry", formatExpiry(e.target.value))} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" />
                </Field>
                <Field label="CVV" error={errors.cvv}>
                  <input value={values.cvv} onChange={(e) => update("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" inputMode="numeric" type="password" autoComplete="cc-csc" />
                </Field>
              </div>
            </>
          )}
          {method === "netbanking" && (
            <Field label="Bank" error={errors.bank}>
              <select value={values.bank} onChange={(e) => update("bank", e.target.value)}>
                <option value="">Choose your bank</option>
                {BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              </select>
            </Field>
          )}
          {method === "wallet" && (
            <Field label="Wallet" error={errors.wallet}>
              <select value={values.wallet} onChange={(e) => update("wallet", e.target.value)}>
                <option value="">Choose a wallet</option>
                {WALLETS.map((wallet) => <option key={wallet} value={wallet}>{wallet}</option>)}
              </select>
            </Field>
          )}
        </div>

        {failure && <p className="pn-pay-failure" role="alert">{failure}</p>}

        <button className="pn-pay-submit" type="submit" disabled={processing}>
          {processing ? (<><i className="pn-pay-spinner" aria-hidden="true" /> Processing payment…</>) : `Pay ${formatMoney(fee.totalCents)}`}
        </button>
        <p className="pn-pay-demo-note">Demo mode: no real money is charged.</p>
      </form>
    </div>
  );
}

export default PaymentCheckout;
