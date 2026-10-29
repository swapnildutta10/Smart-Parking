const { requireCaptcha } = require('../middleware/loginCaptcha');
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const createRateLimiter = require("../middleware/rateLimit");
const { login, getCurrentAdmin, getUsers, deleteUser } = require("../controllers/adminController");

const router = express.Router();
router.post("/login", createRateLimiter({ max: 8 }), requireCaptcha("admin"), login);
router.use(requireAuth("admin"));
router.get("/me", getCurrentAdmin);
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);

module.exports = router;
