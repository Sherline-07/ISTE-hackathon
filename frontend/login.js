/* --- UrbanEye Auth: shared logic for index.html & register.html --- */

const API_BASE_URL = "http://localhost:5002/api"; // matches backend/server.js (PORT=5002)

const AuthState = {
  role: "citizen",           // 'citizen' | 'admin'
  channel: "email",          // Primary verified channel is Email via Nodemailer SMTP
  otpVerified: false,
  verificationToken: null,
  otpExpirySeconds: 120,     // 2-minute OTP validity timer (02:00)
  resendCooldownSeconds: 30, // 30-second cooldown for resend button
  timerHandle: null,
  resendTimerHandle: null,
};

/* Helper for backend API requests */
async function apiRequest(path, payload) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await res.json(); } catch (_) { /* non-JSON response */ }
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

/* Toggle a button's loading state (spinner + disabled) */
function setBtnLoading(btn, loading, loadingText, defaultHtml) {
  if (!btn) return;
  if (loading) {
    btn.dataset.defaultHtml = btn.dataset.defaultHtml || btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ${loadingText}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = defaultHtml || btn.dataset.defaultHtml || btn.innerHTML;
  }
  if (window.lucide) lucide.createIcons();
}

/* ---------- Toast Notifications ---------- */
function showToast(message, type = "default", icon = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
  toast.className = "toast show " + type;
  if (window.lucide) lucide.createIcons();
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 3600);
}

/* ---------- Role toggle (Citizen / Admin) ---------- */
function setRole(role) {
  AuthState.role = role;
  const isAdmin = role === "admin";

  document.querySelectorAll(".role-toggle button").forEach(btn => {
    const btnRole = btn.dataset.role;
    btn.classList.toggle("active", btnRole === role);
    btn.classList.toggle("admin-active", btnRole === role && isAdmin);
  });

  const iconWrap = document.getElementById("authIconWrap");
  const headerTitle = document.getElementById("authTitle");
  const headerSub = document.getElementById("authSubtitle");
  const adminNote = document.getElementById("adminCodeNote");
  const adminCodeField = document.getElementById("adminCodeField");

  if (iconWrap) iconWrap.classList.toggle("admin-mode", isAdmin);

  if (headerTitle && headerTitle.dataset.citizenText) {
    headerTitle.textContent = isAdmin ? headerTitle.dataset.adminText : headerTitle.dataset.citizenText;
  }
  if (headerSub && headerSub.dataset.citizenText) {
    headerSub.textContent = isAdmin ? headerSub.dataset.adminText : headerSub.dataset.citizenText;
  }
  if (adminNote) adminNote.style.display = isAdmin ? "flex" : "none";
  if (adminCodeField) adminCodeField.style.display = isAdmin ? "flex" : "none";

  if (window.lucide) lucide.createIcons();
}

/* ---------- Password visibility toggle ---------- */
function toggleVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  btn.innerHTML = isPassword
    ? '<i data-lucide="eye-off"></i>'
    : '<i data-lucide="eye"></i>';
  if (window.lucide) lucide.createIcons();
}

/* ---------- Password strength check ---------- */
function checkPasswordStrength(value) {
  const fill = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");
  if (!fill || !label) return;

  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  const levels = [
    { width: "0%", color: "#e2e8f0", text: "" },
    { width: "25%", color: "#f43f5e", text: "Weak — add symbols & numbers" },
    { width: "50%", color: "#f59e0b", text: "Fair — add uppercase letters" },
    { width: "75%", color: "#38bdf8", text: "Good password" },
    { width: "100%", color: "#10b981", text: "Strong password" },
  ];

  const level = value.length === 0 ? levels[0] : levels[score] || levels[1];
  fill.style.width = level.width;
  fill.style.background = level.color;
  label.textContent = level.text;
}

/* ---------- Contact & OTP Flow ---------- */
function getContactValue() {
  const input = document.getElementById("contactInput");
  return input ? input.value.trim().toLowerCase() : "";
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateContact() {
  const value = getContactValue();
  const errorEl = document.getElementById("contactError");
  let valid = true;
  let message = "";

  if (!value) {
    valid = false;
    message = "Please enter your email address.";
  } else if (!validateEmail(value)) {
    valid = false;
    message = "Please enter a valid email format (e.g. name@example.com).";
  }

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.toggle("show", !valid);
  }
  return valid;
}

function maskEmail(email) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const maskedUser = user.length > 2 ? user.slice(0, 2) + "•••" : user;
  return `${maskedUser}@${domain}`;
}

async function sendOtp() {
  if (!validateContact()) return;

  AuthState.otpVerified = false;
  AuthState.verificationToken = null;

  const destination = getContactValue();
  const masked = maskEmail(destination);
  const sendBtn = document.getElementById("sendOtpBtn");

  setBtnLoading(sendBtn, true, "Sending OTP…");

  try {
    await apiRequest("/auth/send-otp", {
      contact: destination,
      channel: "email",
      role: AuthState.role,
      purpose: document.getElementById("registerForm") ? "register" : "login",
    });

    const otpBlock = document.getElementById("otpBlock");
    const sentNote = document.getElementById("otpSentNote");

    if (otpBlock) otpBlock.classList.add("show");
    if (sentNote) sentNote.innerHTML = `<i data-lucide="mail-check"></i> 6-digit code sent to <strong>${masked}</strong>`;

    if (window.lucide) lucide.createIcons();
    clearOtpInputs();
    startOtpExpiryTimer();
    startResendCooldownTimer();
    showToast(`6-digit OTP sent to ${masked}`, "success", "mail");
  } catch (err) {
    showToast(err.message || "Couldn't send OTP. Please try again.", "error", "alert-triangle");
  } finally {
    setBtnLoading(sendBtn, false, "", '<i data-lucide="send"></i> Send 6-Digit OTP');
  }
}

function clearOtpInputs() {
  const inputs = document.querySelectorAll(".otp-inputs input");
  inputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
  if (inputs[0]) inputs[0].focus();
  const status = document.getElementById("otpStatus");
  if (status) { status.classList.remove("show", "success", "error"); status.textContent = ""; }
}

function resetOtpBlock() {
  AuthState.otpVerified = false;
  AuthState.verificationToken = null;
  const otpBlock = document.getElementById("otpBlock");
  const sendBtn = document.getElementById("sendOtpBtn");
  if (otpBlock) otpBlock.classList.remove("show");
  if (sendBtn) sendBtn.disabled = false;
  clearInterval(AuthState.timerHandle);
  clearInterval(AuthState.resendTimerHandle);
}

/* 2-Minute OTP Validity Timer */
function startOtpExpiryTimer() {
  let secondsRemaining = AuthState.otpExpirySeconds; // 120 seconds (2:00)
  const timerEl = document.getElementById("otpTimer");
  clearInterval(AuthState.timerHandle);

  function updateDisplay() {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    if (timerEl) {
      if (secondsRemaining > 0) {
        timerEl.innerHTML = `Valid for <strong>${formatted}</strong>`;
      } else {
        timerEl.innerHTML = `<strong>Code expired</strong> — click Resend Code`;
      }
    }

    if (secondsRemaining <= 0) {
      clearInterval(AuthState.timerHandle);
    } else {
      secondsRemaining--;
    }
  }

  updateDisplay();
  AuthState.timerHandle = setInterval(updateDisplay, 1000);
}

/* 30-Second Cooldown for Resend Button */
function startResendCooldownTimer() {
  let cooldown = AuthState.resendCooldownSeconds;
  const resendBtn = document.getElementById("resendBtn");
  clearInterval(AuthState.resendTimerHandle);
  if (resendBtn) resendBtn.disabled = true;

  function tick() {
    if (resendBtn) {
      if (cooldown > 0) {
        resendBtn.textContent = `Resend in (${cooldown}s)`;
        resendBtn.disabled = true;
      } else {
        resendBtn.textContent = "Resend Code";
        resendBtn.disabled = false;
        clearInterval(AuthState.resendTimerHandle);
      }
    }
    cooldown--;
  }

  tick();
  AuthState.resendTimerHandle = setInterval(tick, 1000);
}

function resendOtp() {
  sendOtp();
}

/* ---------- 6-Digit Auto-Advancing OTP Inputs ---------- */
function initOtpInputs() {
  const inputs = Array.from(document.querySelectorAll(".otp-inputs input"));
  if (!inputs.length) return;

  inputs.forEach((input, idx) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "").slice(0, 1);
      input.classList.toggle("filled", input.value.length === 1);
      if (input.value && idx < inputs.length - 1) inputs[idx + 1].focus();
      maybeAutoVerify(inputs);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "");
      pasted.split("").slice(0, inputs.length).forEach((char, i) => {
        inputs[i].value = char;
        inputs[i].classList.add("filled");
      });
      const nextEmpty = inputs.find(i => !i.value);
      (nextEmpty || inputs[inputs.length - 1]).focus();
      maybeAutoVerify(inputs);
    });
  });
}

function maybeAutoVerify(inputs) {
  const entered = inputs.map(i => i.value).join("");
  if (entered.length === inputs.length) verifyOtp(entered);
}

async function verifyOtp(enteredOverride) {
  const inputs = Array.from(document.querySelectorAll(".otp-inputs input"));
  const entered = enteredOverride || inputs.map(i => i.value).join("");
  const status = document.getElementById("otpStatus");

  if (entered.length < inputs.length) {
    if (status) {
      status.textContent = "Please enter all 6 digits.";
      status.className = "otp-status show error";
    }
    return;
  }

  if (status) {
    status.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Verifying…';
    status.className = "otp-status show";
    if (window.lucide) lucide.createIcons();
  }

  try {
    const data = await apiRequest("/auth/verify-otp", {
      contact: getContactValue(),
      channel: "email",
      code: entered,
    });

    AuthState.otpVerified = true;
    AuthState.verificationToken = data.verificationToken || null;

    if (status) {
      status.innerHTML = '<i data-lucide="check-circle-2"></i> Verified successfully';
      status.className = "otp-status show success";
      if (window.lucide) lucide.createIcons();
    }
    clearInterval(AuthState.timerHandle);
    showToast("Email verified successfully!", "success", "check-circle-2");
  } catch (err) {
    AuthState.otpVerified = false;
    AuthState.verificationToken = null;
    if (status) {
      status.innerHTML = `<i data-lucide="x-circle"></i> ${err.message || "Incorrect code — try again"}`;
      status.className = "otp-status show error";
      if (window.lucide) lucide.createIcons();
    }
  }
}

/* ---------- Login Handler ---------- */
async function handleLoginSubmit(event) {
  event.preventDefault();
  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value;
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!identifier || !password) {
    showToast("Enter your email and password to continue.", "error", "alert-triangle");
    return;
  }

  setBtnLoading(submitBtn, true, "Signing in…");
  try {
    const data = await apiRequest("/auth/login", {
      identifier,
      password,
      role: AuthState.role,
    });

    const roleLabel = AuthState.role === "admin" ? "Admin" : "Citizen";
    if (data.token) {
      localStorage.setItem("urbaneye_token", data.token);
      localStorage.setItem("urbaneye_role", data.role || AuthState.role);
      localStorage.setItem("urbaneye_name", data.name || "");
      localStorage.setItem("urbaneye_phone", data.phone || "");
    }
    showToast(`${roleLabel} login successful — redirecting…`, "success", "check-circle-2");
    setTimeout(() => {
      window.location.href = data.redirectUrl || (AuthState.role === "admin" ? "dashboard.html#analytics" : "dashboard.html#feed");
    }, 900);
  } catch (err) {
    showToast(err.message || "Login failed. Check your credentials.", "error", "alert-triangle");
    setBtnLoading(submitBtn, false, "", '<i data-lucide="log-in"></i> Sign In to Dashboard');
  }
}

/* ---------- Register Handler ---------- */
async function handleRegisterSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regConfirmPassword").value;
  const submitBtn = document.getElementById("registerSubmitBtn");
  let adminAccessCode = "";

  if (!name) {
    showToast("Enter your full name.", "error", "alert-triangle");
    return;
  }
  if (!phone || !/^\+?[0-9\s-]{8,15}$/.test(phone)) {
    showToast("Enter a valid contact phone number.", "error", "alert-triangle");
    return;
  }
  if (!validateContact()) {
    showToast("Please provide a valid email.", "error", "alert-triangle");
    return;
  }
  if (!AuthState.otpVerified || !AuthState.verificationToken) {
    showToast("Please verify the 6-digit email OTP before continuing.", "error", "shield-alert");
    return;
  }
  if (password.length < 8) {
    showToast("Password must be at least 8 characters.", "error", "alert-triangle");
    return;
  }
  if (password !== confirmPassword) {
    showToast("Passwords do not match.", "error", "alert-triangle");
    return;
  }
  if (AuthState.role === "admin") {
    const code = document.getElementById("adminAccessCode");
    adminAccessCode = code ? code.value.trim() : "";
    if (!adminAccessCode) {
      showToast("Enter the Municipal Admin Passkey.", "error", "shield-alert");
      return;
    }
  }

  setBtnLoading(submitBtn, true, "Creating account…");
  try {
    await apiRequest("/auth/register", {
      name,
      contact: getContactValue(),
      channel: "email",
      phone,
      password,
      role: AuthState.role,
      verificationToken: AuthState.verificationToken,
      ...(AuthState.role === "admin" ? { adminAccessCode } : {}),
    });

    const roleLabel = AuthState.role === "admin" ? "Admin" : "Citizen";
    showToast(`${roleLabel} account registered! Redirecting to login…`, "success", "check-circle-2");
    setTimeout(() => { window.location.href = "index.html"; }, 1200);
  } catch (err) {
    showToast(err.message || "Registration failed. Try again.", "error", "alert-triangle");
    setBtnLoading(submitBtn, false, "", '<i data-lucide="user-check"></i> Complete Registration');
  }
}

/* ---------- Global Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  initOtpInputs();

  const contactInput = document.getElementById("contactInput");
  if (contactInput) {
    contactInput.addEventListener("input", resetOtpBlock);
  }

  const regPassword = document.getElementById("regPassword");
  if (regPassword) {
    regPassword.addEventListener("input", (e) => checkPasswordStrength(e.target.value));
  }
});