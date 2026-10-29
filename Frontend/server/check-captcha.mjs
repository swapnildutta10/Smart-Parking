import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { createCaptchaFixture } from './login-fixture.mjs';

const api = process.env.AUTH_TEST_API_URL || 'http://localhost:5000/api';
const email = `captcha-check-${randomUUID()}@example.com`, password = `Check-${randomUUID()}`;
const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const ids = [];
let db;
async function request(path, body) {
  const response = await fetch(`${api}${path}`, { method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
function expect(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body; }
async function fixture(purpose, options) { const result = await createCaptchaFixture(purpose, options); ids.push(result.captchaId); return result; }
try {
  await client.connect(); db = client.db('Smart-Parking');
  expect(await request('/users/register', { name: 'CAPTCHA Check', email, password }), 201);
  const generatedResponse = await request('/auth/captcha?purpose=user');
  const generated = expect(generatedResponse, 200); ids.push(generated.id);
  assert.match(generatedResponse.headers.get('cache-control'), /no-store/);
  assert.equal('text' in generated, false); assert.equal('answer' in generated, false);
  const svg = Buffer.from(generated.image.split(',')[1], 'base64').toString();
  assert.match(svg, /<svg/); assert.match(svg, /<path/); assert.doesNotMatch(svg, /<text/);
  const saved = await db.collection('login_captchas').findOne({ _id: generated.id });
  assert.match(saved.digest, /^[a-f\d]{64}$/); assert.equal('answer' in saved, false);
  assert.ok(+saved.expiresAt > Date.now() && +saved.expiresAt <= Date.now() + 5 * 60000);
  expect(await request('/auth/captcha?purpose=invalid'), 400);
  const credentials = { email, password };
  assert.equal(expect(await request('/users/login', credentials), 400).code, 'CAPTCHA_REQUIRED');
  const wrong = await fixture('user');
  assert.equal(expect(await request('/users/login', { ...credentials, ...wrong, captchaAnswer: 'ZZZZZ' }), 400).code, 'CAPTCHA_INVALID');
  expect(await request('/users/login', { ...credentials, ...wrong }), 400);
  const expired = await fixture('user', { expired: true });
  expect(await request('/users/login', { ...credentials, ...expired }), 400);
  const good = await fixture('user');
  const login = expect(await request('/users/login', { ...credentials, ...good, captchaAnswer: good.captchaAnswer.toLowerCase() }), 200);
  assert.ok(login.token); assert.equal(login.user.email, email);
  expect(await request('/users/login', { ...credentials, ...good }), 400);
  const race = await fixture('user');
  const attempts = await Promise.all([request('/users/login', { ...credentials, ...race }), request('/users/login', { ...credentials, ...race })]);
  assert.deepEqual(attempts.map(result => result.status).sort(), [200, 400]);
  const consumed = await fixture('user');
  expect(await request('/users/login', { ...credentials, ...consumed, password: 'WrongPassword-123' }), 401);
  expect(await request('/users/login', { ...credentials, ...consumed }), 400);
  const admin = { adminId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
  expect(await request('/admin/login', admin), 400);
  const wrongPurpose = await fixture('user');
  expect(await request('/admin/login', { ...admin, ...wrongPurpose }), 400);
  const adminChallenge = await fixture('admin');
  assert.ok(expect(await request('/admin/login', { ...admin, ...adminChallenge }), 200).token);
  expect(await request('/admin/login', { ...admin, ...adminChallenge }), 400);
  console.log('Passed: image challenge generation without plaintext answers, expiry, server enforcement on both logins, wrong answers, case handling, single use, concurrent replay prevention and purpose binding.');
} finally {
  try {
    if (db) {
      await db.collection('users').deleteOne({ email });
      await db.collection('login_captchas').deleteMany({ _id: { $in: ids } });
    }
  } finally { await client.close(); }
}
