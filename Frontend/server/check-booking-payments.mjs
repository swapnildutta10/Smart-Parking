import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const emails = [0, 1].map(() => `booking-check-${randomUUID()}@example.com`);
const password = `Test-${randomUUID()}`;
const refs = [];
let db;
async function request(path, body, token, method) {
  body = await withTestCaptcha(path, body);
  const response = await fetch(`${api}${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  });
  return { status: response.status, body: await response.json() };
}
function expect(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body; }
try {
  await client.connect();
  db = client.db('Smart-Parking');
  const tokens = [];
  for (const email of emails) {
    expect(await request('/users/register', { name: 'Booking Integration Check', email, password }), 201);
    tokens.push(expect(await request('/users/login', { email, password }), 200).token);
  }
  expect(await request('/payments'), 401);
  expect(await request('/admin/payments', undefined, tokens[0]), 403);
  const starts_at = new Date(Date.now() + 7 * 86400000).toISOString();
  const ends_at = new Date(+new Date(starts_at) + 2 * 3600000).toISOString();
  const parking = expect(await request(`/parking?starts_at=${encodeURIComponent(starts_at)}&ends_at=${encodeURIComponent(ends_at)}`), 200).parking;
  const spot = parking.find(row => row.available > 0);
  assert.ok(spot, 'An active parking space is required for this integration check');
  const draft = { inventory_id: spot.inventoryId, request_id: randomUUID(), vehicle_plate: 'TEST 1234', starts_at, ends_at };
  const booking = expect(await request('/bookings', draft, tokens[0]), 201).booking;
  refs.push(booking.id);
  assert.ok(await db.collection('bookings').findOne({ booking_ref: booking.id }));
  assert.equal(expect(await request('/bookings', draft, tokens[0]), 201).booking.id, booking.id);
  assert.equal(await db.collection('bookings').countDocuments({ booking_ref: booking.id }), 1);
  const path = `/bookings/${booking.id}`;
  expect(await request(`${path}/payment-quote`, undefined, tokens[1]), 404);
  const quote = expect(await request(`${path}/payment-quote?promo_code=PARKNOVA10`, undefined, tokens[0]), 200);
  assert.equal(quote.enabled, true);
  assert.equal(quote.fee.baseCents, Math.round(booking.totalAmount * 100));
  assert.equal(quote.fee.discountCents, Math.round(quote.fee.baseCents * 0.1));
  expect(await request(`${path}/test-payment`, { method: 'cash' }, tokens[0]), 400);
  expect(await request(`${path}/payment-quote?promo_code=INVALID`, undefined, tokens[0]), 400);
  const details = { method: 'upi', upiId: 'test@bank', upiApp: 'other', promoCode: 'PARKNOVA10', amountCents: 1, status: 'paid' };
  expect(await request(`${path}/test-payment`, details, tokens[1]), 404);
  const responses = await Promise.all([request(`${path}/test-payment`, details, tokens[0]), request(`${path}/test-payment`, details, tokens[0])]);
  const payment = expect(responses[0], 200).payment;
  assert.equal(expect(responses[1], 200).payment.id, payment.id);
  assert.equal(payment.amountCents, quote.fee.totalCents, 'Client amount must be ignored');
  assert.equal(payment.isTest, true);
  assert.ok(payment.transactionId.startsWith('TEST-'));
  assert.equal(await db.collection('test_payments').countDocuments({ bookingId: booking.id }), 1);
  assert.equal(expect(await request('/payments', undefined, tokens[0]), 200).payments[0].id, payment.id);
  assert.equal(expect(await request('/payments', undefined, tokens[1]), 200).payments.length, 0);
  const admin = expect(await request('/admin/login', { adminId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }), 200);
  expect(await request('/admin/bookings', undefined, tokens[0]), 403);
  expect(await request(`/admin/bookings/${booking.id}/status`, { status: 'cancelled' }, tokens[0], 'PATCH'), 403);
  const adminBookings = expect(await request('/admin/bookings', undefined, admin.token), 200).bookings;
  assert.ok(adminBookings.some(row => row.id === booking.id && row.email === emails[0]));
  assert.ok(expect(await request('/admin/payments', undefined, admin.token), 200).payments.some(row => row.id === payment.id));
  expect(await request(`${path}/cancel`, undefined, tokens[0], 'PATCH'), 200);
  assert.equal(expect(await request('/payments', undefined, tokens[0]), 200).payments[0].status, 'refunded');
  expect(await request(`${path}/test-payment`, details, tokens[0]), 409);
  const other = expect(await request('/bookings', { ...draft, request_id: randomUUID(), vehicle_plate: 'TEST 5678' }, tokens[0]), 201).booking;
  refs.push(other.id);
  const bankPayment = expect(await request(`/bookings/${other.id}/test-payment`, { method: 'netbanking', bank: 'HDFC Bank' }, tokens[0]), 200).payment;
  assert.equal(bankPayment.method, 'Net banking · HDFC Bank');
  const adminPath = `/admin/bookings/${other.id}/status`;
  expect(await request(adminPath, { status: 'checked_in' }, admin.token, 'PATCH'), 409);
  expect(await request(adminPath, { status: 'completed' }, admin.token, 'PATCH'), 409);
  expect(await request(adminPath, { status: 'no_show' }, admin.token, 'PATCH'), 409);
  const cancelled = expect(await request(adminPath, { status: 'cancelled' }, admin.token, 'PATCH'), 200).booking;
  assert.equal(cancelled.status, 'cancelled');
  assert.ok(cancelled.timeline.some(event => event.label === 'Cancelled'));
  assert.equal((await db.collection('bookings').findOne({ booking_ref: other.id })).status, 'cancelled');
  const userHistory = expect(await request('/bookings', undefined, tokens[0]), 200).bookings;
  assert.equal(userHistory.find(row => row.id === other.id).status, 'cancelled');
  assert.equal(expect(await request('/payments', undefined, tokens[0]), 200).payments.find(row => row.bookingId === other.id).status, 'refunded');
  expect(await request(adminPath, { status: 'checked_in' }, admin.token, 'PATCH'), 409);
  const third = expect(await request('/bookings', { ...draft, request_id: randomUUID() }, tokens[0]), 201).booking;
  refs.push(third.id);
  // Move only this run's booking into its arrival window to exercise check-in.
  await db.collection('bookings').updateOne({ booking_ref: third.id }, { $set: {
    starts_at: new Date(Date.now() - 3600000), ends_at: new Date(Date.now() + 3600000),
  } });
  const thirdPath = `/admin/bookings/${third.id}/status`;
  assert.equal(expect(await request(thirdPath, { status: 'checked_in' }, admin.token, 'PATCH'), 200).booking.status, 'checked_in');
  assert.equal(expect(await request(thirdPath, { status: 'completed' }, admin.token, 'PATCH'), 200).booking.status, 'completed');
  assert.equal(expect(await request(thirdPath, { status: 'completed' }, admin.token, 'PATCH'), 200).booking.status, 'completed');
  console.log('Passed: booking persistence/retry, pricing/promo, both payment methods, duplicate prevention, user isolation, live admin booking/payment history, status validation, check-in/completion, and cancellation refunds.');
} finally {
  try {
    if (db) {
      // Remove only records belonging to this run's randomly generated accounts.
      const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
      const userIds = users.map(user => user.user_id).filter(Boolean);
      await db.collection('notifications').deleteMany({ userId: { $in: userIds } });
      await db.collection('test_payments').deleteMany({ userId: { $in: users.map(user => String(user._id)) } });
      await db.collection('booking_events').deleteMany({ bookingId: { $in: refs } });
      await db.collection('bookings').deleteMany({ user_id: { $in: userIds } });
      await db.collection('users').deleteMany({ email: { $in: emails } });
    }
  } finally { await client.close(); }
}
