const crypto = require('node:crypto');
const svgCaptcha = require('svg-captcha');
const createRateLimiter = require('../middleware/rateLimit');
const PURPOSES = ['user', 'admin'];
const hashAnswer = (id, purpose, answer) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${id}:${purpose}:${answer}`).digest('hex');

async function ensureCaptchaIndex(db) {
  await db.collection('login_captchas').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

function createTrafficScene(lightTiles) {
  const signals = lightTiles.map(index => {
    const column = index % 4, row = Math.floor(index / 4), x = column * 90 + 45, y = row * 70 + 35;
    return `<g transform="translate(${x} ${y})"><path d="M0 40V-18" stroke="#343a3c" stroke-width="5"/><rect x="-9" y="-38" width="18" height="40" rx="7" fill="#22292d" stroke="#111719" stroke-width="2"/><circle cy="-29" r="3" fill="#ef534c"/><circle cy="-18" r="3" fill="#e9b943"/><circle cy="-7" r="3.5" fill="#49d88a"/><path d="M-18 41h36" stroke="#555b5b" stroke-width="3"/></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 280"><defs><linearGradient id="sky" y2="1"><stop stop-color="#b9d0d6"/><stop offset="1" stop-color="#e4e2d0"/></linearGradient><linearGradient id="road" y2="1"><stop stop-color="#626b69"/><stop offset="1" stop-color="#303839"/></linearGradient></defs><rect width="360" height="280" fill="url(#sky)"/><circle cx="288" cy="38" r="22" fill="#f8e9ba" opacity=".72"/><path d="M0 106h360v60H0z" fill="#84918a"/><path d="M0 130h360v35H0z" fill="#717b76"/><g fill="#778783"><path d="M0 74h42v60H0zM48 91h37v42H48zM94 67h48v67H94zM239 80h40v54h-40zM284 65h76v70h-76z"/></g><g fill="#d9cba6"><path d="M8 84h7v8H8zm16 0h7v8h-7zM104 78h8v8h-8zm18 0h8v8h-8zM296 77h9v9h-9zm20 0h9v9h-9z"/></g><path d="M0 145h360v135H0z" fill="url(#road)"/><path d="M168 150h24l38 130h-88z" fill="#525c5c"/><path d="M177 172h6v19h-6zm0 34h6v23h-6zm0 42h6v25h-6z" fill="#ded7b5"/><path d="M0 153h360" stroke="#c4c3a9" stroke-width="3"/><g fill="#394947"><path d="M9 137l10-27 10 27zm14 0l9-22 9 22zm281 0l12-30 13 30zm24 0l10-23 10 23z"/></g><g fill="#292f30"><path d="M39 208h30l9 18v16H32v-16zM284 188h27l9 16v15h-41v-15z"/><circle cx="44" cy="243" r="5" fill="#1b1e20"/><circle cx="68" cy="243" r="5" fill="#1b1e20"/><circle cx="286" cy="221" r="5" fill="#1b1e20"/><circle cx="310" cy="221" r="5" fill="#1b1e20"/></g>${signals}<path d="M90 0v280M180 0v280M270 0v280" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="1"/></svg>`;
}
function mountCaptcha(app, { mongoose }) {
  app.get('/api/auth/captcha', createRateLimiter({ max: 50 }), async (req, res, next) => {
    try {
      const purpose = req.query.purpose;
      if (!PURPOSES.includes(purpose)) return res.status(400).json({ message: 'Choose a valid login form.' });
      const id = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60000);
      let answer, image, answerMode;
      if (purpose === 'user') {
        const shuffled = Array.from({ length: 16 }, (_, index) => index);
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
          const swap = crypto.randomInt(index + 1);
          [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
        }
        answer = shuffled.slice(0, crypto.randomInt(4, 7)).sort((a, b) => a - b).join(',');
        answerMode = 'tiles';
        image = createTrafficScene(answer.split(',').map(Number));
      } else {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        answer = Array.from({ length: 5 }, () => chars[crypto.randomInt(chars.length)]).join('');
        image = svgCaptcha(answer, { width: 250, height: 80, fontSize: 56, noise: 0, color: false });
      }
      await mongoose.connection.db.collection('login_captchas').insertOne({ _id: id, purpose, answerMode, digest: hashAnswer(id, purpose, answer), expiresAt });
      res.set('Cache-Control', 'no-store');
      res.json({ id, image: `data:image/svg+xml;base64,${Buffer.from(image).toString('base64')}`, ...(answerMode === 'tiles' ? { gridSize: 4, prompt: 'Select all squares with traffic lights' } : {}), expiresAt: expiresAt.toISOString() });
    } catch (error) { next(error); }
  });
}

function requireCaptcha(purpose) {
  return async (req, res, next) => {
    try {
      const { captchaId, captchaAnswer } = req.body || {};
      if (typeof captchaId !== 'string' || !/^[a-f\d]{48}$/.test(captchaId)
        || typeof captchaAnswer !== 'string' || !captchaAnswer.trim() || captchaAnswer.length > 48) {
        return res.status(400).json({ code: 'CAPTCHA_REQUIRED', message: 'Select every square containing a traffic light.' });
      }
      const mongoose = require('mongoose');
      const challenge = await mongoose.connection.db.collection('login_captchas').findOneAndDelete({ _id: captchaId, purpose });
      let normalizedAnswer = captchaAnswer.trim().toUpperCase();
      if (challenge?.answerMode === 'tiles') {
        const parts = normalizedAnswer.split(',');
        const tiles = parts.map(Number);
        const validTiles = parts.length >= 1 && parts.length <= 16 && parts.every(part => /^\d{1,2}$/.test(part))
          && tiles.every((tile, index) => tile >= 0 && tile < 16 && (index === 0 || tiles[index - 1] < tile));
        if (!validTiles) normalizedAnswer = 'INVALID_TILE_SELECTION';
      }
      const candidate = hashAnswer(captchaId, purpose, normalizedAnswer);
      const valid = challenge && +challenge.expiresAt > Date.now() && typeof challenge.digest === 'string'
        && /^[a-f\d]{64}$/.test(challenge.digest) && crypto.timingSafeEqual(Buffer.from(challenge.digest, 'hex'), Buffer.from(candidate, 'hex'));
      if (!valid) return res.status(400).json({ code: 'CAPTCHA_INVALID', message: 'The CAPTCHA is incorrect, expired or already used. Please try a new image.' });
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { mountCaptcha, requireCaptcha, ensureCaptchaIndex };
