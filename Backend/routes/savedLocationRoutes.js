const { createService, fail, UUID } = require('../services/parkingService');
const limit = require('../middleware/rateLimit');

function mountSavedLocations(app, { mongoose, express, requireAuth }) {
  const router = express.Router();
  const db = () => mongoose.connection.db;
  const safe = action => async (req, res, next) => {
    try { await action(req, res); } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  };
  router.use(requireAuth('user'), async (req, res, next) => {
    try {
      if (!/^[a-f\d]{24}$/i.test(req.auth.id)) throw fail(401, 'Sign in to save locations.');
      const user = await db().collection('users').findOne({ _id: new mongoose.mongo.ObjectId(req.auth.id) });
      if (!user || user.account_status === 'suspended') throw fail(403, 'This account cannot manage saved locations.');
      req.savedLocationUserId = String(user._id);
      next();
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  });
  const key = (userId, inventoryId) => `${userId}:${inventoryId}`;
  router.get('/', safe(async (req, res) => {
    const rows = await db().collection('saved_locations').find({ userId: req.savedLocationUserId }).sort({ createdAt: -1 }).toArray();
    const now = new Date();
    const active = await createService(db(), mongoose.mongo).list(now, new Date(+now + 1));
    const byId = new Map(active.map(item => [item.inventoryId, item]));
    const locations = await Promise.all(rows.map(async row => {
      if (byId.has(row.inventoryId)) return { ...byId.get(row.inventoryId), unavailable: false };
      const item = await db().collection('parking_inventory').findOne({ inventory_id: row.inventoryId });
      const location = item && await db().collection('parking_locations').findOne({ parking_id: item.parking_id });
      return { inventoryId: row.inventoryId, id: row.inventoryId.slice(0, 8).toUpperCase(),
        location: location?.location_name || 'Unavailable parking location', area: location?.address || '', unavailable: true };
    }));
    res.json({ locations });
  }));
  router.post('/', limit({ max: 60 }), safe(async (req, res) => {
    const inventoryId = req.body?.inventoryId;
    if (typeof inventoryId !== 'string' || !UUID.test(inventoryId)) throw fail(400, 'Choose a valid parking location.');
    const item = await db().collection('parking_inventory').findOne({ inventory_id: inventoryId, status: 'active' });
    if (!item || !await db().collection('parking_locations').findOne({ parking_id: item.parking_id, status: 'active' })) throw fail(404, 'This parking location is unavailable.');
    const _id = key(req.savedLocationUserId, inventoryId);
    try {
      await db().collection('saved_locations').updateOne({ _id }, { $setOnInsert: {
        userId: req.savedLocationUserId, inventoryId, createdAt: new Date(),
      } }, { upsert: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      if (!await db().collection('saved_locations').findOne({ _id })) throw error;
    }
    res.json({ inventoryId, message: 'Location saved.' });
  }));
  router.delete('/:inventoryId', safe(async (req, res) => {
    if (!UUID.test(req.params.inventoryId || '')) throw fail(400, 'Invalid parking location ID.');
    await db().collection('saved_locations').deleteOne({ _id: key(req.savedLocationUserId, req.params.inventoryId), userId: req.savedLocationUserId });
    res.json({ message: 'Location removed from saved locations.' });
  }));
  app.use('/api/saved-locations', router);
}
module.exports = { mountSavedLocations };
