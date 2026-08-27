const jwt = require("jsonwebtoken");

// Long-lived session token issued after successful login.
function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, contact: user.contact },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// Short-lived token proving "this contact just passed OTP verification".
// Sent back to the client and required by /auth/register, so the register
// route never has to trust a client-side "otpVerified" flag.
function generateVerificationToken(contact, channel) {
  return jwt.sign({ contact, channel, purpose: "otp-verified" }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { generateToken, generateVerificationToken, verifyToken };