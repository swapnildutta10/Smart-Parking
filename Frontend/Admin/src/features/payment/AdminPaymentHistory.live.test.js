import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act, within, cleanup } from "@testing-library/react";
import AdminPaymentHistory from "./AdminPaymentHistory";

const payment = { id: 'PAY-LIVE-1', receiptNo: 'RCT-LIVE-1', transactionId: 'TXN-LIVE-1', bookingId: 'PN-LIVE-1', spotId: 'A1', location: 'Live Garage', customerName: 'Live Customer', customerEmail: 'live@example.com', method: 'UPI', status: 'paid', amountCents: 1250, paidAt: Date.now() };

test('payment and refund events update history and totals immediately without losing filters', async () => {
  const originalFetch = global.fetch, originalSource = window.EventSource;
  let payments = [], stream;
  window.EventSource = jest.fn().mockImplementation(() => {
    stream = { handlers: {}, addEventListener: (type, callback) => { stream.handlers[type] = callback; }, close: jest.fn() };
    return stream;
  });
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ payments }) }));
  try {
    const { unmount } = render(<AdminPaymentHistory token="admin-token" />);
    await screen.findByText('0 records');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search payment history' }), { target: { value: 'Live Customer' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'paid' } });
    payments = [payment];
    await act(async () => { stream.handlers['availability-changed'](); });
    expect(screen.getByText(payment.transactionId)).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('Live Customer');
    expect(screen.getByRole('combobox')).toHaveValue('paid');
    expect(within(screen.getByText('Paid transactions').closest('article')).getByText('1')).toBeInTheDocument();
    payments = [{ ...payment, status: 'refunded' }];
    await act(async () => { stream.handlers['availability-changed'](); });
    expect(screen.queryByText(payment.transactionId)).not.toBeInTheDocument();
    expect(within(screen.getByText('Paid transactions').closest('article')).getByText('0')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'refunded' } });
    expect(screen.getByText(payment.transactionId)).toBeInTheDocument();
    const row = screen.getByText(payment.transactionId).closest('tr');
    expect(within(row).getByText('refunded')).toBeInTheDocument();
    expect(within(screen.getByText('Net amount').closest('article')).getByText('₹0.00')).toBeInTheDocument();
    const calls = global.fetch.mock.calls.length;
    await act(async () => { stream.onopen(); });
    expect(global.fetch.mock.calls.length).toBe(calls + 1);
    unmount(); expect(stream.close).toHaveBeenCalledTimes(1);
  } finally { cleanup(); global.fetch = originalFetch; window.EventSource = originalSource; }
});

test('refund event during a pending read suppresses the stale paid result', async () => {
  const originalFetch = global.fetch, originalSource = window.EventSource;
  let stream, finishInitial;
  window.EventSource = jest.fn().mockImplementation(() => {
    stream = { handlers: {}, addEventListener: (type, callback) => { stream.handlers[type] = callback; }, close: jest.fn() };
    return stream;
  });
  global.fetch = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finishInitial = () => resolve({ ok: true, json: async () => ({ payments: [payment] }) }); }))
    .mockResolvedValue({ ok: true, json: async () => ({ payments: [{ ...payment, status: 'refunded' }] }) });
  try {
    render(<AdminPaymentHistory token="admin-token" />);
    await act(async () => { stream.handlers['availability-changed'](); finishInitial(); });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(within(screen.getByText(payment.transactionId).closest('tr')).getByText('refunded')).toBeInTheDocument();
  } finally { cleanup(); global.fetch = originalFetch; window.EventSource = originalSource; }
});
