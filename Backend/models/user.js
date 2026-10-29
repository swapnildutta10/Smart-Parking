const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "", maxlength: 16 },
    account_status: { type: String, enum: ["active", "suspended"] },
    // OAuth and demo accounts do not use a local password.
    passwordHash: { type: String, select: false },    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
