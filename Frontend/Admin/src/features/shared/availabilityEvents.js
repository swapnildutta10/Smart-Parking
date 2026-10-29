const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const listeners = new Set();
let source = null;

export function subscribeToAvailability(callback) {
  listeners.add(callback);
  if (!source && typeof window.EventSource === "function") {
    source = new window.EventSource(`${API}/availability/events`);
    const refresh = () => { for (const listener of listeners) listener(); };
    source.addEventListener("availability-changed", refresh);
    source.onopen = refresh;
  }
  return () => {
    listeners.delete(callback);
    if (!listeners.size && source) { source.close(); source = null; }
  };
}
