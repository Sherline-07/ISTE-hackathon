const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password, not your login password
  },
});

async function sendOtpEmail(toEmail, code, { purpose = "register" } = {}) {
  const subject =
    purpose === "login"
      ? "Your UrbanEye sign-in code"
      : "Verify your email for UrbanEye";

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto;">
      <h2 style="color:#0f172a;">UrbanEye</h2>
      <p style="color:#334155; font-size:15px;">Your one-time verification code is:</p>
      <div style="font-size:32px; font-weight:800; letter-spacing:8px; color:#2563eb; margin:16px 0;">
        ${code}
      </div>
      <p style="color:#64748b; font-size:13px;">
        This code expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"UrbanEye" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html,
  });
}

module.exports = { sendOtpEmail, transporter };