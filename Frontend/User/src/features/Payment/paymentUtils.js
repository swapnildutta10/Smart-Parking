// All money is handled in integer cents to avoid floating point drift.

export const TAX_RATE = 0.05;
export const SERVICE_FEE_CENTS = 50;
export const PROMO_CODES = { PARKNOVA10: 0.1 }; // code -> fraction off the parking charge

export const PAYMENT_METHODS = [
  { key: "upi", label: "UPI" },
  { key: "card", label: "Card" },
  { key: "netbanking", label: "Net banking" },
  { key: "wallet", label: "Wallet" },
];
export const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank"];
export const WALLETS = ["Paytm", "PhonePe", "Amazon Pay"];

export function formatMoney(cents) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export function formatDate(dateString) {
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function parseRate(rate) {
  if (typeof rate === "number") return rate;
  return Number.parseFloat(String(rate).replace(/[^\d.]/g, "")) || 0;
}

function makeId(prefix) {
  const time = Date.now().toString(36).toUpperCase().slice(-6);
  const salt = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `${prefix}-${time}${salt}`;
}

/**
 * Fee for one booking. `rate` is $/day, `duration` is hours.
 * Under 24h is prorated; 24h+ is billed per started day (same rule the
 * old estimate used).
 */
export function calculateFee({ rate, duration, promoCode = "" }) {
  const perDayCents = Math.round(parseRate(rate) * 100);
  const hours = Number(duration) || 0;
  const days = Math.ceil(hours / 24);
  const baseCents = hours >= 24 ? perDayCents * days : Math.round((perDayCents * hours) / 24);

  const code = promoCode.trim().toUpperCase();
  const promoRate = PROMO_CODES[code] || 0;
  const discountCents = Math.round(baseCents * promoRate);
  const taxableCents = baseCents - discountCents + SERVICE_FEE_CENTS;
  const taxCents = Math.round(taxableCents * TAX_RATE);

  return {
    description: hours >= 24
      ? `${days} ${days === 1 ? "day" : "days"} × ${formatMoney(perDayCents)}`
      : `${hours} ${hours === 1 ? "hr" : "hrs"} at ${formatMoney(perDayCents)}/day`,
    baseCents,
    discountCents,
    promoCode: promoRate ? code : "",
    serviceFeeCents: SERVICE_FEE_CENTS,
    taxCents,
    totalCents: taxableCents + taxCents,
  };
}

function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (double) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validatePayment(method, values) {
  const errors = {};
  if (method === "upi" && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(values.upiId.trim())) {
    errors.upiId = "Enter a valid UPI ID, like name@bank.";
  }
  if (method === "card") {
    const digits = values.cardNumber.replace(/\s/g, "");
    if (!/^\d{13,19}$/.test(digits) || !passesLuhn(digits)) errors.cardNumber = "Enter a valid card number.";
    const expiry = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(values.expiry);
    if (!expiry || new Date(2000 + Number(expiry[2]), Number(expiry[1]), 1) <= new Date()) {
      errors.expiry = "Enter a future date as MM/YY.";
    }
    if (!/^\d{3,4}$/.test(values.cvv)) errors.cvv = "Enter the 3 or 4 digit CVV.";
    if (values.cardName.trim().length < 2) errors.cardName = "Enter the name on the card.";
  }
  if (method === "netbanking" && !values.bank) errors.bank = "Choose your bank.";
  if (method === "wallet" && !values.wallet) errors.wallet = "Choose a wallet.";
  return errors;
}

/**
 * Simulated gateway. Replace the body with a call to your real provider
 * (Razorpay, Stripe, ...) — never send raw card numbers to your own server.
 * Test: any card ending 0002 (e.g. 4000 0000 0000 0002) is declined.
 */
export function processPayment({ method, values }) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const digits = values.cardNumber.replace(/\s/g, "");
      if (method === "card" && digits.endsWith("0002")) {
        resolve({ ok: false, message: "Your card was declined. Try another card or payment method." });
      } else {
        resolve({ ok: true, transactionId: makeId("TXN") });
      }
    }, 1600);
  });
}

function describeMethod(method, values) {
  if (method === "upi") return `UPI · ${values.upiId.trim()}`;
  if (method === "card") return `Card ending ${values.cardNumber.replace(/\s/g, "").slice(-4)}`;
  if (method === "netbanking") return `Net banking · ${values.bank}`;
  return `Wallet · ${values.wallet}`;
}

// Snapshots the booking so the receipt stays correct even if the booking changes later.
export function createPayment({ booking, fee, method, values, transactionId }) {
  return {
    id: makeId("PAY"),
    receiptNo: makeId("RCT"),
    transactionId,
    bookingId: booking.id,
    spotId: booking.spotId,
    location: booking.location,
    vehicle: booking.vehicle,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    fee,
    amountCents: fee.totalCents,
    method: describeMethod(method, values),
    status: "paid", // "paid" | "refunded"
    paidAt: Date.now(),
  };
}

export function isBookingPaid(payments, bookingId) {
  return payments.some((payment) => payment.bookingId === bookingId && payment.status === "paid");
}
