const crypto = require("crypto");
const User = require("../models/user");

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function issueAdminToken() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured on the server.");
  const payload = Buffer.from(JSON.stringify({
    id: "admin",
    email: process.env.ADMIN_EMAIL,
    role: "admin",
    exp: Date.now() + 8 * 60 * 60 * 1000,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

exports.login = async (req, res) => {
  const adminId = typeof req.body?.adminId === "string" ? req.body.adminId.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const configuredId = process.env.ADMIN_EMAIL;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredId || !configuredPassword || !process.env.JWT_SECRET) {
    return res.status(503).json({ message: "Admin sign-in is not configured on the server." });
  }
  if (!adminId || adminId.length > 254 || !password || password.length > 256) {
    return res.status(400).json({ message: "Enter your admin ID and password." });
  }
  if (!safeEqual(adminId.toLowerCase(), configuredId.toLowerCase()) || !safeEqual(password, configuredPassword)) {
    return res.status(401).json({ message: "The admin ID or password is incorrect." });
  }
  try {
    return res.json({ token: issueAdminToken(), admin: { id: "admin", name: "Administrator", email: configuredId } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  const users = await User.find().select("name email createdAt lastLoginAt").sort({ createdAt: -1 });
  return res.json(users);
};

exports.getCurrentAdmin = (req, res) => res.json({ admin: { id: req.auth.id, name: "Administrator", email: req.auth.email } });

exports.deleteUser = async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid user account ID." });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User account not found." });
  return res.json({ message: "User account deleted." });
};
