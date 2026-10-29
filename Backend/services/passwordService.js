const crypto = require("node:crypto");

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, hash) => {
      if (error) return reject(error);
      resolve(`${salt}:${hash.toString("hex")}`);
    });
  });

async function verifyPassword(password, storedHash) {
  const parts = typeof storedHash === "string" ? storedHash.split(":") : [];
  const valid = parts.length === 2 && /^[a-f\d]{32}$/i.test(parts[0]) && /^[a-f\d]{128}$/i.test(parts[1]);
  // Perform the same password work for unknown and known member IDs.
  const candidate = (await hashPassword(password, valid ? parts[0] : "0".repeat(32))).split(":")[1];
  const expected = valid ? parts[1] : "0".repeat(128);
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(expected, "hex")) && valid;
}

module.exports = { hashPassword, verifyPassword };
