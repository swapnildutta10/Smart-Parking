import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `user-dashboard-${randomUUID()}`;
const emails = [0, 1].map(i => `${tag}-${i}@example.com`), password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let db, inventoryId, parkingId;
const refs = [];
async function request(path, body, token, method) {
  body = await withTestCaptcha(path, body);
  const response = await fetch(`${api}${path}`, { method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
  return { status: response.status, body: await response.json() };
}
function expect(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body; }
try {
  await client.connect(); db = client.db('Smart-Parking');
  expect(await request('/dashboard'), 401);
  const admin = expect(await request('/admin/login', { adminId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }), 200).token;
  expect(await request('/dashboard', undefined, admin), 403);
  const tokens = [];
  for (const email of emails) {
    expect(await request('/users/register', { name: 'User Dashboard Check', email, password }), 201);
    tokens.push(expect(await request('/users/login', { email, password }), 200).token);
  }
  const empty = expect(await request('/dashboard', undefined, tokens[0]), 200);
  assert.equal(empty.totals.totalBookings, 0); assert.equal(empty.nextBooking, null);
  assert.equal(empty.recentBookings.length, 0); assert.ok(empty.yearlyActivity.every(row => row.bookings === 0));
  assert.equal(empty.totals.savedVehicles, 0); assert.equal(empty.totals.recordedPaidCents, 0);
  const spot = expect(await request('/admin/parking', { location: tag, area: 'Dashboard check', vehicle: 'Car', rate: '15.25', totalSlots: 3 }, admin), 201).parking;
  inventoryId = spot.inventoryId; parkingId = spot.parkingId;
  expect(await request('/saved-locations', { inventoryId }, tokens[0]), 200);
  expect(await request('/vehicles', { type: 'Car', plate: 'WB20AB1234' }, tokens[0]), 201);
  expect(await request('/support', { topic: 'booking', message: 'Dashboard fixture request', requestId: randomUUID() }, tokens[0]), 201);
  const starts_at = new Date(Date.now() + 86400000).toISOString(), ends_at = new Date(Date.now() + 90000000).toISOString();
  async function reserve(token) {
    const booking = expect(await request('/bookings', { inventory_id: inventoryId, request_id: randomUUID(), vehicle_plate: 'CHECK 1234', starts_at, ends_at }, token), 201).booking;
    refs.push(booking.id); return booking;
  }
  const booking = await reserve(tokens[0]);
  const expired = await reserve(tokens[0]);
  await db.collection('bookings').updateOne({ booking_ref: expired.id }, { $set: { starts_at: new Date(Date.now() - 7200000), ends_at: new Date(Date.now() - 3600000) } });
  const other = await reserve(tokens[1]);
  await db.collection('bookings').updateOne({ booking_ref: other.id }, { $set: { starts_at: new Date(Date.now() - 60000), ends_at: new Date(Date.now() + 3600000) } });
  const summary = expect(await request('/dashboard', undefined, tokens[0]), 200);
  assert.equal(summary.totals.totalBookings, 2); assert.equal(summary.totals.activeBookings, 1);
  assert.equal(summary.totals.pendingPayments, 1); assert.equal(summary.nextBooking.id, booking.id);
  assert.equal(summary.totals.savedLocations, 1); assert.equal(summary.totals.savedVehicles, 1); assert.equal(summary.totals.openSupportRequests, 1);
  assert.ok(summary.recentBookings.every(row => row.id !== other.id));
  assert.equal(summary.yearlyActivity.reduce((sum, row) => sum + row.bookings, 0), 2);
  assert.equal(summary.inventory.find(row => row.inventoryId === inventoryId).available, 2);
  const publicSlots = expect(await request('/parking'), 200).parking;
  assert.equal(summary.totals.availableSpaces, publicSlots.reduce((sum, row) => sum + row.available, 0));
  assert.equal(summary.totals.totalSpaces, publicSlots.reduce((sum, row) => sum + row.totalSlots, 0));
  assert.equal(summary.totals.locations, new Set(publicSlots.map(row => row.parkingId)).size);
  assert.equal(summary.parkingMix.reduce((sum, row) => sum + row.value, 0), summary.totals.availableSpaces);
  assert.equal(summary.availabilityByArea.reduce((sum, row) => sum + row.available, 0), summary.totals.availableSpaces);
  assert.equal(summary.totals.averageHourlyRateCents, Math.round(publicSlots.reduce((sum, row) => sum + row.rate * 100, 0) / publicSlots.length));
  const isolated = expect(await request('/dashboard', undefined, tokens[1]), 200);
  assert.equal(isolated.totals.totalBookings, 1); assert.equal(isolated.totals.savedLocations, 0);
  assert.equal(isolated.totals.savedVehicles, 0); assert.equal(isolated.totals.openSupportRequests, 0);
  const account = await db.collection('users').findOne({ email: emails[1] });
  assert.equal(expect(await request(`/dashboard?userId=${account._id}`, undefined, tokens[0]), 200).totals.totalBookings, 2);
  const payment = expect(await request(`/bookings/${booking.id}/test-payment`, { method: 'netbanking', bank: 'HDFC Bank' }, tokens[0]), 200).payment;
  const paid = expect(await request('/dashboard', undefined, tokens[0]), 200);
  assert.equal(paid.totals.pendingPayments, 0); assert.equal(paid.totals.recordedPaidCents, payment.amountCents);
  expect(await request(`/bookings/${booking.id}/cancel`, undefined, tokens[0], 'PATCH'), 200);
  const cancelled = expect(await request('/dashboard', undefined, tokens[0]), 200);
  assert.equal(cancelled.nextBooking, null); assert.equal(cancelled.totals.activeBookings, 0);
  assert.equal(cancelled.totals.recordedPaidCents, 0); assert.equal(cancelled.totals.recordedRefundCents, payment.amountCents);
  const relogin = expect(await request('/users/login', { email: emails[0], password }), 200).token;
  assert.equal(expect(await request('/dashboard', undefined, relogin), 200).totals.totalBookings, 2);
  await db.collection('users').updateOne({ _id: account._id }, { $set: { account_status: 'suspended' } });
  expect(await request('/dashboard', undefined, tokens[1]), 403);
  console.log('Passed: private dashboard and empty accounts, live capacity/rates, saved counts, upcoming versus expired reservations, personal yearly activity, payment/refund summaries, sign-in restoration and account isolation.');
} finally {
  try {
    if (db) {
      const accounts = await db.collection('users').find({ email: { $in: emails } }).toArray();
      const ids = accounts.map(user => String(user._id)), uuids = accounts.map(user => user.user_id).filter(Boolean);
      await db.collection('test_payments').deleteMany({ userId: { $in: ids } });
      await db.collection('saved_locations').deleteMany({ userId: { $in: ids } });
      await db.collection('support_requests').deleteMany({ userId: { $in: ids } });
      await db.collection('saved_vehicles').deleteMany({ user_id: { $in: uuids } });
      await db.collection('notifications').deleteMany({ userId: { $in: uuids } });
      await db.collection('bookings').deleteMany({ user_id: { $in: uuids } });
      await db.collection('booking_events').deleteMany({ bookingId: { $in: refs } });
      if (inventoryId) await db.collection('parking_inventory').deleteOne({ inventory_id: inventoryId });
      if (parkingId) await db.collection('parking_locations').deleteOne({ parking_id: parkingId });
      await db.collection('users').deleteMany({ email: { $in: emails } });
    }
  } finally { await client.close(); }
}
