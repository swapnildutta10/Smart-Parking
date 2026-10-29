const { createService, fail } = require('../services/parkingService');
const OFFSET = 330 * 60000;
const dayString = value => new Date(+new Date(value) + OFFSET).toISOString().slice(0, 10);
function dateRange(from, to, now = new Date()) {
  const today = dayString(now);
  from = from === undefined ? `${today.slice(0, 7)}-01` : from;
  to = to === undefined ? today : to;
  const valid = text => typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text)
    && Number.isFinite(+new Date(`${text}T00:00:00Z`)) && new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) === text;
  if (!valid(from) || !valid(to)) throw fail(400, 'Choose valid start and end dates.');
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(+new Date(`${to}T00:00:00+05:30`) + 86400000);
  const days = (+end - +start) / 86400000;
  if (days < 1 || days > 366) throw fail(400, 'Choose a date range of 1–366 days.');
  return { from, to, start, end, days, timezone: 'Asia/Kolkata' };
}
const dateKey = field => ({ $dateToString: { date: field, format: '%Y-%m-%d', timezone: 'Asia/Kolkata' } });
const money = { $round: [{ $multiply: [{ $toDouble: '$total_amount' }, 100] }, 0] };

async function buildReport(db, range) {
  const bookingMatch = { starts_at: { $gte: range.start, $lt: range.end } };
  const paymentMatch = { paidAt: { $gte: +range.start, $lt: +range.end }, status: { $in: ['paid', 'refunded'] } };
  const [statuses, bookingsByDay, paymentsByDay, refundsByDay, locationRows] = await Promise.all([
    db.collection('bookings').aggregate([{ $match: bookingMatch }, { $group: { _id: '$status', count: { $sum: 1 }, amountCents: { $sum: money } } }]).toArray(),
    db.collection('bookings').aggregate([{ $match: bookingMatch }, { $group: { _id: dateKey('$starts_at'), bookings: { $sum: 1 } } }]).toArray(),
    db.collection('test_payments').aggregate([{ $match: paymentMatch }, { $group: { _id: dateKey({ $toDate: '$paidAt' }), payments: { $sum: 1 }, grossCents: { $sum: '$amountCents' } } }]).toArray(),
    db.collection('test_payments').aggregate([
      { $match: { status: 'refunded' } }, { $addFields: { refundTime: { $ifNull: ['$refundedAt', '$paidAt'] } } },
      { $match: { refundTime: { $gte: +range.start, $lt: +range.end } } },
      { $group: { _id: dateKey({ $toDate: '$refundTime' }), refunds: { $sum: 1 }, refundCents: { $sum: '$amountCents' } } },
    ]).toArray(),
    locationSummary(db, bookingMatch),
  ]);
  const daily = [];
  const bookingMap = new Map(bookingsByDay.map(row => [row._id, row]));
  const paymentMap = new Map(paymentsByDay.map(row => [row._id, row]));
  const refundMap = new Map(refundsByDay.map(row => [row._id, row]));
  for (let i = 0; i < range.days; i++) {
    const date = dayString(new Date(+range.start + i * 86400000));
    const row = { date, bookings: bookingMap.get(date)?.bookings || 0,
      payments: paymentMap.get(date)?.payments || 0, refunds: refundMap.get(date)?.refunds || 0,
      grossCents: paymentMap.get(date)?.grossCents || 0, refundCents: refundMap.get(date)?.refundCents || 0 };
    daily.push({ ...row, netCents: row.grossCents - row.refundCents });
  }
  const bookingStatuses = Object.fromEntries(['upcoming', 'checked_in', 'completed', 'cancelled', 'no_show'].map(status => [status, 0]));
  let bookedAmountCents = 0;
  for (const row of statuses) {
    bookingStatuses[row._id] = row.count;
    if (!['cancelled', 'no_show'].includes(row._id)) bookedAmountCents += row.amountCents;
  }
  const totals = daily.reduce((sum, row) => ({ bookings: sum.bookings + row.bookings, payments: sum.payments + row.payments,
    refunds: sum.refunds + row.refunds, grossCents: sum.grossCents + row.grossCents,
    refundCents: sum.refundCents + row.refundCents, netCents: sum.netCents + row.netCents }),
  { bookings: 0, payments: 0, refunds: 0, grossCents: 0, refundCents: 0, netCents: 0 });
  return { range: { from: range.from, to: range.to, timezone: range.timezone }, currency: 'INR',
    paymentMode: 'simulated', expensesAvailable: false, totals: { ...totals, bookedAmountCents }, bookingStatuses, daily, locations: locationRows };
}

async function locationSummary(db, match = {}) {
  const rows = await db.collection('bookings').aggregate([
    { $match: match },
    { $lookup: { from: 'parking_inventory', localField: 'inventory_id', foreignField: 'inventory_id', as: 'inventory' } },
    { $unwind: { path: '$inventory', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { $ifNull: ['$inventory.parking_id', '$inventory_id'] }, bookings: { $sum: 1 },
      cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      bookedAmountCents: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'no_show']] }, 0, money] } } } },
    { $lookup: { from: 'parking_locations', localField: '_id', foreignField: 'parking_id', as: 'location' } },
    { $sort: { bookings: -1, _id: 1 } },
  ]).toArray();
  return rows.map(row => ({ id: row._id, location: row.location[0]?.location_name || 'Unavailable location',
    address: row.location[0]?.address || '', bookings: row.bookings, cancelled: row.cancelled, bookedAmountCents: row.bookedAmountCents }));
}

async function dashboard(db, bson, now = new Date()) {
  const today = dayString(now), year = Number(today.slice(0, 4));
  const [inventory, totalUsers, statusRows, activeBookings, openSupportRequests, annual, topLocations, recentRows] = await Promise.all([
    createService(db, bson).list(now, new Date(+now + 1)),
    db.collection('users').countDocuments(),
    db.collection('bookings').aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    db.collection('bookings').countDocuments({ status: { $in: ['upcoming', 'checked_in'] }, ends_at: { $gt: now } }),
    db.collection('support_requests').countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    buildReport(db, dateRange(`${year}-01-01`, `${year}-12-31`, now)),
    locationSummary(db),
    db.collection('bookings').find().sort({ _id: -1 }).limit(5).toArray(),
  ]);
  const bookingStatuses = Object.fromEntries(['upcoming', 'checked_in', 'completed', 'cancelled', 'no_show'].map(status => [status, 0]));
  for (const row of statusRows) bookingStatuses[row._id] = row.count;
  const totalSlots = inventory.reduce((sum, row) => sum + row.totalSlots, 0);
  const availableSlots = inventory.reduce((sum, row) => sum + row.available, 0);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthly = monthNames.map((month, i) => ({ month, monthNumber: i + 1, bookings: 0, grossCents: 0, refundCents: 0, netCents: 0 }));
  for (const row of annual.daily) {
    const month = monthly[Number(row.date.slice(5, 7)) - 1];
    for (const field of ['bookings', 'grossCents', 'refundCents', 'netCents']) month[field] += row[field];
  }
  const recentBookings = await Promise.all(recentRows.map(async row => {
    const [booking, user] = await Promise.all([createService(db, bson).present(row), db.collection('users').findOne({ user_id: row.user_id }, { projection: { name: 1 } })]);
    return { ...booking, userName: user?.name || 'Deleted account', createdAt: row._id.getTimestamp().toISOString() };
  }));
  return { generatedAt: now.toISOString(), timezone: 'Asia/Kolkata', currency: 'INR', year, paymentMode: 'simulated',
    totals: { totalUsers, totalSlots, availableSlots, occupiedSlots: totalSlots - availableSlots,
      availablePercent: totalSlots ? Math.round(availableSlots / totalSlots * 100) : 0,
      locations: new Set(inventory.map(row => row.parkingId)).size, inventory: inventory.length, activeBookings,
      totalBookings: statusRows.reduce((sum, row) => sum + row.count, 0), openSupportRequests,
      monthlyGrossCents: monthly[Number(today.slice(5, 7)) - 1].grossCents },
    bookingStatuses, monthly, topLocations: topLocations.slice(0, 5), recentBookings };
}

function mountReporting(app, { mongoose, express, requireAuth }) {
  const router = express.Router();
  const safe = action => async (req, res, next) => {
    try { await action(req, res); } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  };
  router.get('/dashboard', requireAuth('admin'), safe(async (req, res) => res.json(await dashboard(mongoose.connection.db, mongoose.mongo))));
  router.get('/reports', requireAuth('admin'), safe(async (req, res) => res.json(await buildReport(mongoose.connection.db, dateRange(req.query.from, req.query.to)))));
  app.use('/api/admin', router);
}
module.exports = { mountReporting, dateRange, buildReport, dashboard };
