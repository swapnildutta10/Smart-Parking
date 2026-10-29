// Automated integration fixtures only; never imported by either app or the API.
import { randomBytes, createHmac } from 'node:crypto';
import { MongoClient } from 'mongodb';

export async function createCaptchaFixture(purpose, { answer = 'A7BCD', expired = false } = {}) {
  const id = randomBytes(24).toString('hex');
  const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const digest = createHmac('sha256', process.env.JWT_SECRET).update(`${id}:${purpose}:${answer.toUpperCase()}`).digest('hex');
    await client.db('Smart-Parking').collection('login_captchas').insertOne({ _id: id, purpose, digest,
      expiresAt: new Date(Date.now() + (expired ? -60000 : 60000)), testFixture: true });
  } finally { await client.close(); }
  return { captchaId: id, captchaAnswer: answer };
}

export async function withTestCaptcha(path, body) {
  if (!body || !['/users/login', '/admin/login'].includes(path) || body.captchaId) return body;
  return { ...body, ...await createCaptchaFixture(path === '/admin/login' ? 'admin' : 'user') };
}
