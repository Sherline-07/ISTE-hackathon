const bcrypt = require("bcryptjs");

function generateOtp(length = Number(process.env.OTP_LENGTH) || 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

async function hashOtp(code) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(code, salt);
}

async function compareOtp(code, hash) {
  return bcrypt.compare(code, hash);
}

function getExpiryDate(minutes = Number(process.env.OTP_EXPIRY_MINUTES) || 5) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = { generateOtp, hashOtp, compareOtp, getExpiryDate };