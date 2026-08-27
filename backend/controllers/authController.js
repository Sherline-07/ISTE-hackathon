const bcrypt = require("bcryptjs");
const User = require("../models/User");
const OtpToken = require("../models/OtpToken");
const { sendOtpEmail } = require("../utils/sendEmail");
const { generateOtp, hashOtp, compareOtp, getExpiryDate } = require("../utils/otp");
const { generateToken, generateVerificationToken, verifyToken } = require("../utils/generateToken");

/* POST /api/auth/send-otp
   body: { contact, channel, role, purpose } */
async function sendOtp(req, res) {
  try {
    const { contact, channel, purpose = "register" } = req.body;

    if (!contact || !channel) {
      return res.status(400).json({ success: false, message: "Contact and channel are required." });
    }

    if (channel === "phone") {
      // Nodemailer only sends email. Wire an SMS gateway (Twilio, MSG91,
      // etc.) here to support phone OTPs — until then, phone registration
      // should be disabled on the frontend or this should stay a stub.
      return res.status(501).json({
        success: false,
        message: "SMS OTP isn't configured yet — please use email for now.",
      });
    }

    const normalizedContact = contact.trim().toLowerCase();

    // For registration, block if an account already exists for this email+role.
    if (purpose === "register") {
      const existing = await User.findOne({ contact: normalizedContact, role: req.body.role || "citizen" });
      if (existing) {
        return res.status(409).json({ success: false, message: "An account with this email already exists." });
      }
    }

    const code = generateOtp();
    const codeHash = await hashOtp(code);

    // Replace any previous unexpired OTP for this contact+channel.
    await OtpToken.deleteMany({ contact: normalizedContact, channel });
    await OtpToken.create({
      contact: normalizedContact,
      channel,
      codeHash,
      purpose,
      expiresAt: getExpiryDate(),
    });

    await sendOtpEmail(normalizedContact, code, { purpose });

    return res.json({ success: true });
  } catch (err) {
    console.error("[sendOtp]", err);
    return res.status(500).json({ success: false, message: "Couldn't send OTP. Try again shortly." });
  }
}

/* POST /api/auth/verify-otp
   body: { contact, channel, code } */
async function verifyOtp(req, res) {
  try {
    const { contact, channel, code } = req.body;
    if (!contact || !channel || !code) {
      return res.status(400).json({ success: false, message: "Missing contact, channel, or code." });
    }

    const normalizedContact = contact.trim().toLowerCase();
    const record = await OtpToken.findOne({ contact: normalizedContact, channel }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ success: false, message: "No active code for this contact — request a new one." });
    }
    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({ success: false, message: "Code expired — request a new one." });
    }
    if (record.attempts >= 5) {
      await record.deleteOne();
      return res.status(429).json({ success: false, message: "Too many attempts — request a new code." });
    }

    const match = await compareOtp(code, record.codeHash);
    if (!match) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: "Incorrect code — try again." });
    }

    await record.deleteOne();
    const verificationToken = generateVerificationToken(normalizedContact, channel);
    return res.json({ success: true, verificationToken });
  } catch (err) {
    console.error("[verifyOtp]", err);
    return res.status(500).json({ success: false, message: "Verification failed. Try again." });
  }
}

/* POST /api/auth/register
   body: { name, contact, channel, password, role, verificationToken, adminAccessCode? } */
async function register(req, res) {
  try {
    const { name, contact, channel, phone, password, role = "citizen", verificationToken, adminAccessCode } = req.body;

    if (!name || !contact || !channel || !phone || !password || !verificationToken) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }
    if (!/^\+?[0-9\s-]{8,15}$/.test(phone.trim())) {
      return res.status(400).json({ success: false, message: "Enter a valid phone number." });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const normalizedContact = contact.trim().toLowerCase();

    // Confirm this contact actually passed OTP verification recently.
    let payload;
    try {
      payload = verifyToken(verificationToken);
    } catch (_) {
      return res.status(401).json({ success: false, message: "OTP verification expired — verify again." });
    }
    if (payload.purpose !== "otp-verified" || payload.contact !== normalizedContact || payload.channel !== channel) {
      return res.status(401).json({ success: false, message: "OTP verification does not match this contact." });
    }

    if (role === "admin") {
      if (!adminAccessCode || adminAccessCode !== process.env.ADMIN_ACCESS_CODE) {
        return res.status(403).json({ success: false, message: "Invalid Admin Access Code." });
      }
    }

    const existing = await User.findOne({ contact: normalizedContact, role });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this contact already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await User.create({
      name,
      contact: normalizedContact,
      channel,
      phone: phone.trim(),
      passwordHash,
      role,
      contactVerified: true,
    });

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("[register]", err);
    return res.status(500).json({ success: false, message: "Registration failed. Try again." });
  }
}

/* POST /api/auth/login
   body: { identifier, password, role } */
async function login(req, res) {
  try {
    const { identifier, password, role = "citizen" } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Enter your email and password." });
    }

    // Basic email format guard
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier.trim())) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    const normalizedContact = identifier.trim().toLowerCase();
    const user = await User.findOne({ contact: normalizedContact, role });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const token = generateToken(user);
    const redirectUrl = role === "admin" ? "admin-dashboard.html" : "dashboard.html#feed";

    return res.json({ success: true, token, redirectUrl, name: user.name, role: user.role, phone: user.phone });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ success: false, message: "Login failed. Try again." });
  }
}

module.exports = { sendOtp, verifyOtp, register, login };