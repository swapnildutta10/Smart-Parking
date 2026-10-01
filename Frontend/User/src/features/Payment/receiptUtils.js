import { TAX_RATE, formatDate, formatDateTime, formatMoney } from "./paymentUtils";

// One source of truth for what a receipt says; used by the on-screen
// receipt and by the printable / downloadable HTML file.
export function getReceiptSections(payment) {
  const { fee } = payment;
  const details = [
    ["Receipt no.", payment.receiptNo],
    ["Paid on", formatDateTime(payment.paidAt)],
    ["Booking", payment.bookingId],
    ["Location", payment.location],
    ["Spot", `${payment.spotId} · ${payment.vehicle}`],
    ["Arrival", `${formatDate(payment.date)} at ${payment.time}`],
    ["Payment method", payment.method],
    ["Transaction ID", payment.transactionId],
  ];
  const charges = [[`Parking (${fee.description})`, formatMoney(fee.baseCents)]];
  if (fee.discountCents > 0) charges.push([`Promo ${fee.promoCode}`, formatMoney(-fee.discountCents)]);
  charges.push(["Service fee", formatMoney(fee.serviceFeeCents)]);
  charges.push([`Tax (${Math.round(TAX_RATE * 100)}%)`, formatMoney(fee.taxCents)]);
  return { details, charges, total: formatMoney(payment.amountCents) };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

export function buildReceiptHtml(payment) {
  const { details, charges, total } = getReceiptSections(payment);
  const rows = (items) => items
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("");
  const status = payment.status === "refunded" ? "REFUNDED" : "PAID";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Receipt ${escapeHtml(payment.receiptNo)}</title>
<style>
  body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#1b1c29;max-width:560px;margin:32px auto;padding:0 20px}
  h1{margin:0;font-size:22px} .sub{color:#666;margin:4px 0 20px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  td{padding:7px 0;border-bottom:1px dashed #ccc;font-size:14px;vertical-align:top}
  td:last-child{text-align:right;font-variant-numeric:tabular-nums}
  .total td{font-size:18px;font-weight:700;border-bottom:0;border-top:2px solid #1b1c29}
  .stamp{display:inline-block;border:2px solid #1b1c29;padding:2px 10px;font-weight:700;letter-spacing:.08em;font-size:12px}
  footer{margin-top:24px;color:#666;font-size:12px}
</style></head><body>
<h1>ParkNova</h1><p class="sub">Parking payment receipt</p>
<p><span class="stamp">${status}</span></p>
<table>${rows(details)}</table>
<table>${rows(charges)}<tr class="total"><td>Total</td><td>${escapeHtml(total)}</td></tr></table>
<footer>Questions? support@parknova.com</footer>
</body></html>`;
}

export function downloadReceipt(payment) {
  const blob = new Blob([buildReceiptHtml(payment)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payment.receiptNo}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Prints through a hidden iframe so popup blockers can't interfere.
export function printReceipt(payment) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0";
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  };
  frame.srcdoc = buildReceiptHtml(payment);
  document.body.appendChild(frame);
}
