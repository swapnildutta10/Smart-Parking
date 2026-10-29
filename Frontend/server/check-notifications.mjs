import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `notification-check-${randomUUID()}`;
const emails = [0, 1].map(i => `${tag}-${i}@example.com`);
const password = `Check-${randomUUID()}`;
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
  const admin = expect(await request('/admin/login', { adminId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }), 200).token;
  const tokens = [];
  for (const email of emails) {
    expect(await request('/users/register', { name: 'Notification Check', email, password }), 201);
    tokens.push(expect(await request('/users/login', { email, password }), 200).token);
  }
  expect(await request('/notifications'), 401);
  expect(await request('/notifications', undefined, admin), 403);
  expect(await request('/notifications', { kind: 'reserved', bookingId: 'forged' }, tokens[0]), 404);
  assert.equal(expect(await request('/notifications', undefined, tokens[0]), 200).notifications.length, 0);
  const spot = expect(await request('/admin/parking', { location: tag, area: 'Notification check', vehicle: 'Car', rate: '10.00', totalSlots: 2 }, admin), 201).parking;
  inventoryId = spot.inventoryId; parkingId = spot.parkingId;
  const starts_at = new Date(Date.now() + 86400000).toISOString();
  const ends_at = new Date(+new Date(starts_at) + 3600000).toISOString();
  async function reserve() {
    const booking = expect(await request('/bookings', { inventory_id: inventoryId, request_id: randomUUID(), vehicle_plate: 'CHECK 1234', starts_at, ends_at }, tokens[0]), 201).booking;
    refs.push(booking.id); return booking;
  }
  const booking = await reserve();
  assert.equal(await db.collection('notifications').countDocuments({ bookingId: booking.id, kind: 'reserved' }), 1, 'Reservation must persist a notification before history is read');
  const user = await db.collection('users').findOne({ email: emails[0] });
  const relogin = expect(await request('/users/login', { email: emails[0], password }), 200).token;
  const first = expect(await request('/notifications', undefined, relogin), 200).notifications;
  assert.equal(first[0].bookingId, booking.id); assert.equal(first[0].kind, 'reserved');
  assert.equal(first[0].location, tag); assert.equal('userId' in first[0], false);
  assert.equal(expect(await request('/notifications', undefined, tokens[1]), 200).notifications.length, 0);
  const again = expect(await request('/notifications', undefined, tokens[0]), 200).notifications;
  assert.deepEqual(again, first, 'Repeated reads must preserve notification IDs and timestamps');
  // Simulate this run's booking reaching its arrival window.
  await db.collection('bookings').updateOne({ booking_ref: booking.id }, { $set: {
    starts_at: new Date(Date.now() - 60000), ends_at: new Date(Date.now() + 3600000),
  } });
  const arrivals = await Promise.all([request('/notifications', undefined, tokens[0]), request('/notifications', undefined, tokens[0])]);
  arrivals.forEach(result => assert.ok(expect(result, 200).notifications.some(row => row.kind === 'overdue')));
  assert.equal(await db.collection('notifications').countDocuments({ bookingId: booking.id, kind: 'overdue' }), 1);
  expect(await request(`/bookings/${booking.id}/check-in`, undefined, tokens[0], 'PATCH'), 200);
  assert.equal(await db.collection('notifications').countDocuments({ bookingId: booking.id, kind: 'parked' }), 1);
  expect(await request(`/bookings/${booking.id}/check-in`, undefined, tokens[0], 'PATCH'), 200);
  assert.equal(await db.collection('notifications').countDocuments({ bookingId: booking.id, kind: 'parked' }), 1);
  expect(await request(`/admin/bookings/${booking.id}/status`, { status: 'completed' }, admin, 'PATCH'), 200);
  assert.equal(await db.collection('notifications').countDocuments({ bookingId: booking.id, kind: 'completed' }), 1);
  const second = await reserve();
  expect(await request(`/admin/bookings/${second.id}/status`, { status: 'cancelled' }, admin, 'PATCH'), 200);
  assert.equal(await db.collection('notifications').countDocuments({ bookingId: second.id, kind: 'cancelled' }), 1);
  const third = await reserve();
  expect(await request(`/bookings/${third.id}/cancel`, undefined, tokens[0], 'PATCH'), 200);
  assert.equal(await db.collection('notifications').countDocuments({ bookingId: third.id, kind: 'cancelled' }), 1);
  // Verify history can recover older booking data with no corresponding alert.
  await db.collection('notifications').deleteMany({ bookingId: second.id });
  const history = expect(await request('/notifications', undefined, tokens[0]), 200).notifications;
  assert.ok(history.some(row => row.bookingId === second.id && row.kind === 'reserved'));
  assert.ok(history.some(row => row.bookingId === second.id && row.kind === 'cancelled'));
  assert.equal(history.filter(row => row.bookingId === booking.id && row.kind === 'overdue').length, 1);
  assert.equal(expect(await request('/notifications', undefined, tokens[1]), 200).notifications.length, 0);
  await db.collection('users').updateOne({ _id: user._id }, { $set: { account_status: 'suspended' } });
  expect(await request('/notifications', undefined, tokens[0]), 403);
  console.log('Passed: server-generated reservation/check-in/admin/user cancellation/completion notifications, persistence after login, account isolation, stable timestamps, duplicate arrival prevention, historical recovery and suspended-account protection.');
} finally {
  try {
    if (db) {
      const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
      const userIds = users.map(user => user.user_id).filter(Boolean);
      await db.collection('notifications').deleteMany({ userId: { $in: userIds } });
      await db.collection('booking_events').deleteMany({ bookingId: { $in: refs } });
      await db.collection('bookings').deleteMany({ user_id: { $in: userIds } });
      if (inventoryId) await db.collection('parking_inventory').deleteOne({ inventory_id: inventoryId });
      if (parkingId) await db.collection('parking_locations').deleteOne({ parking_id: parkingId });
      await db.collection('users').deleteMany({ email: { $in: emails } });
    }
  } finally { await client.close(); }
}
