import React from "react";
import { render, screen, fireEvent, act, within, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminDashboard from "./AdminDashboard";

const booking = { id: `PN-${"A".repeat(24)}`, inventoryId: "inventory-1", spotId: "A1", userName: "Live Customer", email: "customer@example.com", location: "Live Garage", area: "Central", vehicle: "Car", plate: "WB20AB1234", date: "2026-10-30", time: "10:00", duration: 1, status: "upcoming", timeline: [] };
function overview(rows) {
  const upcoming = rows.filter(row => row.status === "upcoming").length;
  return { generatedAt: "2026-10-29T10:00:00Z", timezone: "Asia/Kolkata", year: 2026,
    totals: { totalUsers: 1, totalSlots: 3, availableSlots: 3 - upcoming, occupiedSlots: upcoming, availablePercent: Math.round((3 - upcoming) / 3 * 100), locations: 1, inventory: 1, activeBookings: upcoming, totalBookings: rows.length, openSupportRequests: 0, monthlyGrossCents: 0 },
    bookingStatuses: { upcoming, checked_in: 0, completed: 0, cancelled: rows.length - upcoming, no_show: 0 },
    monthly: Array.from({ length: 12 }, (_, i) => ({ month: String(i + 1), grossCents: 0, refundCents: 0 })), topLocations: [], recentBookings: rows };
}

test("dashboard and booking history react to booking/cancellation broadcasts without timer ticks or reload", async () => {
  const originalFetch = global.fetch, originalSource = window.EventSource;
  let rows = [], stream;
  window.EventSource = jest.fn().mockImplementation(() => {
    stream = { handlers: {}, addEventListener: (event, callback) => { stream.handlers[event] = callback; }, close: jest.fn() };
    return stream;
  });
  global.fetch = jest.fn(async url => ({ ok: true, json: async () => {
    if (url.endsWith('/admin/dashboard')) return overview(rows);
    if (url.endsWith('/admin/bookings')) return { bookings: rows };
    if (url.endsWith('/admin/parking')) return { parking: [] };
    if (url.endsWith('/admin/locations')) return { locations: [] };
    if (url.endsWith('/admin/users')) return [];
    throw new Error(`Unexpected request: ${url}`);
  } }));
  try {
    const { unmount } = render(<AdminDashboard token="admin-token" />);
    await screen.findByText("0 total bookings");
    expect(window.EventSource).toHaveBeenCalledTimes(1);
    rows = [booking];
    await act(async () => { stream.handlers['availability-changed']({ data: JSON.stringify({ reason: 'reserved' }) }); });
    expect(screen.getByText("1 total bookings")).toBeInTheDocument();
    expect(within(screen.getByText("Active reservations").closest('.pn-stat-card')).getByText("1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage bookings' }));
    expect(screen.getByText(booking.id)).toBeInTheDocument();
    rows = [{ ...booking, status: 'cancelled' }];
    await act(async () => { stream.handlers['availability-changed']({ data: JSON.stringify({ reason: 'cancelled' }) }); });
    expect(within(screen.getByText(booking.id).closest('tr')).getByText('Cancelled')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard', exact: true }));
    await screen.findByText("1 total bookings");
    expect(within(screen.getByText("Active reservations").closest('.pn-stat-card')).getByText("0")).toBeInTheDocument();
    const before = global.fetch.mock.calls.length;
    await act(async () => { stream.onopen(); });
    expect(global.fetch.mock.calls.length).toBeGreaterThan(before);
    expect(window.EventSource).toHaveBeenCalledTimes(1);
    unmount(); expect(stream.close).toHaveBeenCalledTimes(1);
  } finally { cleanup(); global.fetch = originalFetch; window.EventSource = originalSource; }
});

test("a reservation event during a pending history request queues a fresh history read", async () => {
  const originalFetch = global.fetch, originalSource = window.EventSource;
  let stream, finishHistory, historyCalls = 0;
  window.EventSource = jest.fn().mockImplementation(() => {
    stream = { handlers: {}, addEventListener: (event, callback) => { stream.handlers[event] = callback; }, close: jest.fn() };
    return stream;
  });
  global.fetch = jest.fn(async url => {
    if (url.endsWith('/admin/bookings') && historyCalls++ === 0) return new Promise(resolve => { finishHistory = () => resolve({ ok: true, json: async () => ({ bookings: [] }) }); });
    return { ok: true, json: async () => {
      if (url.endsWith('/admin/dashboard')) return overview([]);
      if (url.endsWith('/admin/bookings')) return { bookings: [booking] };
      if (url.endsWith('/admin/parking')) return { parking: [] };
      if (url.endsWith('/admin/locations')) return { locations: [] };
      return [];
    } };
  });
  try {
    render(<AdminDashboard token="admin-token" />);
    await screen.findByText("0 total bookings");
    await act(async () => {
      stream.handlers['availability-changed']();
      finishHistory();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Manage bookings' }));
    expect(await screen.findByText(booking.id)).toBeInTheDocument();
    expect(historyCalls).toBe(2);
  } finally { cleanup(); global.fetch = originalFetch; window.EventSource = originalSource; }
});
