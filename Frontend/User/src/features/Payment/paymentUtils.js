// Amounts are stored in integer paise to avoid floating point drift.

export const TAX_RATE = 0.05;
export const SERVICE_FEE_CENTS = 50;
export const PROMO_CODES = { PARKNOVA10: 0.1 }; // code -> fraction off the parking charge

export const PAYMENT_METHODS = [
  { key: "upi", label: "UPI" },
  { key: "card", label: "Card" },
  { key: "netbanking", label: "Net banking" },
  { key: "wallet", label: "Wallet" },
];
export const UPI_APPS = [
  { key: "gpay", label: "Google Pay", mark: "G", color: "#4285f4" },
  { key: "phonepe", label: "PhonePe", mark: "पे", color: "#8854d0" },
  { key: "paytm", label: "Paytm", mark: "P", color: "#00b9f1" },
  { key: "other", label: "Other UPI", mark: "↗", color: "#67c7a5" },
];
export const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank"];
export const WALLETS = ["Paytm", "PhonePe", "Amazon Pay"];

export function formatMoney(cents) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(cents) / 100).toFixed(2)}`;
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

/**
 * Display estimate using the saved booking amount, or the hourly parking rate.
 * Checkout always fetches an authoritative quote from the backend.
 */
export function calculateFee({ rate, duration, totalAmount, promoCode = "" }) {
  const perHourCents = Math.round(parseRate(rate) * 100);
  const hours = Number(duration) || 0;
  const baseCents = Number.isFinite(totalAmount) ? Math.round(totalAmount * 100) : perHourCents * Math.ceil(hours);

  const code = promoCode.trim().toUpperCase();
  const promoRate = PROMO_CODES[code] || 0;
  const discountCents = Math.round(baseCents * promoRate);
  const taxableCents = baseCents - discountCents + SERVICE_FEE_CENTS;
  const taxCents = Math.round(taxableCents * TAX_RATE);

  return {
    description: `${Math.ceil(hours)} billed hours`,
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

export function isBookingPaid(payments, bookingId) {
  return payments.some((payment) => payment.bookingId === bookingId && payment.status === "paid");
}
