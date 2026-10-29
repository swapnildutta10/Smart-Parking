const { notificationHistory } = require('../services/notificationService');

function mountNotifications(app, { mongoose, express, requireAuth }) {
  const router = express.Router();
  router.get('/', requireAuth('user'), async (req, res, next) => {
    try {
      if (!/^[a-f\d]{24}$/i.test(req.auth.id)) return res.status(401).json({ message: 'Sign in to view notifications.' });
      const db = mongoose.connection.db;
      const user = await db.collection('users').findOne({ _id: new mongoose.mongo.ObjectId(req.auth.id) });
      if (!user || user.account_status === 'suspended') return res.status(403).json({ message: 'This account cannot view notifications.' });
      res.json({ notifications: await notificationHistory(db, user.user_id) });
    } catch (error) { next(error); }
  });
  app.use('/api/notifications', router);
}
module.exports = { mountNotifications };
