import { API_URL } from "./apiConfig";

const EVENT = "parknova:availability-changed";
let source = null;
let subscribers = 0;

export function notifyAvailabilityChanged(detail = {}) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

export function subscribeToAvailability(callback) {
  const listener = () => callback();
  window.addEventListener(EVENT, listener);
  subscribers += 1;
  if (!source && typeof window.EventSource === "function") {
    source = new window.EventSource(`${API_URL}/availability/events`);
    source.addEventListener("availability-changed", event => {
      try { notifyAvailabilityChanged(JSON.parse(event.data)); }
      catch { notifyAvailabilityChanged(); }
    });
    // Refresh on initial connection and reconnection to recover missed changes.
    source.onopen = () => notifyAvailabilityChanged({ reason: "connected" });
  }
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    window.removeEventListener(EVENT, listener);
    subscribers -= 1;
    if (!subscribers && source) { source.close(); source = null; }
  };
}
