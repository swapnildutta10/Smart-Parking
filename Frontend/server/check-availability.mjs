import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `availability-check-${randomUUID()}`, emails = [0, 1].map(i => `${tag}-${i}@example.com`), password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let db;
const inventoryIds = [], parkingIds = [];
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
    expect(await request('/users/register', { name: 'Availability Check', email, password }), 201);
    tokens.push(expect(await request('/users/login', { email, password }), 200).token);
  }
  async function add(value) {
    const spot = expect(await request('/admin/parking', value, admin), 201).parking;
    inventoryIds.push(spot.inventoryId); parkingIds.push(spot.parkingId); return spot;
  }
  const a = await add({ location: `${tag}-A`, area: 'Check area A', vehicle: 'Car', rate: '20.00', totalSlots: 2 });
  const b = await add({ location: `${tag}-B`, area: 'Check area B', vehicle: 'Car', rate: '30.00', totalSlots: 1 });
  const bike = await add({ parkingId: a.parkingId, vehicle: 'Two wheeler', rate: '10.00', totalSlots: 3 });
  const start = Date.now() + 86400000, end = start + 2 * 3600000;
  const query = (from = start, to = end, parkingId) => `/availability?${new URLSearchParams({ starts_at: new Date(from).toISOString(), ends_at: new Date(to).toISOString(), ...(parkingId ? { parking_id: parkingId } : {}) })}`;
  for (const path of ['/availability?parking_id=invalid', '/availability?starts_at=invalid', query(end, start), query(start, start + 25 * 3600000), query(Date.now() - 86400000, Date.now() - 82800000)]) expect(await request(path), 400);
  expect(await request(`/availability?parking_id=${randomUUID()}`), 404);
  const initial = expect(await request(query()), 200);
  assert.equal(initial.mode, 'window'); assert.equal(initial.refreshIntervalSeconds, 10);
  const locA = initial.locations.find(row => row.parkingId === a.parkingId);
  assert.equal(locA.totalSlots, 5); assert.equal(locA.available, 5); assert.equal(locA.inventory.length, 2);
  async function book(spot, from, to, token = tokens[0]) {
    return request('/bookings', { inventory_id: spot.inventoryId, request_id: randomUUID(), vehicle_plate: 'CHECK 1234', starts_at: new Date(from).toISOString(), ends_at: new Date(to).toISOString() }, token);
  }
  expect(await book(a, start, start + 3600000), 201);
  expect(await book(a, start + 3600000, end), 201);
  const sequential = expect(await request(query(start, end, a.parkingId)), 200);
  assert.equal(sequential.locations.length, 1);
  assert.equal(sequential.locations[0].inventory.find(row => row.inventoryId === a.inventoryId).available, 1, 'Sequential bookings must use peak occupancy rather than their total count');
  const overlap = expect(await book(a, start, end), 201).booking;
  const fullA = expect(await request(query(start, end, a.parkingId)), 200).locations[0];
  assert.equal(fullA.available, 3); assert.equal(fullA.reserved, 2);
  assert.equal(fullA.inventory.find(row => row.inventoryId === a.inventoryId).available, 0);
  assert.equal(fullA.inventory.find(row => row.inventoryId === bike.inventoryId).available, 3);
  const race = await Promise.all([book(b, start, end, tokens[0]), book(b, start, end, tokens[1])]);
  assert.deepEqual(race.map(result => result.status).sort(), [201, 409], 'Only one user may reserve the final space');
  const winner = race.find(result => result.status === 201).body.booking;
  const fullB = expect(await request(query(start, end, b.parkingId)), 200).locations[0];
  assert.equal(fullB.available, 0); assert.equal(fullB.totalSlots, 1);
  const outside = expect(await request(query(end, end + 3600000)), 200);
  assert.equal(outside.locations.find(row => row.parkingId === a.parkingId).available, 5);
  assert.equal(outside.locations.find(row => row.parkingId === b.parkingId).available, 1);
  expect(await request(`/bookings/${overlap.id}/cancel`, undefined, tokens[0], 'PATCH'), 200);
  assert.equal(expect(await request(query(start, end, a.parkingId)), 200).locations[0].inventory.find(row => row.inventoryId === a.inventoryId).available, 1);
  await db.collection('bookings').updateOne({ booking_ref: winner.id }, { $set: { starts_at: new Date(Date.now() - 60000), ends_at: new Date(Date.now() + 3600000) } });
  const current = expect(await request('/availability'), 200);
  assert.equal(current.mode, 'now'); assert.equal(current.locations.find(row => row.parkingId === b.parkingId).available, 0);
  assert.equal(expect(await request(query(start, end, b.parkingId)), 200).locations[0].available, 1);
  expect(await request(`/admin/parking/${bike.inventoryId}`, undefined, admin, 'DELETE'), 200);
  assert.equal(expect(await request(query(start, end, a.parkingId)), 200).locations[0].totalSlots, 2);
  const serialized = JSON.stringify(current);
  assert.equal(serialized.includes(winner.id), false); assert.equal(serialized.includes(emails[0]), false);
  console.log('Passed: multiple locations and vehicle types, planned/current windows, peak occupancy, end-boundary handling, cancellation updates, last-space race protection, inactive inventory and public-data privacy.');
} finally {
  try {
    if (db) {
      const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
      const ids = users.map(user => user.user_id).filter(Boolean);
      await db.collection('notifications').deleteMany({ userId: { $in: ids } });
      await db.collection('bookings').deleteMany({ user_id: { $in: ids } });
      await db.collection('parking_inventory').deleteMany({ inventory_id: { $in: inventoryIds } });
      await db.collection('parking_locations').deleteMany({ parking_id: { $in: parkingIds } });
      await db.collection('users').deleteMany({ email: { $in: emails } });
    }
  } finally { await client.close(); }
}
