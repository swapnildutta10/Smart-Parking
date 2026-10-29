import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `live-events-${randomUUID()}`, email = `${tag}@example.com`, password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const streams = [];
let db, inventoryId, parkingId;
async function request(path, body, token, method) {
  body = await withTestCaptcha(path, body);
  const response = await fetch(`${api}${path}`, { method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(result)}`);
  return result;
}
async function openStream() {
  const controller = new AbortController();
  const response = await fetch(`${api}/availability/events`, { signal: controller.signal });
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const events = [], waiting = new Set(), reader = response.body.getReader(), decoder = new TextDecoder();
  const waitFor = (predicate, after = 0) => {
    const existing = events.slice(after).find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const pending = { predicate, resolve: value => { clearTimeout(timer); waiting.delete(pending); resolve(value); } };
      const timer = setTimeout(() => { waiting.delete(pending); reject(new Error('No live event received within 5 seconds')); }, 5000);
      waiting.add(pending);
    });
  };
  const pump = (async () => {
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index;
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
          const type = frame.match(/^event: (.+)$/m)?.[1], raw = frame.match(/^data: (.+)$/m)?.[1];
          if (!type || !raw) continue;
          const event = { type, ...JSON.parse(raw) }; events.push(event);
          for (const pending of [...waiting]) if (pending.predicate(event)) pending.resolve(event);
        }
      }
    } catch (error) { if (!controller.signal.aborted) throw error; }
  })();
  const stream = { waitFor, cursor: () => events.length, close: async () => { controller.abort(); await pump; } };
  streams.push(stream);
  await waitFor(event => event.type === 'connected');
  return stream;
}
try {
  await client.connect(); db = client.db('Smart-Parking');
  const admin = (await request('/admin/login', { adminId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).token;
  await request('/users/register', { name: 'Live Events Check', email, password });
  const token = (await request('/users/login', { email, password })).token;
  const spot = (await request('/admin/parking', { location: tag, area: 'Stream check', vehicle: 'Car', rate: '12.00', totalSlots: 2 }, admin)).parking;
  inventoryId = spot.inventoryId; parkingId = spot.parkingId;
  const one = await openStream(), two = await openStream();
  const starts_at = new Date(Date.now() + 86400000).toISOString(), ends_at = new Date(Date.now() + 90000000).toISOString();
  const query = new URLSearchParams({ starts_at, ends_at, parking_id: parkingId });
  const capacity = async () => (await request(`/availability?${query}`)).locations[0].available;
  assert.equal(await capacity(), 2);
  const bookingPromise = request('/bookings', { inventory_id: inventoryId, request_id: randomUUID(), vehicle_plate: 'CHECK 1234', starts_at, ends_at }, token);
  const reserved = event => event.type === 'availability-changed' && event.inventoryId === inventoryId && event.reason === 'reserved';
  const bookingEvents = await Promise.all([one.waitFor(reserved), two.waitFor(reserved)]);
  assert.equal(await db.collection('bookings').countDocuments({ inventory_id: inventoryId }), 1, 'Events must follow the committed write');
  const booking = (await bookingPromise).booking;
  assert.equal(await capacity(), 1);
  const bookedHistory = await request('/admin/bookings', undefined, admin);
  assert.equal(bookedHistory.bookings.find(row => row.id === booking.id).status, 'upcoming');
  const bookedDashboard = await request('/admin/dashboard', undefined, admin);
  assert.equal(bookedDashboard.recentBookings.find(row => row.id === booking.id).status, 'upcoming');
  for (const event of bookingEvents) assert.deepEqual(Object.keys(event).sort(), ['inventoryId', 'reason', 'type', 'updatedAt']);
  const payment = (await request(`/bookings/${booking.id}/test-payment`, { method: 'netbanking', bank: 'HDFC Bank' }, token)).payment;
  const paidEvent = event => event.inventoryId === inventoryId && event.reason === 'payment-created';
  await Promise.all([one.waitFor(paidEvent), two.waitFor(paidEvent)]);
  assert.equal((await db.collection('test_payments').findOne({ id: payment.id })).status, 'paid');
  assert.equal((await request('/admin/payments', undefined, admin)).payments.find(row => row.id === payment.id).status, 'paid');
  const cancelling = request(`/bookings/${booking.id}/cancel`, undefined, token, 'PATCH');
  const cancelled = event => event.inventoryId === inventoryId && event.reason === 'cancelled';
  await Promise.all([one.waitFor(cancelled), two.waitFor(cancelled)]);
  assert.equal((await db.collection('test_payments').findOne({ id: payment.id })).status, 'refunded', 'Cancellation must broadcast only after the refund is committed');
  assert.equal((await request('/admin/payments', undefined, admin)).payments.find(row => row.id === payment.id).status, 'refunded');
  await cancelling;
  assert.equal(await capacity(), 2);
  const cancelledHistory = await request('/admin/bookings', undefined, admin);
  assert.equal(cancelledHistory.bookings.find(row => row.id === booking.id).status, 'cancelled');
  const cancelledDashboard = await request('/admin/dashboard', undefined, admin);
  assert.equal(cancelledDashboard.recentBookings.find(row => row.id === booking.id).status, 'cancelled');
  const secondBooking = (await request('/bookings', { inventory_id: inventoryId, request_id: randomUUID(), vehicle_plate: 'CHECK 5678', starts_at, ends_at }, token)).booking;
  const secondPayment = (await request(`/bookings/${secondBooking.id}/test-payment`, { method: 'netbanking', bank: 'HDFC Bank' }, token)).payment;
  const markOne = one.cursor(), markTwo = two.cursor();
  const adminCancelling = request(`/admin/bookings/${secondBooking.id}/status`, { status: 'cancelled' }, admin, 'PATCH');
  await Promise.all([one.waitFor(cancelled, markOne), two.waitFor(cancelled, markTwo)]);
  assert.equal((await db.collection('test_payments').findOne({ id: secondPayment.id })).status, 'refunded');
  assert.equal((await request('/admin/payments', undefined, admin)).payments.find(row => row.id === secondPayment.id).status, 'refunded');
  await adminCancelling;
  await one.close();
  await request(`/admin/parking/${inventoryId}`, { location: tag, area: 'Stream check', vehicle: 'Car', rate: '15.00', totalSlots: 3 }, admin, 'PATCH');
  await two.waitFor(event => event.inventoryId === inventoryId && event.reason === 'inventory-updated');
  assert.equal(await capacity(), 3);
  const reconnected = await openStream();
  await request(`/admin/parking/${inventoryId}`, undefined, admin, 'DELETE');
  await reconnected.waitFor(event => event.inventoryId === inventoryId && event.reason === 'inventory-deleted');
  console.log('Passed: two subscribers receive committed booking/payment/refund events, admin payment history updates immediately after user/admin cancellation, reconnects work and events contain no private data.');
} finally {
  await Promise.allSettled(streams.map(stream => stream.close()));
  try {
    if (db) {
      const user = await db.collection('users').findOne({ email });
      if (user) await db.collection('test_payments').deleteMany({ userId: String(user._id) });
      if (user?.user_id) {
        const rows = await db.collection('bookings').find({ user_id: user.user_id }, { projection: { booking_ref: 1 } }).toArray();
        await db.collection('booking_events').deleteMany({ bookingId: { $in: rows.map(row => row.booking_ref) } });
        await db.collection('notifications').deleteMany({ userId: user.user_id });
        await db.collection('bookings').deleteMany({ user_id: user.user_id });
      }
      if (inventoryId) await db.collection('parking_inventory').deleteOne({ inventory_id: inventoryId });
      if (parkingId) await db.collection('parking_locations').deleteOne({ parking_id: parkingId });
      await db.collection('users').deleteOne({ email });
    }
  } finally { await client.close(); }
}
