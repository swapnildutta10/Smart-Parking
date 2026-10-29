import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const tag = `slot-check-${randomUUID()}`;
const email = `${tag}@example.com`;
const password = `Check-${randomUUID()}`;
let db, inventoryId;
const locationIds = new Set();
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
  await client.connect(); db = client.db('Smart-Parking');
  const admin = expect(await request('/admin/login', { adminId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }), 200).token;
  expect(await request('/users/register', { name: 'Parking CRUD Check', email, password }), 201);
  const user = expect(await request('/users/login', { email, password }), 200).token;
  const value = { location: tag, area: 'Integration check address', vehicle: 'Car', rate: '25.50', totalSlots: 2 };
  expect(await request('/admin/parking'), 401);
  expect(await request('/admin/parking', value, user), 403);
  expect(await request('/admin/parking', { ...value, totalSlots: -1 }, admin), 400);
  expect(await request('/admin/parking', { ...value, rate: '1.234' }, admin), 400);
  expect(await request('/admin/parking', { ...value, vehicle: 'EV' }, admin), 400);
  const created = expect(await request('/admin/parking', value, admin), 201).parking;
  inventoryId = created.inventoryId; locationIds.add(created.parkingId);
  assert.equal(created.totalSlots, 2); assert.equal(created.rate, 25.5);
  assert.equal(created.available, 2);
  const path = `/admin/parking/${inventoryId}`;
  expect(await request(path, value, user, 'PATCH'), 403);
  expect(await request(path, undefined, user, 'DELETE'), 403);
  const updatedValue = { ...value, location: `${tag}-updated`, area: 'Updated address', vehicle: 'SUV / Van', rate: '31.25' };
  const updated = expect(await request(path, updatedValue, admin, 'PATCH'), 200).parking;
  locationIds.add(updated.parkingId);
  assert.equal(updated.inventoryId, inventoryId);
  assert.equal(updated.location, updatedValue.location);
  assert.equal(updated.area, updatedValue.area); assert.equal(updated.rate, 31.25);
  assert.equal(updated.vehicle, 'SUV / Van');
  assert.ok(expect(await request('/admin/parking', undefined, admin), 200).parking.some(row => row.inventoryId === inventoryId));
  assert.ok(expect(await request('/parking'), 200).parking.some(row => row.inventoryId === inventoryId && row.rate === 31.25));
  const starts_at = new Date(Date.now() + 86400000).toISOString();
  const ends_at = new Date(+new Date(starts_at) + 2 * 3600000).toISOString();
  const refs = [];
  for (let i = 0; i < 2; i++) {
    const booking = expect(await request('/bookings', { inventory_id: inventoryId, request_id: randomUUID(), vehicle_plate: `CHECK ${i}234`, starts_at, ends_at }, user), 201).booking;
    refs.push(booking.id); assert.equal(booking.totalAmount, 62.5);
  }
  expect(await request(path, undefined, admin, 'DELETE'), 409);
  expect(await request(path, { ...updatedValue, totalSlots: 1 }, admin, 'PATCH'), 409);
  expect(await request(path, { ...updatedValue, location: 'Cannot move a reservation' }, admin, 'PATCH'), 409);
  const priceUpdate = expect(await request(path, { ...updatedValue, rate: '40.00', totalSlots: 3 }, admin, 'PATCH'), 200).parking;
  assert.equal(priceUpdate.rate, 40); assert.equal(priceUpdate.totalSlots, 3);
  const query = new URLSearchParams({ starts_at, ends_at });
  assert.equal(expect(await request(`/parking?${query}`), 200).parking.find(row => row.inventoryId === inventoryId).available, 1);
  const history = expect(await request('/bookings', undefined, user), 200).bookings;
  assert.ok(history.every(row => row.rate === 31.25 && row.totalAmount === 62.5), 'Booked prices must remain unchanged');
  for (const ref of refs) expect(await request(`/bookings/${ref}/cancel`, undefined, user, 'PATCH'), 200);
  expect(await request(path, undefined, admin, 'DELETE'), 200);
  assert.equal((await db.collection('parking_inventory').findOne({ inventory_id: inventoryId })).status, 'inactive');
  assert.equal(expect(await request('/parking'), 200).parking.some(row => row.inventoryId === inventoryId), false);
  assert.equal(expect(await request('/admin/parking', undefined, admin), 200).parking.some(row => row.inventoryId === inventoryId), false);
  assert.equal(expect(await request('/bookings', undefined, user), 200).bookings.length, 2, 'Deletion must preserve past booking history');
  expect(await request('/bookings', { inventory_id: inventoryId, request_id: randomUUID(), vehicle_plate: 'CHECK 9999', starts_at, ends_at }, user), 404);
  expect(await request(path, updatedValue, admin, 'PATCH'), 404);
  console.log('Passed: admin-only CRUD, validation, MongoDB persistence, public listing sync, booked-price preservation, reservation/capacity protection and history-preserving deletion.');
} finally {
  try {
    if (db) {
      // All cleanup is restricted to this run's unique user and generated inventory.
      const account = await db.collection('users').findOne({ email });
      if (account?.user_id) await db.collection('notifications').deleteMany({ userId: account.user_id });
      if (account?.user_id) await db.collection('bookings').deleteMany({ user_id: account.user_id });
      if (inventoryId) await db.collection('parking_inventory').deleteOne({ inventory_id: inventoryId });
      const locations = await db.collection('parking_locations').find({ location_name: { $in: [tag, `${tag}-updated`] } }).toArray();
      for (const location of locations) locationIds.add(location.parking_id);
      await db.collection('parking_locations').deleteMany({ parking_id: { $in: [...locationIds] } });
      await db.collection('users').deleteOne({ email });
    }
  } finally { await client.close(); }
}
