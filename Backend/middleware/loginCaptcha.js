const crypto = require('node:crypto');
const svgCaptcha = require('svg-captcha');
const createRateLimiter = require('../middleware/rateLimit');
const PURPOSES = ['user', 'admin'];
const hashAnswer = (id, purpose, answer) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${id}:${purpose}:${answer}`).digest('hex');

async function ensureCaptchaIndex(db) {
  await db.collection('login_captchas').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

function mountCaptcha(app, { mongoose }) {
  app.get('/api/auth/captcha', createRateLimiter({ max: 50 }), async (req, res, next) => {
    try {
      const purpose = req.query.purpose;
      if (!PURPOSES.includes(purpose)) return res.status(400).json({ message: 'Choose a valid login form.' });
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const answer = Array.from({ length: 5 }, () => chars[crypto.randomInt(chars.length)]).join('');
      const id = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60000);
      const image = svgCaptcha(answer, { width: 190, height: 66, fontSize: 43, noise: 4, color: false, background: '#eef5f1' });
      await mongoose.connection.db.collection('login_captchas').insertOne({ _id: id, purpose, digest: hashAnswer(id, purpose, answer), expiresAt });
      res.set('Cache-Control', 'no-store');
      res.json({ id, image: `data:image/svg+xml;base64,${Buffer.from(image).toString('base64')}`, expiresAt: expiresAt.toISOString() });
    } catch (error) { next(error); }
  });
}

function requireCaptcha(purpose) {
  return async (req, res, next) => {
    try {
      const { captchaId, captchaAnswer } = req.body || {};
      if (typeof captchaId !== 'string' || !/^[a-f\d]{48}$/.test(captchaId)
        || typeof captchaAnswer !== 'string' || !captchaAnswer.trim() || captchaAnswer.length > 20) {
        return res.status(400).json({ code: 'CAPTCHA_REQUIRED', message: 'Enter the characters shown in the CAPTCHA image.' });
      }
      const mongoose = require('mongoose');
      const challenge = await mongoose.connection.db.collection('login_captchas').findOneAndDelete({ _id: captchaId, purpose });
      const candidate = hashAnswer(captchaId, purpose, captchaAnswer.trim().toUpperCase());
      const valid = challenge && +challenge.expiresAt > Date.now() && typeof challenge.digest === 'string'
        && /^[a-f\d]{64}$/.test(challenge.digest) && crypto.timingSafeEqual(Buffer.from(challenge.digest, 'hex'), Buffer.from(candidate, 'hex'));
      if (!valid) return res.status(400).json({ code: 'CAPTCHA_INVALID', message: 'The CAPTCHA is incorrect, expired or already used. Please try a new image.' });
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { mountCaptcha, requireCaptcha, ensureCaptchaIndex };
