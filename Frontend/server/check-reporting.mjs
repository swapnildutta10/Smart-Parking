import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `report-check-${randomUUID()}`, email = `${tag}@example.com`, password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let db, inventoryId, parkingId, bookingId;
async function request(path, body, token, method) {
  body = await withTestCaptcha(path, body);
  const response = await fetch(`${api}${path}`, { method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
  return { status: response.status, body: await response.json() };
}
function expect(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body; }
const localDay = value => new Date(+new Date(value) + 330 * 60000).toISOString().slice(0, 10);
try {
  await client.connect(); db = client.db('Smart-Parking');
  expect(await request('/admin/dashboard'), 401); expect(await request('/admin/reports'), 401);
  const admin = expect(await request('/admin/login', { adminId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }), 200).token;
  expect(await request('/users/register', { name: 'Report Check', email, password }), 201);
  const user = expect(await request('/users/login', { email, password }), 200).token;
  expect(await request('/admin/dashboard', undefined, user), 403); expect(await request('/admin/reports', undefined, user), 403);
  for (const query of ['from=2026-02-30&to=2026-03-01', 'from=2026-10-10&to=2026-10-01', 'from=2020-01-01&to=2026-01-01', 'from=bad&to=2026-01-01']) {
    expect(await request(`/admin/reports?${query}`, undefined, admin), 400);
  }
  const spot = expect(await request('/admin/parking', { location: tag, area: 'Reporting check', vehicle: 'Car', rate: '20.25', totalSlots: 3 }, admin), 201).parking;
  inventoryId = spot.inventoryId; parkingId = spot.parkingId;
  const day = localDay(Date.now() + 3 * 86400000);
  const midnight = +new Date(`${day}T00:00:00+05:30`);
  const previousDay = localDay(midnight - 86400000), nextDay = localDay(midnight + 86400000);
  const booking = expect(await request('/bookings', { inventory_id: inventoryId, request_id: randomUUID(), vehicle_plate: 'CHECK 1234',
    starts_at: new Date(midnight + 15 * 60000).toISOString(), ends_at: new Date(midnight + 75 * 60000).toISOString() }, user), 201).booking;
  bookingId = booking.id;
  const reportFor = async date => expect(await request(`/admin/reports?from=${date}&to=${date}`, undefined, admin), 200);
  const initial = await reportFor(day);
  assert.equal(initial.range.timezone, 'Asia/Kolkata'); assert.equal(initial.daily.length, 1);
  assert.equal(initial.locations.find(row => row.id === parkingId).bookings, 1);
  assert.equal(initial.locations.find(row => row.id === parkingId).bookedAmountCents, 2025);
  assert.equal((await reportFor(previousDay)).locations.some(row => row.id === parkingId), false, 'UTC previous-day booking must belong to the correct IST date');
  const payment = expect(await request(`/bookings/${bookingId}/test-payment`, { method: 'netbanking', bank: 'HDFC Bank' }, user), 200).payment;
  expect(await request(`/bookings/${bookingId}/cancel`, undefined, user, 'PATCH'), 200);
  // Isolated fixtures: a payment just after midnight and its refund the following day.
  await db.collection('test_payments').updateOne({ bookingId }, { $set: { paidAt: midnight + 15 * 60000, refundedAt: midnight + 86400000 + 15 * 60000 } });
  const paidDay = await reportFor(day), refundDay = await reportFor(nextDay);
  assert.equal(paidDay.locations.find(row => row.id === parkingId).cancelled, 1);
  assert.equal(paidDay.locations.find(row => row.id === parkingId).bookedAmountCents, 0);
  const rangeReport = expect(await request(`/admin/reports?from=${day}&to=${nextDay}`, undefined, admin), 200);
  // Independently calculate the aggregate from the matching raw database records.
  const rangeStart = midnight, rangeEnd = midnight + 2 * 86400000;
  const payments = await db.collection('test_payments').find().toArray();
  const gross = payments.filter(row => ['paid', 'refunded'].includes(row.status) && row.paidAt >= rangeStart && row.paidAt < rangeEnd).reduce((sum, row) => sum + row.amountCents, 0);
  const refunds = payments.filter(row => row.status === 'refunded' && (row.refundedAt ?? row.paidAt) >= rangeStart && (row.refundedAt ?? row.paidAt) < rangeEnd).reduce((sum, row) => sum + row.amountCents, 0);
  assert.equal(rangeReport.totals.grossCents, gross); assert.equal(rangeReport.totals.refundCents, refunds);
  assert.equal(rangeReport.totals.netCents, gross - refunds);
  assert.ok(paidDay.totals.grossCents >= payment.amountCents); assert.ok(refundDay.totals.refundCents >= payment.amountCents);
  for (const key of ['grossCents', 'refundCents', 'netCents', 'bookings', 'payments', 'refunds']) {
    assert.equal(rangeReport.totals[key], rangeReport.daily.reduce((sum, row) => sum + row[key], 0));
  }
  const dashboard = expect(await request('/admin/dashboard', undefined, admin), 200);
  assert.equal(dashboard.currency, 'INR'); assert.equal(dashboard.monthly.length, 12);
  assert.equal(dashboard.totals.totalUsers, await db.collection('users').countDocuments());
  const publicInventory = expect(await request('/parking'), 200).parking;
  assert.equal(dashboard.totals.totalSlots, publicInventory.reduce((sum, row) => sum + row.totalSlots, 0));
  assert.equal(dashboard.totals.availableSlots, publicInventory.reduce((sum, row) => sum + row.available, 0));
  assert.equal(dashboard.totals.locations, new Set(publicInventory.map(row => row.parkingId)).size);
  assert.ok(dashboard.recentBookings.some(row => row.id === bookingId));
  assert.equal(Object.values(dashboard.bookingStatuses).reduce((sum, count) => sum + count, 0), dashboard.totals.totalBookings);
  const annual = expect(await request(`/admin/reports?from=${dashboard.year}-01-01&to=${dashboard.year}-12-31`, undefined, admin), 200);
  assert.equal(dashboard.monthly.reduce((sum, row) => sum + row.grossCents, 0), annual.totals.grossCents);
  assert.equal(dashboard.monthly.reduce((sum, row) => sum + row.refundCents, 0), annual.totals.refundCents);
  const leap = expect(await request('/admin/reports?from=2024-01-01&to=2024-12-31', undefined, admin), 200);
  assert.equal(leap.daily.length, 366);
  const empty = expect(await request('/admin/reports?from=2099-01-01&to=2099-01-01', undefined, admin), 200);
  assert.equal(empty.totals.bookings, 0); assert.equal(empty.totals.grossCents, 0); assert.equal(empty.daily.length, 1);
  console.log('Passed: admin-only dashboard/reports, date validation and leap years, IST midnight boundaries, refund event dates, independent aggregate totals, capacity/location counts, monthly charts, recent bookings and empty reports.');
} finally {
  try {
    if (db) {
      const account = await db.collection('users').findOne({ email });
      if (bookingId) {
        await db.collection('test_payments').deleteMany({ bookingId });
        await db.collection('booking_events').deleteMany({ bookingId });
      }
      if (account?.user_id) {
        await db.collection('notifications').deleteMany({ userId: account.user_id });
        await db.collection('bookings').deleteMany({ user_id: account.user_id });
      }
      if (inventoryId) await db.collection('parking_inventory').deleteOne({ inventory_id: inventoryId });
      if (parkingId) await db.collection('parking_locations').deleteOne({ parking_id: parkingId });
      await db.collection('users').deleteOne({ email });
    }
  } finally { await client.close(); }
}
