import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `saved-check-${randomUUID()}`;
const emails = [0, 1].map(i => `${tag}-${i}@example.com`);
const password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let db, inventoryId, parkingId;
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
    expect(await request('/users/register', { name: 'Saved Location Check', email, password }), 201);
    tokens.push(expect(await request('/users/login', { email, password }), 200).token);
  }
  const spot = expect(await request('/admin/parking', { location: tag, area: 'Integration check', vehicle: 'Car', rate: '12.50', totalSlots: 2 }, admin), 201).parking;
  inventoryId = spot.inventoryId; parkingId = spot.parkingId;
  expect(await request('/saved-locations'), 401);
  expect(await request('/saved-locations', undefined, admin), 403);
  expect(await request('/saved-locations', { inventoryId: 'invalid' }, tokens[0]), 400);
  expect(await request('/saved-locations', { inventoryId: randomUUID() }, tokens[0]), 404);
  const responses = await Promise.all([0, 1].map(() => request('/saved-locations', { inventoryId }, tokens[0])));
  responses.forEach(result => expect(result, 200));
  const account = await db.collection('users').findOne({ email: emails[0] });
  assert.equal(await db.collection('saved_locations').countDocuments({ userId: String(account._id), inventoryId }), 1);
  const reLogin = expect(await request('/users/login', { email: emails[0], password }), 200).token;
  const restored = expect(await request('/saved-locations', undefined, reLogin), 200).locations;
  assert.equal(restored.length, 1); assert.equal(restored[0].inventoryId, inventoryId);
  assert.equal(restored[0].location, tag); assert.equal(restored[0].unavailable, false);
  assert.equal(expect(await request('/saved-locations', undefined, tokens[1]), 200).locations.length, 0);
  expect(await request(`/saved-locations/${inventoryId}`, undefined, tokens[1], 'DELETE'), 200);
  assert.equal(expect(await request('/saved-locations', undefined, tokens[0]), 200).locations.length, 1);
  // Supplied owner fields must not let a caller write to another account.
  expect(await request('/saved-locations', { inventoryId, userId: String(account._id) }, tokens[1]), 200);
  assert.equal(await db.collection('saved_locations').countDocuments({ inventoryId }), 2);
  expect(await request(`/saved-locations/${inventoryId}`, undefined, tokens[0], 'DELETE'), 200);
  assert.equal(expect(await request('/saved-locations', undefined, tokens[0]), 200).locations.length, 0);
  assert.equal(expect(await request('/saved-locations', undefined, tokens[1]), 200).locations.length, 1);
  expect(await request(`/admin/parking/${inventoryId}`, undefined, admin, 'DELETE'), 200);
  const unavailable = expect(await request('/saved-locations', undefined, tokens[1]), 200).locations;
  assert.equal(unavailable[0].unavailable, true); assert.equal(unavailable[0].location, tag);
  expect(await request('/saved-locations', { inventoryId }, tokens[0]), 404);
  expect(await request(`/saved-locations/${inventoryId}`, undefined, tokens[1], 'DELETE'), 200);
  assert.equal(expect(await request('/saved-locations', undefined, tokens[1]), 200).locations.length, 0);
  expect(await request(`/saved-locations/${inventoryId}`, undefined, tokens[1], 'DELETE'), 200);
  await db.collection('users').updateOne({ _id: account._id }, { $set: { account_status: 'suspended' } });
  expect(await request('/saved-locations', undefined, tokens[0]), 403);
  console.log('Passed: persistence after sign-in, concurrent duplicate prevention, private account ownership, unavailable locations, removal and suspended-account protection.');
} finally {
  try {
    if (db) {
      const accounts = await db.collection('users').find({ email: { $in: emails } }).toArray();
      await db.collection('saved_locations').deleteMany({ userId: { $in: accounts.map(account => String(account._id)) } });
      if (inventoryId) await db.collection('parking_inventory').deleteOne({ inventory_id: inventoryId });
      if (parkingId) await db.collection('parking_locations').deleteOne({ parking_id: parkingId });
      await db.collection('users').deleteMany({ email: { $in: emails } });
    }
  } finally { await client.close(); }
}
