import { withTestCaptcha } from './login-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const tag = `support-check-${randomUUID()}`;
const emails = [0, 1].map(i => `${tag}-${i}@example.com`);
const password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let db;
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
    expect(await request('/users/register', { name: 'Support Check', email, password }), 201);
    tokens.push(expect(await request('/users/login', { email, password }), 200).token);
  }
  expect(await request('/support'), 401);
  expect(await request('/support', undefined, admin), 403);
  expect(await request('/admin/support', undefined, tokens[0]), 403);
  expect(await request('/support', { topic: 'invalid', message: 'Help', requestId: randomUUID() }, tokens[0]), 400);
  expect(await request('/support', { topic: 'booking', message: ' ', requestId: randomUUID() }, tokens[0]), 400);
  expect(await request('/support', { topic: 'booking', message: 'x'.repeat(4001), requestId: randomUUID() }, tokens[0]), 400);
  const payload = { topic: 'booking', message: 'Please help me find my booking reference.', requestId: randomUUID(), status: 'resolved', userId: 'forged-owner' };
  const responses = await Promise.all([request('/support', payload, tokens[0]), request('/support', payload, tokens[0])]);
  const ticket = expect(responses[0], 201).request;
  assert.equal(expect(responses[1], 201).request.id, ticket.id);
  assert.equal(ticket.status, 'open'); assert.equal(ticket.replies.length, 0);
  const account = await db.collection('users').findOne({ email: emails[0] });
  assert.equal(await db.collection('support_requests').countDocuments({ userId: String(account._id) }), 1);
  expect(await request('/support', { ...payload, message: 'Different message' }, tokens[0]), 409);
  const relogin = expect(await request('/users/login', { email: emails[0], password }), 200).token;
  const history = expect(await request('/support', undefined, relogin), 200).requests;
  assert.equal(history[0].id, ticket.id); assert.equal('userId' in history[0], false);
  assert.equal('customerEmail' in history[0], false);
  assert.equal(expect(await request('/support', undefined, tokens[1]), 200).requests.length, 0);
  const adminHistory = expect(await request('/admin/support', undefined, admin), 200).requests;
  assert.equal(adminHistory.find(row => row.id === ticket.id).customerEmail, emails[0]);
  expect(await request(`/admin/support/${ticket.id}`, { status: 'resolved' }, tokens[1], 'PATCH'), 403);
  expect(await request(`/admin/support/${ticket.id}`, { status: 'invalid' }, admin, 'PATCH'), 400);
  expect(await request(`/admin/support/${ticket.id}`, { status: 'in_progress', reply: 'x'.repeat(4001), requestId: randomUUID() }, admin, 'PATCH'), 400);
  const reply = { status: 'in_progress', reply: 'Open My bookings to view your booking reference.', requestId: randomUUID() };
  const replied = await Promise.all([request(`/admin/support/${ticket.id}`, reply, admin, 'PATCH'), request(`/admin/support/${ticket.id}`, reply, admin, 'PATCH')]);
  replied.forEach(result => expect(result, 200));
  const visibleReply = expect(await request('/support', undefined, tokens[0]), 200).requests[0];
  assert.equal(visibleReply.status, 'in_progress'); assert.equal(visibleReply.replies.length, 1);
  assert.equal(visibleReply.replies[0].message, reply.reply);
  expect(await request(`/admin/support/${ticket.id}`, { ...reply, reply: 'Changed reply' }, admin, 'PATCH'), 409);
  expect(await request(`/admin/support/${ticket.id}`, { status: 'resolved' }, admin, 'PATCH'), 200);
  assert.equal(expect(await request('/support', undefined, tokens[0]), 200).requests[0].status, 'resolved');
  assert.equal(expect(await request('/support', undefined, tokens[1]), 200).requests.length, 0);
  await db.collection('users').updateOne({ _id: account._id }, { $set: { account_status: 'suspended' } });
  expect(await request('/support', undefined, tokens[0]), 403);
  console.log('Passed: request persistence/retry, input validation, user privacy, admin inbox/replies/statuses, duplicate reply prevention and suspended-account protection.');
} finally {
  try {
    if (db) {
      const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
      await db.collection('support_requests').deleteMany({ userId: { $in: users.map(user => String(user._id)) } });
      await db.collection('users').deleteMany({ email: { $in: emails } });
    }
  } finally { await client.close(); }
}
