import { parkingRequest } from "./parkingApi";
import { subscribeToAvailability } from "./availabilityEvents";

test("successful bookings and cancellations notify the page immediately; failed requests do not", async () => {
  const originalFetch = global.fetch;
  const originalSource = window.EventSource;
  window.EventSource = undefined;
  const listener = jest.fn();
  const unsubscribe = subscribeToAvailability(listener);
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ booking: { id: "PN-1" } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ booking: { status: "cancelled" } }) })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "No spaces remain" }) });
  try {
    await parkingRequest("/bookings", { method: "POST", body: {} });
    expect(listener).toHaveBeenCalledTimes(1);
    await parkingRequest("/bookings/PN-1/cancel", { method: "PATCH" });
    expect(listener).toHaveBeenCalledTimes(2);
    await expect(parkingRequest("/bookings", { method: "POST", body: {} })).rejects.toThrow("No spaces remain");
    expect(listener).toHaveBeenCalledTimes(2);
  } finally { unsubscribe(); global.fetch = originalFetch; window.EventSource = originalSource; }
});
