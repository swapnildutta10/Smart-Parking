require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origin is not allowed by CORS.");
    error.status = 403;
    return callback(error);
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
}));
app.use(express.json({ limit: "32kb" }));

// Routes
app.get("/", (req, res) => res.send("API running"));
app.get("/health", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  return res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable", database: ready ? "connected" : "disconnected" });
});
require("./routes/paymentRoutes").mountPayments(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/adminBookingRoutes").mountAdminBookings(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/adminParkingRoutes").mountAdminParking(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/catalogRoutes").mountCatalog(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/savedLocationRoutes").mountSavedLocations(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/notificationRoutes").mountNotifications(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/supportRoutes").mountSupport(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/reportingRoutes").mountReporting(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/userDashboardRoutes").mountUserDashboard(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
require("./routes/availabilityRoutes").mountAvailability(app, { mongoose, express });
require("./middleware/loginCaptcha").mountCaptcha(app, { mongoose });
require("./routes/parkingRoutes").mountParking(app, { mongoose, express, requireAuth: require("./middleware/requireAuth") });
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use((req, res) => res.status(404).json({ message: "API endpoint not found." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status === 403 && error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ message: "This origin is not allowed to access the API." });
  }
  if (error.type === "entity.too.large") return res.status(413).json({ message: "Request body is too large." });
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Request body must contain valid JSON." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: "Request data is invalid." });
  }
  if (error.code === 11000) return res.status(409).json({ message: "A record with that value already exists." });
  if (error.status === 502 || error.status === 503) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(`${req.method} ${req.originalUrl}:`, error);
  return res.status(500).json({ message: "The server could not complete the request." });
});

async function start() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");

  await mongoose.connect(process.env.MONGO_URI, { dbName: "Smart-Parking", serverSelectionTimeoutMS: 10000 });
  await require("./middleware/loginCaptcha").ensureCaptchaIndex(mongoose.connection.db);
  const server = app.listen(port, () => {
    console.log(`API listening on port ${port}; MongoDB connected to ${mongoose.connection.name}.`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing API and MongoDB connection.`);
    require('./services/availabilityEvents').closeAvailabilityStreams();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Backend startup failed:", error.message);
  process.exitCode = 1;
});
