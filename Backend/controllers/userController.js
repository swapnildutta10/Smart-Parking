const User = require("../models/user");
const crypto = require("crypto");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 128;
const publicUser = user => ({ id: user._id, name: user.name, email: user.email, phone: user.phone || '', createdAt: user.createdAt });

const { hashPassword } = require("../services/passwordService");

const issueToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured on the server.");
  const payload = Buffer.from(JSON.stringify({
    id: user._id.toString(),
    email: user.email,
    role: "user",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

exports.hashPassword = hashPassword;
exports.register = async (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string"
    || !name.trim() || name.trim().length > MAX_NAME_LENGTH || !EMAIL_PATTERN.test(email.trim())
    || email.trim().length > 254 || password.length < 8 || password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ message: "Enter a valid name and email, and a password between 8 and 128 characters." });
  }
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.exists({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash });
    return res.status(201).json({ message: "Account created.", user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    throw error;
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !EMAIL_PATTERN.test(email.trim())
    || email.trim().length > 254 || !password || password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ message: "Enter your email and password." });
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  if (!user?.passwordHash) return res.status(401).json({ message: "Email or password is incorrect." });
  const [salt, storedHash, extra] = user.passwordHash.split(":");
  if (extra || !/^[a-f\d]{32}$/i.test(salt || "") || !/^[a-f\d]{128}$/i.test(storedHash || "")) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  const candidate = await hashPassword(password, salt);
  const candidateHash = Buffer.from(candidate.split(":")[1], "hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  if (candidateHash.length !== expectedHash.length || !crypto.timingSafeEqual(candidateHash, expectedHash)) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  try {
    const token = issueToken(user);
    user.lastLoginAt = new Date();
    await user.save();
    return res.json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.googleLogin = async (req, res) => {
  const credential = typeof req.body?.credential === "string" ? req.body.credential : "";
  if (!credential || credential.length > 10000 || !process.env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ message: "Google sign-in is not configured." });
  }
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return res.status(401).json({ message: "Google sign-in could not verify this account." });
    const claims = await response.json();
    const validIssuer = ["accounts.google.com", "https://accounts.google.com"].includes(claims.iss);
    const emailVerified = claims.email_verified === true || claims.email_verified === "true";
    if (claims.aud !== process.env.GOOGLE_CLIENT_ID || !validIssuer || Number(claims.exp) * 1000 <= Date.now()
      || !claims.sub || !claims.email || !emailVerified) {
      return res.status(401).json({ message: "Google sign-in could not verify this account." });
    }
    const email = claims.email.trim().toLowerCase();
    const name = (claims.name || email).trim();
    const user = await User.findOneAndUpdate(
      { email },
      { $setOnInsert: { name, email } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );
    user.lastLoginAt = new Date();
    await user.save();
    return res.json({
      token: issueToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Google sign-in failed:", error.message);
    return res.status(502).json({ message: "Google sign-in could not be completed. Try again." });
  }
};

exports.updateProfile = async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.auth.id)) return res.status(401).json({ message: 'Sign in again to update your profile.' });
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const suppliedPhone = req.body?.phone;
  let phone;
  if (suppliedPhone !== undefined) {
    if (typeof suppliedPhone !== 'string' || suppliedPhone.length > 32 || !/^[+0-9 ()-]*$/.test(suppliedPhone)) {
      return res.status(400).json({ message: 'Enter a valid phone number or leave it blank.' });
    }
    phone = suppliedPhone.trim().replace(/[ ()-]/g, '');
    if (phone && !/^\+?\d{7,15}$/.test(phone)) return res.status(400).json({ message: 'Phone numbers must contain 7–15 digits, with an optional country code.' });
  }
  if (!name || name.length > MAX_NAME_LENGTH || !email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: 'Enter a valid name and email address.' });
  }
  try {
    const user = await User.findById(req.auth.id);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    if (user.account_status === 'suspended') return res.status(403).json({ message: 'This account cannot update its profile.' });
    user.name = name;
    user.email = email;
    if (phone !== undefined) user.phone = phone;
    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    throw error;
  }
};

exports.getProfile = async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.auth.id)) return res.status(401).json({ message: 'Sign in again to view your profile.' });
  const user = await User.findById(req.auth.id).select('name email phone createdAt account_status');
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  if (user.account_status === 'suspended') return res.status(403).json({ message: 'This account cannot view its profile.' });
  return res.json({ user: publicUser(user) });
};
