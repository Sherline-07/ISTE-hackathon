const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true, lowercase: true },
    channel: { type: String, enum: ["phone", "email"], required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["citizen", "admin"], default: "citizen" },
    contactVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One account per contact+role (a person could in theory hold a citizen
// account and a separate admin account with the same email — adjust if
// your product rules say otherwise).
userSchema.index({ contact: 1, role: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);