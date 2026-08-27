const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`[UrbanEye] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("[UrbanEye] MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;