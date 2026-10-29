import React from "react";
import { BANKS } from "./paymentUtils";
import UpiAppPicker from "./UpiAppPicker";

function PaymentMethodPicker({ method, values, errors, processing, onMethodChange, onValuesChange }) {
  return (
    <section className="pn-pay-selection" aria-label="Choose how to pay">
      <fieldset className="pn-pay-method-picker" disabled={processing}>
        <legend>Payment method</legend>
        <div className="pn-pay-methods">
          {[{ key: "upi", label: "UPI" }, { key: "netbanking", label: "Net banking" }].map((option) => (
            <button key={option.key} type="button" className={method === option.key ? "active" : ""}
              aria-label={option.label} aria-pressed={method === option.key} onClick={() => { onMethodChange(option.key); }}>
              <span className="pn-pay-method-icon" aria-hidden="true">{option.key === "upi" ? "↗" : "▥"}</span>
              <span className="pn-pay-method-copy"><strong>{option.label}</strong><small>{option.key === "upi" ? "Choose your UPI app" : "Choose your bank"}</small></span>
              <span className="pn-pay-method-dot" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="pn-pay-fields">
          {method === "upi" ? (
            <>
              <UpiAppPicker selectedApp={values.upiApp} onSelect={(upiApp) => onValuesChange({ ...values, upiApp })} />
              <label className="pn-pay-field" htmlFor="pn-pay-upi">UPI ID
                <input id="pn-pay-upi" aria-label="UPI ID" value={values.upiId} placeholder="name@bank" autoCapitalize="none" spellCheck={false}
                  aria-invalid={Boolean(errors.upiId)} aria-describedby={errors.upiId ? "pn-pay-upi-error" : undefined}
                  onChange={(event) => onValuesChange({ ...values, upiId: event.target.value })} />
                {errors.upiId && <span id="pn-pay-upi-error" className="pn-pay-error" role="alert">{errors.upiId}</span>}
              </label>
              <p className="pn-pay-upi-hint">Enter the UPI ID linked to your selected app.</p>
            </>
          ) : (
            <label className="pn-pay-field" htmlFor="pn-pay-bank">Bank
              <select id="pn-pay-bank" aria-label="Bank" value={values.bank} aria-invalid={Boolean(errors.bank)}
                aria-describedby={errors.bank ? "pn-pay-bank-error" : undefined}
                onChange={(event) => onValuesChange({ ...values, bank: event.target.value })}>
                <option value="">Choose your bank</option>
                {BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              </select>
              {errors.bank && <span id="pn-pay-bank-error" className="pn-pay-error" role="alert">{errors.bank}</span>}
            </label>
          )}
        </div>
      </fieldset>
    </section>
  );
}

export default PaymentMethodPicker;
