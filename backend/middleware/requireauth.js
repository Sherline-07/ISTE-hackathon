const { verifyToken } = require("../utils/generateToken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided." });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload; // { id, role, contact, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

module.exports = requireAuth;