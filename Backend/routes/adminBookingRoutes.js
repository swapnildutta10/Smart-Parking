const { publishAvailabilityChange } = require('../services/availabilityEvents');
const { recordNotification, kinds } = require('../services/notificationService');
const { createService, fail } = require('../services/parkingService');

function mountAdminBookings(app, { mongoose, express, requireAuth }) {
  const router = express.Router();
  const db = () => mongoose.connection.db;
  const service = () => createService(db(), mongoose.mongo);
  const safe = action => async (req, res, next) => {
    try { await action(req, res); }
    catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  };
  const labels = { checked_in: 'Checked in', completed: 'Marked completed', no_show: 'Marked no-show', cancelled: 'Cancelled' };
  async function present(row) {
    const [booking, user, events] = await Promise.all([
      service().present(row),
      db().collection('users').findOne({ user_id: row.user_id }, { projection: { name: 1, email: 1 } }),
      db().collection('booking_events').find({ bookingId: row.booking_ref }).sort({ at: 1 }).toArray(),
    ]);
    return { ...booking, userName: user?.name || 'Deleted account', email: user?.email || '', phone: '',
      plate: row.vehicle_plate, tone: '#3984b5',
      timeline: [{ label: 'Booking created', at: row._id.getTimestamp().toISOString() },
        ...events.map(event => ({ label: event.label, at: event.at.toISOString() }))] };
  }
  router.use(requireAuth('admin'));
  router.get('/', safe(async (req, res) => {
    const rows = await db().collection('bookings').find().sort({ starts_at: -1 }).toArray();
    res.json({ bookings: await Promise.all(rows.map(present)) });
  }));
  router.patch('/:ref/status', safe(async (req, res) => {
    const status = req.body?.status;
    if (!/^PN-[A-F0-9]{24}$/.test(req.params.ref) || !Object.hasOwn(labels, status)) throw fail(400, 'Choose a valid booking and status.');
    const bookings = db().collection('bookings');
    const row = await bookings.findOne({ booking_ref: req.params.ref });
    if (!row) throw fail(404, 'Booking not found.');
    const result = await service().withInventoryLock(row.inventory_id, async () => {
      const current = await bookings.findOne({ booking_ref: req.params.ref });
      if (current.status === status) { await recordNotification(db(), current, kinds[status]); return present(current); }
      if (!['upcoming', 'checked_in'].includes(current.status)) throw fail(409, 'This booking can no longer be changed.');
      if (current.status === 'checked_in' && status !== 'completed') throw fail(409, 'A checked-in booking can only be completed.');
      const now = Date.now();
      if (status === 'checked_in' && (now < +current.starts_at || now >= +current.ends_at)) throw fail(409, 'Check-in is available during the booked time.');
      if (status === 'completed' && current.status !== 'checked_in' && now < +current.ends_at) throw fail(409, 'Check in the vehicle before completing this booking.');
      if (status === 'no_show' && now < +current.ends_at) throw fail(409, 'Mark a no-show after the booked time has ended.');
      if (status === 'cancelled' && now >= +current.starts_at) throw fail(409, 'Cancellation is available before the booked arrival time.');
      await bookings.updateOne({ _id: current._id, status: current.status }, { $set: { status } });

      if (status === 'cancelled') await db().collection('test_payments').updateOne({ _id: current.booking_ref, status: 'paid' }, { $set: { status: 'refunded', refundedAt: now } });
      publishAvailabilityChange(current.inventory_id, status);
      await db().collection('booking_events').insertOne({ bookingId: current.booking_ref, label: labels[status], at: new Date(now), actor: req.auth.id });
      await recordNotification(db(), current, kinds[status], new Date(now));
      return present({ ...current, status });
    });
    res.json({ booking: result });
  }));
  app.use('/api/admin/bookings', router);
}
module.exports = { mountAdminBookings };
