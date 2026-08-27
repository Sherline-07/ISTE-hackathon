const express = require("express");
const { sendOtp, verifyOtp, register, login } = require("../controllers/authController");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/resend-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register", register);
router.post("/login", login);

module.exports = router;