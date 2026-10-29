import { API_URL } from "./apiConfig";
import { notifyAvailabilityChanged } from "./availabilityEvents";

export async function parkingRequest(path, { method = "GET", body, signal } = {}) {
  const token = localStorage.getItem("parknova-auth-token");
  const response = await fetch(`${API_URL}${path}`, {
    method, signal,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Parking service is unavailable. Please try again.");
  if ((method === "POST" && path === "/bookings")
    || (method === "PATCH" && /^\/bookings\/[^/]+\/(cancel|check-in)$/.test(path))) {
    notifyAvailabilityChanged({ reason: "booking-changed" });
  }
  return result;
}

export function bookingWindow(date, time, duration) {
  const startsAt = new Date(`${date}T${time}:00+05:30`);
  const endsAt = new Date(+startsAt + Number(duration) * 3600000);
  if (!Number.isFinite(+startsAt) || !Number.isFinite(+endsAt)) throw new Error("Choose a valid arrival date and time.");
  return { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() };
}

export function nextBookingSelection(now = Date.now()) {
  const arrival = Math.ceil((now + 60000) / (15 * 60000)) * 15 * 60000;
  const local = new Date(arrival + 330 * 60000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16), duration: 2 };
}
