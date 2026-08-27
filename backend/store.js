// ==========================================================================
// IN-MEMORY DATA STORES
// ==========================================================================

// 1. Registered Users Store
// Key: email (string) | Value: { name, email, password }
const usersStore = new Map();

// Seed a default demo user for instant testing
usersStore.set("user@example.com", {
  name: "Demo User",
  email: "user@example.com",
  password: "password123",
});

// 2. Pending Verification Sessions Store
// Key: pendingToken (hex string) | Value: { type: "LOGIN" | "REGISTER", email, name, password }
const pendingLogins = new Map();

// 3. OTP Store
// Key: email (string) | Value: { otp: "123456", expiresAt: timestamp }
const otpStore = new Map();

module.exports = {
  usersStore,
  pendingLogins,
  otpStore,
};