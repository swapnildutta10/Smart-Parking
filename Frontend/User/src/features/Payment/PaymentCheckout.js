import React from "react";
import useDialogFocus from "../shared/useDialogFocus";
import "../../styles/payment.css";
import { validatePayment } from "./paymentUtils";
import { parkingRequest } from "../parkingSpot/parkingApi";
import { PaymentCheckoutHeader, PaymentCheckoutFooter } from "./PaymentCheckoutLayout";
import PaymentSummary from "./PaymentSummary";
import PaymentPromoCode from "./PaymentPromoCode";
import PaymentMethodPicker from "./PaymentMethodPicker";

function PaymentCheckout({ booking, onClose, onPaid }) {
  const [promoInput, setPromoInput] = React.useState("");
  const [promoCode, setPromoCode] = React.useState("");
  const [promoMessage, setPromoMessage] = React.useState(null);
  const [processing, setProcessing] = React.useState(false);
  const [failure, setFailure] = React.useState("");
  const [method, setMethod] = React.useState("upi");
  const [values, setValues] = React.useState({ upiId: "", upiApp: "other", bank: "" });
  const [errors, setErrors] = React.useState({});
  const submitted = React.useRef(false);
  const dialogRef = useDialogFocus();

  const [quote, setQuote] = React.useState(null);
  const [quoteLoading, setQuoteLoading] = React.useState(true);
  React.useEffect(() => {
    const controller = new AbortController();
    setQuoteLoading(true);
    setFailure("");
    parkingRequest(`/bookings/${encodeURIComponent(booking.id)}/payment-quote?promo_code=${encodeURIComponent(promoCode)}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setQuote(result); })
      .catch(error => { if (!controller.signal.aborted) { setQuote(null); setFailure(error.message); } })
      .finally(() => { if (!controller.signal.aborted) setQuoteLoading(false); });
    return () => controller.abort();
  }, [booking.id, promoCode]);
  const fee = quote?.fee;

  React.useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape" && !processing) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [processing, onClose]);

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (code === "PARKNOVA10") {
      setPromoCode(code);
      setPromoMessage({ ok: true, text: "PARKNOVA10 applied: 10% off parking" });
    } else if (!code) {
      setPromoCode("");
      setPromoMessage(null);
    } else {
      setPromoCode("");
      setPromoMessage({ ok: false, text: "That code isn't valid." });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitted.current || quoteLoading || !quote?.enabled) return;
    const nextErrors = validatePayment(method, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => dialogRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    submitted.current = true;
    setProcessing(true);
    setFailure("");
    try {
      const { payment } = await parkingRequest(`/bookings/${encodeURIComponent(booking.id)}/test-payment`, {
        method: "POST", body: { method, upiId: values.upiId, upiApp: values.upiApp, bank: values.bank, promoCode },
      });
      await onPaid(payment);
    } catch (error) {
      setFailure(error.message || "The payment could not be saved. Please try again.");
      submitted.current = false;
      setProcessing(false);
    }
  }

  return (
    <div className="pn-pay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !processing) onClose(); }}>
      <form ref={dialogRef} className="pn-pay-card pn-pay-checkout" role="dialog" aria-modal="true" aria-labelledby="pn-pay-title" onSubmit={handleSubmit}>
        <PaymentCheckoutHeader booking={booking} processing={processing} onClose={onClose} />

        <div className="pn-pay-layout">
          {fee && <PaymentSummary booking={booking} fee={fee}>
            <PaymentPromoCode promoInput={promoInput} promoMessage={promoMessage} processing={processing} onChange={setPromoInput} onApply={applyPromo} />
          </PaymentSummary>}
          {quoteLoading && <p role="status">Loading booking total…</p>}
          <PaymentMethodPicker method={method} values={values} errors={errors} processing={processing}
            onMethodChange={(nextMethod) => { setMethod(nextMethod); setErrors({}); }} onValuesChange={setValues} />
          <PaymentCheckoutFooter fee={fee} processing={processing} disabled={quoteLoading || !quote?.enabled}
            failure={failure || (quote && !quote.enabled ? "Payments are disabled on the server." : "")} />
        </div>
      </form>
    </div>
  );
}

export default PaymentCheckout;

