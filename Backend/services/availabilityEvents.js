const crypto = require('node:crypto');
const clients = new Set();
const boot = crypto.randomUUID();
let revision = 0;

function send(res, event, payload) {
  if (res.destroyed || res.writableEnded) return;
  if (res.writableLength > 65536) { res.destroy(); return; }
  res.write(`id: ${boot}:${revision}\nevent: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}
function publishAvailabilityChange(inventoryId, reason) {
  revision += 1;
  const payload = { inventoryId, reason, updatedAt: new Date().toISOString() };
  for (const res of clients) {
    try { send(res, 'availability-changed', payload); } catch { res.destroy(); }
  }
}
function streamAvailability(req, res) {
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 1500\n\n');
  clients.add(res);
  send(res, 'connected', { updatedAt: new Date().toISOString() });
  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) res.write(': heartbeat\n\n');
  }, 20000);
  heartbeat.unref();
  res.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
}
function closeAvailabilityStreams() {
  for (const res of clients) res.end();
  clients.clear();
}
module.exports = { publishAvailabilityChange, streamAvailability, closeAvailabilityStreams };
