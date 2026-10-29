const { createService, UUID } = require('../services/parkingService');

function mountUserDashboard(app, { mongoose, express, requireAuth }) {
  const router = express.Router();
  router.get('/', requireAuth('user'), async (req, res, next) => {
    try {
      if (!/^[a-f\d]{24}$/i.test(req.auth.id)) return res.status(401).json({ message: 'Sign in to view your dashboard.' });
      const db = mongoose.connection.db;
      const user = await db.collection('users').findOne({ _id: new mongoose.mongo.ObjectId(req.auth.id) });
      if (!user || user.account_status === 'suspended') return res.status(403).json({ message: 'This account cannot view the dashboard.' });
      const userId = String(user._id);
      const owner = UUID.test(user.user_id || '') ? { user_id: user.user_id } : { user_id: { $in: [] } };
      const now = new Date();
      const active = { ...owner, status: { $in: ['upcoming', 'checked_in'] }, ends_at: { $gt: now } };
      const service = createService(db, mongoose.mongo);
      const [inventory, statusRows, activeRows, nextRow, recentRows, years, payments, savedLocations, savedVehicles, openSupportRequests] = await Promise.all([
        service.list(now, new Date(+now + 1)),
        db.collection('bookings').aggregate([{ $match: owner }, { $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
        db.collection('bookings').find(active, { projection: { booking_ref: 1 } }).toArray(),
        db.collection('bookings').findOne({ ...owner, status: 'upcoming', ends_at: { $gt: now } }, { sort: { starts_at: 1 } }),
        db.collection('bookings').find(owner).sort({ _id: -1 }).limit(5).toArray(),
        db.collection('bookings').aggregate([{ $match: owner }, { $group: { _id: { $year: { date: '$starts_at', timezone: 'Asia/Kolkata' } }, bookings: { $sum: 1 } } }]).toArray(),
        db.collection('test_payments').find({ userId }, { projection: { bookingId: 1, status: 1, amountCents: 1 } }).toArray(),
        db.collection('saved_locations').countDocuments({ userId }),
        db.collection('saved_vehicles').countDocuments(owner),
        db.collection('support_requests').countDocuments({ userId, status: { $in: ['open', 'in_progress'] } }),
      ]);
      const bookingStatuses = Object.fromEntries(['upcoming', 'checked_in', 'completed', 'cancelled', 'no_show'].map(status => [status, 0]));
      for (const row of statusRows) bookingStatuses[row._id] = row.count;
      const paidIds = new Set(payments.filter(payment => payment.status === 'paid').map(payment => payment.bookingId));
      const areas = new Map();
      for (const slot of inventory) {
        const row = areas.get(slot.area) || { area: slot.area, totalSlots: 0, available: 0, locations: new Set() };
        row.totalSlots += slot.totalSlots; row.available += slot.available; row.locations.add(slot.parkingId); areas.set(slot.area, row);
      }
      const labels = ['Two wheeler', 'Car', 'SUV / Van'];
      const year = Number(new Date(+now + 330 * 60000).toISOString().slice(0, 4));
      const lastYear = years.some(row => row._id === year + 1) ? year + 1 : year;
      const yearlyActivity = [];
      for (let y = year - 5; y <= lastYear; y++) yearlyActivity.push({ year: y, bookings: years.find(row => row._id === y)?.bookings || 0 });
      res.json({ generatedAt: now.toISOString(), timezone: 'Asia/Kolkata', currency: 'INR',
        totals: { totalBookings: statusRows.reduce((sum, row) => sum + row.count, 0), activeBookings: activeRows.length,
          pendingPayments: activeRows.filter(row => !paidIds.has(row.booking_ref)).length,
          recordedPaidCents: payments.filter(row => row.status === 'paid').reduce((sum, row) => sum + row.amountCents, 0),
          recordedRefundCents: payments.filter(row => row.status === 'refunded').reduce((sum, row) => sum + row.amountCents, 0),
          savedLocations, savedVehicles, openSupportRequests, availableSpaces: inventory.reduce((sum, row) => sum + row.available, 0),
          totalSpaces: inventory.reduce((sum, row) => sum + row.totalSlots, 0),
          locations: new Set(inventory.map(row => row.parkingId)).size,
          averageHourlyRateCents: inventory.length ? Math.round(inventory.reduce((sum, row) => sum + row.rate * 100, 0) / inventory.length) : 0 },
        bookingStatuses, inventory, yearlyActivity,
        parkingMix: labels.map(label => ({ label, value: inventory.filter(slot => slot.vehicle === label).reduce((sum, row) => sum + row.available, 0) })),
        availabilityByArea: [...areas.values()].map(row => ({ ...row, locations: row.locations.size, availablePercent: row.totalSlots ? Math.round(row.available / row.totalSlots * 100) : 0 })),
        nextBooking: nextRow ? await service.present(nextRow) : null,
        recentBookings: await Promise.all(recentRows.map(row => service.present(row))) });
    } catch (error) { next(error); }
  });
  app.use('/api/dashboard', router);
}
module.exports = { mountUserDashboard };
