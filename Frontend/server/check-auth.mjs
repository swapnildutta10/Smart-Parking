import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

// Uses the existing backend configuration. Only the generated test user is removed.
const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const email = `auth-check-${randomUUID()}@example.com`;
const password = `Test-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
});
let users;
async function request(path, body, token) {
  body = await withTestCaptcha(path, body);
  const response = await fetch(`${api}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}
try {
  await client.connect();
  users = client.db('Smart-Parking').collection('users');
  const registration = await request('/users/register', { name: 'Authentication Check', email, password });
  assert.equal(registration.status, 201);
  const stored = await users.findOne({ email });
  assert.ok(stored, 'Registration must persist the user in MongoDB');
  assert.ok(stored.passwordHash && stored.passwordHash !== password, 'Password must be hashed');
  assert.equal('passwordHash' in registration.body.user, false);
  assert.equal((await request('/users/register', { name: 'Duplicate', email, password })).status, 409);
  assert.equal((await request('/users/login', { email, password: 'incorrect-password' })).status, 401);
  const login = await request('/users/login', { email: email.toUpperCase(), password });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.equal(login.body.user.id, registration.body.user.id);
  assert.equal('passwordHash' in login.body.user, false);
  const profile = await request('/users/profile', undefined, login.body.token);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.email, email);
  assert.equal((await request('/users/profile')).status, 401);
  console.log('Passed: MongoDB persistence, password hashing, duplicate rejection, wrong-password rejection, login and authenticated profile.');
} finally {
  try {
    if (users) await users.deleteOne({ email });
  } finally {
    await client.close();
  }
}
