"use strict";

const crypto = require("node:crypto");
const { publishAvailabilityChange } = require('./availabilityEvents');
const { recordNotification } = require('./notificationService');
const labels = { car: "Car", two_wheeler: "Two wheeler", suv_van: "SUV / Van" };
const activeStatuses = ["upcoming", "checked_in"];
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/;
const fail = (status, message) => Object.assign(new Error(message), { status });

function peakOccupancy(bookings, start, end) {
  const events = [];
  for (const b of bookings) {
    const from = Math.max(+new Date(b.starts_at), +start);
    const to = Math.min(+new Date(b.ends_at), +end);
    if (from < to) events.push([from, 1], [to, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let count = 0, peak = 0;
  for (const [, change] of events) { count += change; peak = Math.max(peak, count); }
  return peak;
}

function interval(start, end) {
  const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (typeof start !== "string" || typeof end !== "string" || !datePattern.test(start) || !datePattern.test(end)) throw fail(400, "Provide start and end timestamps including a timezone.");
  const starts_at = new Date(start), ends_at = new Date(end);
  const hours = (+ends_at - +starts_at) / 3600000;
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw fail(400, "Choose a parking duration between 1 minute and 24 hours.");
  return { starts_at, ends_at, hours };
}

function createService(db, bson) {
  const { Decimal128 } = bson;
  const inventory = db.collection("parking_inventory");
  const locations = db.collection("parking_locations");
  const bookings = db.collection("bookings");
  const locks = db.collection("_parking_booking_locks");

  // A MongoDB-backed mutex works on a standalone development server and across
  // API processes. No lease expiry: a paused process cannot oversell capacity.
  // A crashed process leaves a lock for explicit operator recovery (see README).
  async function withInventoryLock(id, action) {
    const owner = crypto.randomUUID();
    let acquired = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await locks.insertOne({ _id: id, owner, acquired_at: new Date(), process_id: process.pid }); acquired = true; break; }
      catch (e) { if (e.code !== 11000) throw e; await new Promise(resolve => setTimeout(resolve, 50)); }
    }
    if (!acquired) throw fail(503, "This parking location is processing another reservation. Please try again.");
    try { return await action(); }
    finally { await locks.deleteOne({ _id: id, owner }); }
  }

  async function remaining(item, start, end) {
    const rows = await bookings.find({ inventory_id: item.inventory_id, status: { $in: activeStatuses }, starts_at: { $lt: end }, ends_at: { $gt: start } }).toArray();
    return Math.max(0, item.total_slots - peakOccupancy(rows, start, end));
  }

  async function list(start, end) {
    const lots = await locations.find({ status: "active" }).toArray();
    const byId = new Map(lots.map(p => [p.parking_id, p]));
    const rows = await inventory.find({ status: "active", parking_id: { $in: [...byId.keys()] } }).toArray();
    return Promise.all(rows.map(async item => {
      const location = byId.get(item.parking_id);
      return { id: item.inventory_id.slice(0, 8).toUpperCase(), inventoryId: item.inventory_id, parkingId: item.parking_id,
        location: location.location_name, area: location.address, vehicle: labels[item.vehicle_type] || item.vehicle_type,
        rate: Number(item.rate_per_hour.toString()), totalSlots: item.total_slots, available: await remaining(item, start, end) };
    }));
  }

  async function present(row) {
    const item = await inventory.findOne({ inventory_id: row.inventory_id });
    const location = item && await locations.findOne({ parking_id: item.parking_id });
    // Business dates are always presented in the parking site's timezone.
    const local = new Date(+row.starts_at + 330 * 60000).toISOString();
    return { id: row.booking_ref, inventoryId: row.inventory_id, spotId: row.inventory_id.slice(0, 8).toUpperCase(),
      location: location?.location_name || "Parking location", area: location?.address || "", vehicle: labels[item?.vehicle_type] || "Vehicle",
      vehiclePlate: row.vehicle_plate, rate: Number(row.booked_rate_per_hour.toString()), totalAmount: Number(row.total_amount.toString()),
      startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(), date: local.slice(0, 10), time: local.slice(11, 16),
      duration: (+row.ends_at - +row.starts_at) / 3600000, status: row.status, parked: row.status === "checked_in" };
  }

  async function history(userId) {
    const rows = await bookings.find({ user_id: userId }).sort({ starts_at: -1 }).toArray();
    return Promise.all(rows.map(present));
  }

  async function reserve(userId, body, now = new Date()) {
    const { starts_at, ends_at, hours } = interval(body.starts_at, body.ends_at);
    if (!UUID.test(body.inventory_id || "") || !UUID.test(body.request_id || "")) throw fail(400, "Select a valid parking location and booking request.");
    if (typeof body.vehicle_plate !== "string") throw fail(400, "Enter the vehicle registration number.");
    const plate = body.vehicle_plate.trim().toUpperCase().replace(/\s+/g, " ");
    if (!/^[A-Z0-9][A-Z0-9 -]{1,19}$/.test(plate)) throw fail(400, "Enter a valid vehicle registration number (2–20 characters).");
    const booking_ref = `PN-${crypto.createHash("sha256").update(`${userId}:${body.request_id}`).digest("hex").slice(0, 24).toUpperCase()}`;
    return withInventoryLock(body.inventory_id, async () => {
      const previous = await bookings.findOne({ booking_ref, user_id: userId });
      if (previous) {
        if (previous.inventory_id !== body.inventory_id || +previous.starts_at !== +starts_at || +previous.ends_at !== +ends_at || previous.vehicle_plate !== plate) throw fail(409, "This request was already used. Start a new booking.");
        await recordNotification(db, previous, 'reserved', previous._id.getTimestamp());
        return present(previous);
      }
      if (+starts_at < +now || +starts_at > +now + 365 * 86400000) throw fail(400, "Choose a future arrival within the next year.");
      const item = await inventory.findOne({ inventory_id: body.inventory_id, status: "active" });
      if (!item || !await locations.findOne({ parking_id: item.parking_id, status: "active" })) throw fail(404, "This parking location is unavailable.");
      if (await remaining(item, starts_at, ends_at) < 1) throw fail(409, "No spaces remain for your selected time. Choose another time or location.");
      const cents = Math.round(Number(item.rate_per_hour.toString()) * 100);
      const total = cents * Math.ceil(hours);
      if (!Number.isSafeInteger(total) || total > 9999999999) throw fail(400, "The booking total exceeds the supported limit.");
      const row = { booking_ref, user_id: userId, inventory_id: body.inventory_id, vehicle_plate: plate, starts_at, ends_at,
        booked_rate_per_hour: item.rate_per_hour, total_amount: Decimal128.fromString((total / 100).toFixed(2)), status: "upcoming" };
      try { await bookings.insertOne(row); }
      catch (e) {
        if (e.code === 11000) throw fail(409, "This request was already used. Refresh your bookings.");
        throw e;
      }
      publishAvailabilityChange(body.inventory_id, 'reserved');
      await recordNotification(db, row, 'reserved', now);
      return present(row);
    });
  }

  async function transition(userId, ref, action, now = new Date()) {
    const row = await bookings.findOne({ booking_ref: ref, user_id: userId });
    if (!row) throw fail(404, "Booking not found.");
    return withInventoryLock(row.inventory_id, async () => {
      const current = await bookings.findOne({ booking_ref: ref, user_id: userId });
      const destination = action === "cancel" ? "cancelled" : "checked_in";
      if (current.status === destination) {
        await recordNotification(db, current, destination === 'cancelled' ? 'cancelled' : 'parked');
        return present(current);
      }
      if (current.status !== "upcoming") throw fail(409, "This booking can no longer be changed.");
      if (action === "check-in" && (+now < +current.starts_at || +now >= +current.ends_at)) throw fail(409, "Check-in is available during your booked time.");
      if (action === "cancel" && +now >= +current.starts_at) throw fail(409, "Cancellation is available before the booked arrival time.");
      await bookings.updateOne({ booking_ref: ref, user_id: userId, status: "upcoming" }, { $set: { status: destination } });

      if (destination === 'cancelled') {
        await db.collection('test_payments').updateOne({ _id: ref, status: 'paid' }, { $set: { status: 'refunded', refundedAt: Date.now() } });
      }
      publishAvailabilityChange(current.inventory_id, destination);
      await recordNotification(db, current, destination === 'cancelled' ? 'cancelled' : 'parked', now);
      return present({ ...current, status: destination });
    });
  }
  return { list, history, reserve, transition, withInventoryLock, present };
}

module.exports = { createService, peakOccupancy, interval, fail, UUID };
