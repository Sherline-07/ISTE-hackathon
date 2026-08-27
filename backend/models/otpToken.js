const mongoose = require("mongoose");

const otpTokenSchema = new mongoose.Schema(
  {
    contact: { type: String, required: true, trim: true, lowercase: true },
    channel: { type: String, enum: ["phone", "email"], required: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ["register", "login"], default: "register" },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// MongoDB TTL index — Mongo automatically deletes expired OTP docs for us.
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpToken", otpTokenSchema);