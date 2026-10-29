import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `catalog-check-${randomUUID()}`;
const emails = [0, 1].map(i => `${tag}-${i}@example.com`);
const password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let db, locationId;
const inventoryIds = [];
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
    expect(await request('/users/register', { name: 'Catalog Integration Check', email, password }), 201);
    tokens.push(expect(await request('/users/login', { email, password }), 200).token);
  }
  expect(await request('/admin/locations'), 401);
  expect(await request('/admin/locations', { name: tag, address: 'Check address' }, tokens[0]), 403);
  expect(await request('/admin/locations', { name: ' ', address: 'Check address' }, admin), 400);
  const location = expect(await request('/admin/locations', { name: tag, address: 'Check address' }, admin), 201).location;
  locationId = location.id;
  assert.ok(await db.collection('parking_locations').findOne({ parking_id: locationId }));
  assert.ok(expect(await request('/admin/locations', undefined, admin), 200).locations.some(row => row.id === locationId));
  const value = { parkingId: locationId, vehicle: 'Car', rate: '19.25', totalSlots: 3 };
  for (const vehicle of ['Car', 'Two wheeler']) {
    const row = expect(await request('/admin/parking', { ...value, vehicle }, admin), 201).parking;
    inventoryIds.push(row.inventoryId);
    assert.equal(row.parkingId, locationId); assert.equal(row.location, tag); assert.equal(row.area, 'Check address');
  }
  expect(await request('/admin/parking', value, admin), 409);
  assert.ok(await db.collection('parking_locations').findOne({ parking_id: locationId }), 'Failed inventory creation must not remove a shared location');
  expect(await request('/admin/parking', { ...value, parkingId: randomUUID() }, admin), 404);
  const updated = expect(await request(`/admin/parking/${inventoryIds[0]}`, { ...value, rate: '20.50' }, admin, 'PATCH'), 200).parking;
  assert.equal(updated.parkingId, locationId); assert.equal(updated.rate, 20.5);
  const publicRows = expect(await request('/parking'), 200).parking.filter(row => inventoryIds.includes(row.inventoryId));
  assert.equal(publicRows.length, 2); assert.ok(publicRows.every(row => row.location === tag));
  expect(await request('/vehicles'), 401);
  expect(await request('/vehicles', undefined, admin), 403);
  expect(await request('/vehicles', { type: 'Car', plate: '<invalid>' }, tokens[0]), 400);
  expect(await request('/vehicles', { type: 'EV', plate: 'WB20AB1234' }, tokens[0]), 400);
  const vehicle = expect(await request('/vehicles', { type: 'Car', plate: 'wb 20-ab 1234' }, tokens[0]), 201).vehicle;
  assert.equal(vehicle.plate, 'WB20AB1234');
  assert.ok(await db.collection('saved_vehicles').findOne({ vehicle_id: vehicle.id }));
  assert.equal(expect(await request('/vehicles', undefined, tokens[0]), 200).vehicles[0].id, vehicle.id);
  assert.equal(expect(await request('/vehicles', undefined, tokens[1]), 200).vehicles.length, 0);
  expect(await request('/vehicles', { type: 'Car', plate: 'WB20AB1234' }, tokens[0]), 409);
  expect(await request(`/vehicles/${vehicle.id}`, undefined, tokens[1], 'DELETE'), 404);
  expect(await request('/vehicles', { type: 'Car', plate: 'WB20AB1234' }, tokens[1]), 201);
  expect(await request(`/vehicles/${vehicle.id}`, undefined, tokens[0], 'DELETE'), 200);
  assert.equal(expect(await request('/vehicles', undefined, tokens[0]), 200).vehicles.length, 0);
  console.log('Passed: location creation, linked inventory and public listings, duplicate inventory handling, saved vehicle persistence/normalization, duplicate prevention and account isolation.');
} finally {
  try {
    if (db) {
      const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
      await db.collection('saved_vehicles').deleteMany({ user_id: { $in: users.map(user => user.user_id).filter(Boolean) } });
      if (locationId) await db.collection('parking_inventory').deleteMany({ parking_id: locationId });
      await db.collection('parking_locations').deleteMany({ location_name: tag });
      await db.collection('users').deleteMany({ email: { $in: emails } });
    }
  } finally { await client.close(); }
}
