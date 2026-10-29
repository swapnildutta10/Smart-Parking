const crypto = require("crypto");

module.exports = function requireAuth(requiredRole) {
  return (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) return res.status(401).json({ message: "Sign in to continue." });
    const parts = token.split(".");
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) {
      return res.status(401).json({ message: "Invalid or expired session." });
    }
    const [payload, signature] = parts;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return res.status(401).json({ message: "Invalid or expired session." });
    try {
      const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (!claims || typeof claims.id !== "string" || !claims.id || !Number.isFinite(claims.exp) || claims.exp <= Date.now()) {
        return res.status(401).json({ message: "Invalid or expired session." });
      }
      if (requiredRole && claims.role !== requiredRole) return res.status(403).json({ message: "You do not have access to this resource." });
      req.auth = claims;
      return next();
    } catch {
      return res.status(401).json({ message: "Invalid or expired session." });
    }
  };
};
