const { publishAvailabilityChange } = require('../services/availabilityEvents');
const crypto = require('node:crypto');
const { createService, fail } = require('../services/parkingService');
const rateLimit = require('../middleware/rateLimit');

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'];
const APPS = { gpay: 'Google Pay', phonepe: 'PhonePe', paytm: 'Paytm', other: 'Other UPI' };

function quote(booking, promoCode = '') {
  if (typeof promoCode !== 'string' || promoCode.length > 30) throw fail(400, 'Invalid promo code.');
  const code = promoCode.trim().toUpperCase();
  if (code && code !== 'PARKNOVA10') throw fail(400, 'That promo code is not valid.');
  const baseCents = Math.round(Number(booking.total_amount.toString()) * 100);
  if (!Number.isSafeInteger(baseCents) || baseCents < 0) throw fail(409, 'This booking needs administrator review.');
  const discountCents = code ? Math.round(baseCents * 0.1) : 0;
  const serviceFeeCents = 50;
  const taxCents = Math.round((baseCents - discountCents + serviceFeeCents) * 0.05);
  return { description: `${Math.ceil((+booking.ends_at - +booking.starts_at) / 3600000)} billed hours`,
    baseCents, discountCents, serviceFeeCents, taxCents, promoCode: code,
    totalCents: baseCents - discountCents + serviceFeeCents + taxCents };
}

function mountPayments(app, { mongoose, express, requireAuth }) {
  const router = express.Router();
  const db = () => mongoose.connection.db;
  const safe = fn => async (req, res, next) => {
    try { await fn(req, res); } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  };
  const enabled = () => process.env.TEST_PAYMENTS_ENABLED === 'true'
    || (process.env.TEST_PAYMENTS_ENABLED !== 'false' && process.env.NODE_ENV !== 'production');
  const userAuth = [requireAuth('user'), async (req, res, next) => {
    try {
      if (!/^[a-f\d]{24}$/i.test(req.auth.id)) throw fail(401, 'Sign in again.');
      const user = await db().collection('users').findOne({ _id: new mongoose.mongo.ObjectId(req.auth.id) });
      if (!user || user.account_status === 'suspended') throw fail(403, 'This account cannot make payments.');
      req.paymentUser = user;
      next();
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  }];
  async function owned(req) {
    if (typeof req.params.ref !== 'string' || !/^PN-[A-F0-9]{24}$/.test(req.params.ref)) throw fail(400, 'Invalid booking reference.');
    const booking = await db().collection('bookings').findOne({ booking_ref: req.params.ref, user_id: req.paymentUser.user_id });
    if (!booking) throw fail(404, 'Booking not found.');
    return booking;
  }
  async function history(filter) {
    const records = await db().collection('test_payments').find(filter).sort({ paidAt: -1 }).toArray();
    return records.map(({ _id, userId, ...payment }) => payment);
  }
  router.get('/payments', ...userAuth, safe(async (req, res) => {
    res.json({ payments: await history({ userId: String(req.paymentUser._id) }) });
  }));
  router.get('/admin/payments', requireAuth('admin'), safe(async (req, res) => {
    res.json({ payments: await history({}) });
  }));
  router.get('/bookings/:ref/payment-quote', ...userAuth, safe(async (req, res) => {
    const booking = await owned(req);
    if (!['upcoming', 'checked_in'].includes(booking.status)) throw fail(409, 'This booking cannot be paid.');
    res.json({ fee: quote(booking, req.query.promo_code || ''), isTest: true, enabled: enabled() });
  }));
  router.post('/bookings/:ref/test-payment', ...userAuth, rateLimit({ max: 20 }), safe(async (req, res) => {
    if (!enabled()) throw fail(503, 'Test payments are disabled on this server.');
    const booking = await owned(req);
    const service = createService(db(), mongoose.mongo);
    const payment = await service.withInventoryLock(booking.inventory_id, async () => {
      const current = await owned(req);
      if (!['upcoming', 'checked_in'].includes(current.status)) throw fail(409, 'This booking cannot be paid.');
      const previous = await db().collection('test_payments').findOne({ _id: current.booking_ref });
      if (previous) { const { _id, userId, ...result } = previous; return result; }
      const { method, upiId, upiApp, bank, promoCode } = req.body || {};
      let description;
      if (method === 'upi') {
        if (typeof upiId !== 'string' || upiId.length > 100 || !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())
          || !Object.hasOwn(APPS, upiApp)) throw fail(400, 'Choose a UPI app and enter a valid UPI ID.');
        description = `UPI · ${APPS[upiApp]}`;
      } else if (method === 'netbanking' && BANKS.includes(bank)) {
        description = `Net banking · ${bank}`;
      } else { throw fail(400, 'Choose a valid test payment method.'); }
      const fee = quote(current, promoCode || '');
      const detail = await service.present(current);
      const result = { id: `TEST-PAY-${crypto.randomUUID()}`, receiptNo: `TEST-RCT-${crypto.randomUUID()}`,
        transactionId: `TEST-TXN-${crypto.randomUUID()}`, bookingId: detail.id, spotId: detail.spotId,
        location: detail.location, vehicle: detail.vehicle, date: detail.date, time: detail.time, duration: detail.duration,
        fee, amountCents: fee.totalCents, method: description, status: 'paid', paidAt: Date.now(), isTest: true,
        customerName: req.paymentUser.name, customerEmail: req.paymentUser.email };
      await db().collection('test_payments').insertOne({ _id: current.booking_ref, userId: String(req.paymentUser._id), ...result });
      publishAvailabilityChange(current.inventory_id, 'payment-created');
      return result;
    });
    res.json({ payment });
  }));
  app.use('/api', router);
}
module.exports = { mountPayments, quote };
