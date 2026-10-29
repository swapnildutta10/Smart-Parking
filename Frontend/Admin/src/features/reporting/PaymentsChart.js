import React from "react";
import { formatMoney } from "./reportingApi";

export default function PaymentsChart({ monthly }) {
  const height = 172, top = 18, bottom = top + height, width = 650, left = 75;
  const maximum = Math.max(100, ...monthly.flatMap(row => [row.grossCents, row.refundCents]));
  const y = value => bottom - value / maximum * height;
  const group = width / Math.max(monthly.length, 1);
  return <svg className="pn-monthly-chart" viewBox="0 0 750 240" role="img" aria-label="Monthly recorded payment and refund amounts in rupees">
    {[0, 0.25, 0.5, 0.75, 1].map(fraction => <g key={fraction}><line x1={left} y1={y(maximum * fraction)} x2={left + width} y2={y(maximum * fraction)} /><text x={left - 6} y={y(maximum * fraction) + 4} textAnchor="end">{new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(maximum * fraction / 100)}</text></g>)}
    {monthly.map((row, i) => {
      const center = left + group * (i + 0.5);
      return <g key={row.month}><title>{row.month}: recorded {formatMoney(row.grossCents)}, refunded {formatMoney(row.refundCents)}</title>
        <rect className="pn-chart-revenue" x={center - 14} y={y(row.grossCents)} width={12} height={bottom - y(row.grossCents)} rx={3} />
        <rect className="pn-chart-expense" x={center + 2} y={y(row.refundCents)} width={12} height={bottom - y(row.refundCents)} rx={3} />
        <text className="pn-chart-month" x={center} y={222} textAnchor="middle">{row.month}</text>
      </g>;
    })}
  </svg>;
}
