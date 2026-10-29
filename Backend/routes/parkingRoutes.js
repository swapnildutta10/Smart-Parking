"use strict";
const crypto = require("node:crypto");
const { createService, interval, fail, UUID } = require("../services/parkingService");

function mountParking(app, { mongoose, express, requireAuth }) {
  const router = express.Router();
  const db = () => mongoose.connection.db;
  const service = () => createService(db(), mongoose.mongo);
  const safe = action => async (req, res, next) => {
    try { await action(req, res, next); }
    catch (e) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      if (e.code === 121) return res.status(400).json({ message: "The booking does not match the database requirements." });
      next(e);
    }
  };
  router.get("/parking", safe(async (req, res) => {
    let start = new Date(), end = new Date(+start + 1);
    if (req.query.starts_at || req.query.ends_at) ({ starts_at: start, ends_at: end } = interval(req.query.starts_at, req.query.ends_at));
    res.json({ parking: await service().list(start, end), startsAt: start, endsAt: end });
  }));
  router.use("/bookings", requireAuth("user"), safe(async (req, res, next) => {
    if (!/^[a-f\d]{24}$/i.test(req.auth.id)) throw fail(401, "Sign in again to book parking.");
    const id = new mongoose.mongo.ObjectId(req.auth.id);
    let user = await db().collection("users").findOne({ _id: id });
    if (!user || user.account_status === "suspended") throw fail(403, "This account cannot book parking.");
    if (!user.user_id) {
      await db().collection("users").updateOne({ _id: id, user_id: { $exists: false } }, { $set: { user_id: crypto.randomUUID() } });
      user = await db().collection("users").findOne({ _id: id });
    }
    if (!UUID.test(user.user_id || "")) throw fail(409, "This account's parking ID needs administrator review.");
    req.parkingUserId = user.user_id;
    next();
  }));
  router.get("/bookings", safe(async (req, res) => res.json({ bookings: await service().history(req.parkingUserId) })));
  router.post("/bookings", safe(async (req, res) => res.status(201).json({ booking: await service().reserve(req.parkingUserId, req.body || {}) })));
  for (const action of ["cancel", "check-in"]) router.patch(`/bookings/:ref/${action}`, safe(async (req, res) => {
    res.json({ booking: await service().transition(req.parkingUserId, req.params.ref, action) });
  }));
  app.use("/api", router);
}

module.exports = { mountParking };
