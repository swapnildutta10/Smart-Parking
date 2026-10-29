const { streamAvailability } = require('../services/availabilityEvents');
const { createService, interval, UUID, fail } = require('../services/parkingService');

function mountAvailability(app, { mongoose, express }) {
  app.get('/api/availability/events', streamAvailability);
  app.get('/api/availability', async (req, res, next) => {
    try {
      const now = new Date();
      let start = now, end = new Date(+now + 1), mode = 'now';
      if (req.query.starts_at !== undefined || req.query.ends_at !== undefined) {
        const window = interval(req.query.starts_at, req.query.ends_at);
        start = window.starts_at; end = window.ends_at; mode = 'window';
        if (+start < +now - 60000 || +start > +now + 365 * 86400000) throw fail(400, 'Choose an arrival within the next year.');
      }
      const parkingId = req.query.parking_id;
      if (parkingId !== undefined && (typeof parkingId !== 'string' || !UUID.test(parkingId))) throw fail(400, 'Choose a valid parking location.');
      const rows = await createService(mongoose.connection.db, mongoose.mongo).list(start, end);
      const groups = new Map();
      for (const row of rows) {
        if (parkingId && row.parkingId !== parkingId) continue;
        const location = groups.get(row.parkingId) || { parkingId: row.parkingId, location: row.location, area: row.area, totalSlots: 0, available: 0, reserved: 0, inventory: [] };
        location.totalSlots += row.totalSlots; location.available += row.available;
        location.reserved += row.totalSlots - row.available;
        location.inventory.push({ ...row, reserved: row.totalSlots - row.available,
          availablePercent: row.totalSlots ? Math.round(row.available / row.totalSlots * 100) : 0 });
        groups.set(row.parkingId, location);
      }
      if (parkingId && !groups.size) throw fail(404, 'This parking location is unavailable.');
      const locations = [...groups.values()].map(row => ({ ...row, availablePercent: row.totalSlots ? Math.round(row.available / row.totalSlots * 100) : 0 }))
        .sort((a, b) => a.location.localeCompare(b.location) || a.parkingId.localeCompare(b.parkingId));
      res.set('Cache-Control', 'no-store');
      res.json({ generatedAt: now.toISOString(), timezone: 'Asia/Kolkata', refreshIntervalSeconds: 10, mode,
        startsAt: start.toISOString(), endsAt: end.toISOString(), locations });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  });
}
module.exports = { mountAvailability };
