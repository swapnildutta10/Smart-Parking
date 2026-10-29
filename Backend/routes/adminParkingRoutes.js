const { publishAvailabilityChange } = require('../services/availabilityEvents');
const crypto = require('node:crypto');
const { createService, peakOccupancy, fail, UUID } = require('../services/parkingService');
const rateLimit = require('../middleware/rateLimit');
const vehicles = { Car: 'car', 'Two wheeler': 'two_wheeler', 'SUV / Van': 'suv_van' };

function validate(body, Decimal128) {
  const { location, area, vehicle, rate, totalSlots } = body || {};
  if (typeof location !== 'string' || !location.trim() || location.trim().length > 150
    || typeof area !== 'string' || !area.trim() || area.trim().length > 500
    || typeof vehicle !== 'string' || !Object.hasOwn(vehicles, vehicle)) {
    throw fail(400, 'Enter a location, address, and supported vehicle type.');
  }
  const price = typeof rate === 'number' ? String(rate) : rate;
  if (typeof price !== 'string' || !/^\d{1,8}(\.\d{1,2})?$/.test(price) || Number(price) <= 0
    || Number(price) > 99999999.99) throw fail(400, 'Enter an hourly rate greater than zero with at most two decimal places.');
  if (!Number.isInteger(totalSlots) || totalSlots < 1 || totalSlots > 100000) throw fail(400, 'Total capacity must be a whole number between 1 and 100,000.');
  return { location: location.trim(), area: area.trim(), vehicle_type: vehicles[vehicle],
    rate_per_hour: Decimal128.fromString(Number(price).toFixed(2)), total_slots: totalSlots };
}

function mountAdminParking(app, { mongoose, express, requireAuth }) {
  const router = express.Router();
  const db = () => mongoose.connection.db;
  const service = () => createService(db(), mongoose.mongo);
  const safe = action => async (req, res, next) => {
    try { await action(req, res); }
    catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      if (error.code === 11000) return res.status(409).json({ message: 'This location already has inventory for that vehicle type.' });
      next(error);
    }
  };
  async function find(id) {
    if (!UUID.test(id || '')) throw fail(400, 'Invalid parking slot ID.');
    const item = await db().collection('parking_inventory').findOne({ inventory_id: id, status: 'active' });
    if (!item) throw fail(404, 'Parking slot not found.');
    return item;
  }
  async function activeReservations(id) {
    return db().collection('bookings').find({ inventory_id: id, status: { $in: ['upcoming', 'checked_in'] }, ends_at: { $gt: new Date() } }).toArray();
  }
  async function present(id) {
    const now = new Date();
    return (await service().list(now, new Date(+now + 1))).find(item => item.inventoryId === id);
  }
  async function resolveLocation(body) {
    if (!body?.parkingId) return body;
    if (typeof body.parkingId !== 'string' || !UUID.test(body.parkingId)) throw fail(400, 'Choose a valid parking location.');
    const location = await db().collection('parking_locations').findOne({ parking_id: body.parkingId, status: 'active' });
    if (!location) throw fail(404, 'Parking location not found.');
    return { ...body, location: location.location_name, area: location.address };
  }
  router.use(requireAuth('admin'));
  router.get('/', safe(async (req, res) => {
    const now = new Date();
    res.json({ parking: await service().list(now, new Date(+now + 1)) });
  }));
  router.post('/', rateLimit({ max: 30 }), safe(async (req, res) => {
    const value = validate(await resolveLocation(req.body), mongoose.mongo.Decimal128);
    const inventory_id = crypto.randomUUID(), parking_id = req.body.parkingId || crypto.randomUUID();
    const locations = db().collection('parking_locations');
    if (!req.body.parkingId) await locations.insertOne({ parking_id, location_name: value.location, address: value.area, status: 'active' });
    try {
      await db().collection('parking_inventory').insertOne({ inventory_id, parking_id, vehicle_type: value.vehicle_type,
        rate_per_hour: value.rate_per_hour, total_slots: value.total_slots, status: 'active' });
    } catch (error) {
      if (!req.body.parkingId) await locations.deleteOne({ parking_id });
      throw error;
    }
    publishAvailabilityChange(inventory_id, 'inventory-created');
    res.status(201).json({ parking: await present(inventory_id) });
  }));
  router.patch('/:id', safe(async (req, res) => {
    const value = validate(await resolveLocation(req.body), mongoose.mongo.Decimal128);
    await find(req.params.id);
    const result = await service().withInventoryLock(req.params.id, async () => {
      const item = await find(req.params.id);
      const locations = db().collection('parking_locations');
      const location = await locations.findOne({ parking_id: item.parking_id });
      if (!location) throw fail(409, 'The parking location is missing. Contact the administrator.');
      const reservations = await activeReservations(item.inventory_id);
      const locationChanged = location.location_name !== value.location || location.address !== value.area || (req.body.parkingId && req.body.parkingId !== item.parking_id);
      if (reservations.length && (locationChanged || item.vehicle_type !== value.vehicle_type)) {
        throw fail(409, 'Location and vehicle type cannot change while this slot has active reservations.');
      }
      const now = new Date();
      const end = new Date(Math.max(+now + 1, ...reservations.map(row => +row.ends_at)));
      const reserved = peakOccupancy(reservations, now, end);
      if (value.total_slots < reserved) throw fail(409, `Capacity cannot be lower than ${reserved} reserved spaces.`);
      // Create a location version so editing this slot does not rename other inventory.
      const parking_id = req.body.parkingId || (locationChanged ? crypto.randomUUID() : item.parking_id);
      if (locationChanged && !req.body.parkingId) await locations.insertOne({ parking_id, location_name: value.location, address: value.area, status: 'active' });
      try {
        await db().collection('parking_inventory').updateOne({ inventory_id: item.inventory_id, status: 'active' }, { $set: {
          parking_id, vehicle_type: value.vehicle_type, rate_per_hour: value.rate_per_hour, total_slots: value.total_slots,
        } });
      } catch (error) {
        if (locationChanged && !req.body.parkingId) await locations.deleteOne({ parking_id });
        throw error;
      }
      publishAvailabilityChange(item.inventory_id, 'inventory-updated');
      return present(item.inventory_id);
    });
    res.json({ parking: result });
  }));
  router.delete('/:id', safe(async (req, res) => {
    await find(req.params.id);
    await service().withInventoryLock(req.params.id, async () => {
      await find(req.params.id);
      if ((await activeReservations(req.params.id)).length) throw fail(409, 'This slot has active reservations. Complete or cancel them before deleting it.');
      await db().collection('parking_inventory').updateOne({ inventory_id: req.params.id, status: 'active' }, { $set: { status: 'inactive' } });
    });
    publishAvailabilityChange(req.params.id, 'inventory-deleted');
    res.json({ message: 'Parking slot removed from listings.' });
  }));
  app.use('/api/admin/parking', router);
}
module.exports = { mountAdminParking, validate };
