const crypto = require('node:crypto');
const { fail, UUID } = require('../services/parkingService');
const limit = require('../middleware/rateLimit');
const types = { Car: 'car', 'Two wheeler': 'two_wheeler', 'SUV / Van': 'suv_van' };
const labels = Object.fromEntries(Object.entries(types).map(([label, key]) => [key, label]));

function mountCatalog(app, { mongoose, express, requireAuth }) {
  const db = () => mongoose.connection.db;
  const safe = action => async (req, res, next) => {
    try { await action(req, res); } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      if (error.code === 11000) return res.status(409).json({ message: 'This vehicle is already saved to your account.' });
      next(error);
    }
  };
  const locations = express.Router();
  locations.use(requireAuth('admin'));
  locations.get('/', safe(async (req, res) => {
    const rows = await db().collection('parking_locations').find({ status: 'active' }).sort({ location_name: 1 }).toArray();
    res.json({ locations: rows.map(row => ({ id: row.parking_id, name: row.location_name, address: row.address })) });
  }));
  locations.post('/', limit({ max: 30 }), safe(async (req, res) => {
    const { name, address } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 150
      || typeof address !== 'string' || !address.trim() || address.trim().length > 500) throw fail(400, 'Enter a location name and address.');
    const location = { id: crypto.randomUUID(), name: name.trim(), address: address.trim() };
    await db().collection('parking_locations').insertOne({ parking_id: location.id, location_name: location.name, address: location.address, status: 'active' });
    res.status(201).json({ location });
  }));
  app.use('/api/admin/locations', locations);

  const vehicles = express.Router();
  vehicles.use(requireAuth('user'), async (req, res, next) => {
    try {
      if (!/^[a-f\d]{24}$/i.test(req.auth.id)) throw fail(401, 'Sign in again to manage vehicles.');
      const _id = new mongoose.mongo.ObjectId(req.auth.id);
      let user = await db().collection('users').findOne({ _id });
      if (!user || user.account_status === 'suspended') throw fail(403, 'This account cannot manage saved vehicles.');
      if (!user.user_id) {
        await db().collection('users').updateOne({ _id, user_id: { $exists: false } }, { $set: { user_id: crypto.randomUUID() } });
        user = await db().collection('users').findOne({ _id });
      }
      if (!UUID.test(user.user_id || '')) throw fail(409, 'This account needs administrator review.');
      req.vehicleUserId = user.user_id;
      next();
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  });
  const present = row => ({ id: row.vehicle_id, type: labels[row.vehicle_type], plate: row.vehicle_plate });
  vehicles.get('/', safe(async (req, res) => {
    const rows = await db().collection('saved_vehicles').find({ user_id: req.vehicleUserId }).sort({ vehicle_plate: 1 }).toArray();
    res.json({ vehicles: rows.map(present) });
  }));
  vehicles.post('/', limit({ max: 30 }), safe(async (req, res) => {
    const { type, plate } = req.body || {};
    if (typeof type !== 'string' || !Object.hasOwn(types, type) || typeof plate !== 'string' || plate.length > 40) throw fail(400, 'Enter a supported vehicle type and registration number.');
    const vehicle_plate = plate.trim().toUpperCase().replace(/[\s-]+/g, '');
    if (!/^[A-Z0-9]{2,20}$/.test(vehicle_plate)) throw fail(400, 'Registration numbers must contain 2–20 letters and digits.');
    const row = { vehicle_id: crypto.randomUUID(), user_id: req.vehicleUserId, vehicle_plate, vehicle_type: types[type] };
    await db().collection('saved_vehicles').insertOne(row);
    res.status(201).json({ vehicle: present(row) });
  }));
  vehicles.delete('/:id', safe(async (req, res) => {
    if (!UUID.test(req.params.id || '')) throw fail(400, 'Invalid saved vehicle ID.');
    const result = await db().collection('saved_vehicles').deleteOne({ vehicle_id: req.params.id, user_id: req.vehicleUserId });
    if (!result.deletedCount) throw fail(404, 'Saved vehicle not found.');
    res.json({ message: 'Vehicle removed.' });
  }));
  app.use('/api/vehicles', vehicles);
}
module.exports = { mountCatalog };
