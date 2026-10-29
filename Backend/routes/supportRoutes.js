const crypto = require('node:crypto');
const { fail, UUID } = require('../services/parkingService');
const rateLimit = require('../middleware/rateLimit');
const topics = ['booking', 'parking', 'account', 'other'];
const statuses = ['open', 'in_progress', 'resolved'];

function mountSupport(app, { mongoose, express, requireAuth }) {
  const db = () => mongoose.connection.db;
  const tickets = () => db().collection('support_requests');
  const safe = action => async (req, res, next) => {
    try { await action(req, res); } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  };
  const present = (row, admin = false) => ({ id: row.id, topic: row.topic, message: row.message,
    status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt,
    replies: (row.replies || []).map(reply => ({ id: reply.id, message: reply.message, createdAt: reply.createdAt, author: 'Support' })),
    ...(admin ? { customerName: row.customerName, customerEmail: row.customerEmail } : {}) });
  const router = express.Router();
  router.use(requireAuth('user'), async (req, res, next) => {
    try {
      if (!/^[a-f\d]{24}$/i.test(req.auth.id)) throw fail(401, 'Sign in to contact support.');
      const user = await db().collection('users').findOne({ _id: new mongoose.mongo.ObjectId(req.auth.id) });
      if (!user || user.account_status === 'suspended') throw fail(403, 'This account cannot access support requests.');
      req.supportUser = user;
      next();
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  });
  router.get('/', safe(async (req, res) => {
    const rows = await tickets().find({ userId: String(req.supportUser._id) }).sort({ updatedAt: -1 }).toArray();
    res.json({ requests: rows.map(row => present(row)) });
  }));
  router.post('/', rateLimit({ max: 10 }), safe(async (req, res) => {
    const { topic, message, requestId } = req.body || {};
    if (!topics.includes(topic) || typeof message !== 'string' || !message.trim() || message.trim().length > 4000
      || typeof requestId !== 'string' || !UUID.test(requestId)) throw fail(400, 'Choose a topic and enter a message of 1–4,000 characters.');
    const userId = String(req.supportUser._id);
    const _id = `${userId}:${requestId}`;
    const now = Date.now();
    const row = { _id, userId, id: `SUP-${crypto.createHash('sha256').update(_id).digest('hex').slice(0, 24).toUpperCase()}`,
      customerName: req.supportUser.name, customerEmail: req.supportUser.email,
      topic, message: message.trim(), status: 'open', replies: [], createdAt: now, updatedAt: now };
    try { await tickets().updateOne({ _id }, { $setOnInsert: row }, { upsert: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
    const saved = await tickets().findOne({ _id });
    if (!saved) throw fail(503, 'Could not save the support request. Please retry.');
    if (saved.topic !== topic || saved.message !== message.trim()) throw fail(409, 'This submission was already used for a different request.');
    res.status(201).json({ request: present(saved) });
  }));
  app.use('/api/support', router);

  const admin = express.Router();
  admin.use(requireAuth('admin'));
  admin.get('/', safe(async (req, res) => {
    const rows = await tickets().find().sort({ updatedAt: -1 }).toArray();
    res.json({ requests: rows.map(row => present(row, true)) });
  }));
  admin.patch('/:id', rateLimit({ max: 60 }), safe(async (req, res) => {
    const { status, reply, requestId } = req.body || {};
    if (!/^SUP-[A-F0-9]{24}$/.test(req.params.id) || !statuses.includes(status)
      || (reply !== undefined && (typeof reply !== 'string' || reply.trim().length > 4000))) throw fail(400, 'Choose a valid status and a reply of at most 4,000 characters.');
    const text = reply?.trim();
    if (text && (typeof requestId !== 'string' || !UUID.test(requestId))) throw fail(400, 'A valid reply request ID is required.');
    const current = await tickets().findOne({ id: req.params.id });
    if (!current) throw fail(404, 'Support request not found.');
    const previous = text && current.replies?.find(item => item.id === requestId);
    if (previous) {
      if (previous.message !== text) throw fail(409, 'This reply submission was already used.');
      return res.json({ request: present(current, true) });
    }
    const now = Date.now();
    const update = { $set: { status, updatedAt: now } };
    if (text) update.$push = { replies: { id: requestId, message: text, createdAt: now } };
    await tickets().updateOne({ _id: current._id, ...(text ? { 'replies.id': { $ne: requestId } } : {}) }, update);
    const saved = await tickets().findOne({ _id: current._id });
    if (text && saved.replies.find(item => item.id === requestId)?.message !== text) throw fail(409, 'This reply submission was already used.');
    res.json({ request: present(saved, true) });
  }));
  app.use('/api/admin/support', admin);
}
module.exports = { mountSupport };
