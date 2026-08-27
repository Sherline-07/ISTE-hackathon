require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();

// ── Security headers with Cross-Origin allowances for local dev ───────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
  })
);

// ── CORS (Allow any local development origin or configured client) ────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) or any localhost/127.0.0.1 origin
      if (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin === process.env.CLIENT_ORIGIN) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback allow in development
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "10mb" }));


// ── Rate limiter for auth routes (OTP spam / brute-force protection) ──────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests — please try again in 15 minutes." }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/complaints", require("./routes/complaintRoutes"));

// ── Fallback error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Unexpected server error." });
});

const PORT = process.env.PORT || 5002;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`[UrbanEye] API running on http://localhost:${PORT}`));
});