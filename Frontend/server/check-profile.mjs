import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `profile-check-${randomUUID()}`, emails = [0, 1, 2].map(i => `${tag}-${i}@example.com`);
const password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let db;
const accountIds = [];
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
  const tokens = [];
  for (const email of emails.slice(0, 2)) {
    const created = expect(await request('/users/register', { name: 'Profile Check', email, password }), 201).user;
    accountIds.push(created.id);
    tokens.push(expect(await request('/users/login', { email, password }), 200).token);
  }
  expect(await request('/users/profile'), 401);
  expect(await request('/users/profile', { name: 'Changed', email: emails[2] }, undefined, 'PATCH'), 401);
  const initial = expect(await request('/users/profile', undefined, tokens[0]), 200).user;
  assert.equal(initial.email, emails[0]); assert.equal(initial.phone, '');
  assert.equal('passwordHash' in initial, false);
  const original = await db.collection('users').findOne({ email: emails[0] });
  const payload = { name: '  Updated Driver  ', email: emails[2].toUpperCase(), phone: '+91 (98765) 43210', id: accountIds[1], role: 'admin' };
  const updated = expect(await request('/users/profile', payload, tokens[0], 'PATCH'), 200).user;
  assert.equal(updated.id, accountIds[0]); assert.equal(updated.name, 'Updated Driver');
  assert.equal(updated.email, emails[2]); assert.equal(updated.phone, '+919876543210');
  const stored = await db.collection('users').findOne({ _id: original._id });
  assert.equal(stored.phone, updated.phone); assert.equal(stored.passwordHash, original.passwordHash);
  assert.equal(stored.role, undefined);
  assert.equal((await db.collection('users').findOne({ email: emails[1] })).name, 'Profile Check');
  const readBack = expect(await request('/users/profile', undefined, tokens[0]), 200).user;
  assert.equal(readBack.phone, updated.phone); assert.equal(readBack.email, emails[2]);
  expect(await request('/users/login', { email: emails[0], password }), 401);
  const relogin = expect(await request('/users/login', { email: emails[2], password }), 200);
  assert.equal(relogin.user.id, accountIds[0]); assert.equal(relogin.user.phone, updated.phone);
  expect(await request('/users/profile', { name: 'Valid', email: emails[1], phone: '' }, relogin.token, 'PATCH'), 409);
  for (const body of [
    { name: ' ', email: emails[2], phone: '' }, { name: 'Valid', email: 'invalid', phone: '' },
    { name: 'Valid', email: emails[2], phone: '123' }, { name: 'Valid', email: emails[2], phone: 'abc1234567' },
    { name: 'Valid', email: emails[2], phone: { value: '1234567890' } },
  ]) expect(await request('/users/profile', body, relogin.token, 'PATCH'), 400);
  const preserved = expect(await request('/users/profile', { name: 'Still Updated', email: emails[2] }, relogin.token, 'PATCH'), 200).user;
  assert.equal(preserved.phone, '+919876543210', 'Omitted phone must preserve the saved value');
  const cleared = expect(await request('/users/profile', { name: 'Still Updated', email: emails[2], phone: '' }, relogin.token, 'PATCH'), 200).user;
  assert.equal(cleared.phone, '');
  const own = expect(await request(`/users/profile?id=${accountIds[1]}`, undefined, relogin.token), 200).user;
  assert.equal(own.id, accountIds[0]);
  const admin = expect(await request('/admin/login', { adminId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }), 200).token;
  expect(await request('/users/profile', undefined, admin), 403);
  await db.collection('users').updateOne({ _id: original._id }, { $set: { account_status: 'suspended' } });
  expect(await request('/users/profile', undefined, relogin.token), 403);
  expect(await request('/users/profile', { name: 'Valid', email: emails[2] }, relogin.token, 'PATCH'), 403);
  console.log('Passed: private profile reads, name/email/phone persistence, normalized phone, new-email login, password preservation, duplicate/invalid input rejection, phone clearing and account isolation.');
} finally {
  try { if (db) await db.collection('users').deleteMany({ email: { $in: emails } }); }
  finally { await client.close(); }
}
