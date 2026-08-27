/* --- UrbanEye Auth: shared logic for login.html & register.html --- */

const AuthState = {
  role: "citizen",       // 'citizen' | 'admin'
  channel: "phone",      // 'phone' | 'email'
  otp: null,
  otpVerified: false,
  resendSeconds: 30,
  timerHandle: null,
};

/* ---------- Toast ---------- */
function showToast(message, type = "default", icon = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerHTML = `<i data-lucide="${icon}"></i> ${message}`;
  toast.className = "toast show " + type;
  lucide.createIcons();
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 3200);
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

  if (iconWrap) iconWrap.classList.toggle("admin-mode", isAdmin);

  if (headerTitle && headerTitle.dataset.citizenText) {
    headerTitle.textContent = isAdmin ? headerTitle.dataset.adminText : headerTitle.dataset.citizenText;
  }
  if (headerSub && headerSub.dataset.citizenText) {
    headerSub.textContent = isAdmin ? headerSub.dataset.adminText : headerSub.dataset.citizenText;
  }
  if (adminNote) adminNote.style.display = isAdmin ? "flex" : "none";
}

/* ---------- Contact channel toggle (Phone / Email) ---------- */
function setChannel(channel) {
  AuthState.channel = channel;
  document.querySelectorAll(".channel-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.channel === channel);
  });

  const input = document.getElementById("contactInput");
  const label = document.getElementById("contactLabel");
  const wrapIcon = document.getElementById("contactIcon");
  if (!input) return;

  if (channel === "phone") {
    input.type = "tel";
    input.placeholder = "e.g., +91 9876543210";
    if (label) label.textContent = "Phone Number *";
    if (wrapIcon) wrapIcon.setAttribute("data-lucide", "phone");
  } else {
    input.type = "email";
    input.placeholder = "e.g., name@example.com";
    if (label) label.textContent = "Email Address *";
    if (wrapIcon) wrapIcon.setAttribute("data-lucide", "mail");
  }
  lucide.createIcons();
  // Reset any in-progress OTP flow if the channel changes
  resetOtpBlock();
}

/* ---------- Password visibility ---------- */
function toggleVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  btn.innerHTML = isPassword
    ? '<i data-lucide="eye-off"></i>'
    : '<i data-lucide="eye"></i>';
  lucide.createIcons();
}

/* ---------- Password strength (register page) ---------- */
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
    { width: "25%", color: "#dc2626", text: "Weak — add length & symbols" },
    { width: "50%", color: "#d97706", text: "Fair — try adding a number or symbol" },
    { width: "75%", color: "#2563eb", text: "Good" },
    { width: "100%", color: "#10b981", text: "Strong password" },
  ];

  const level = value.length === 0 ? levels[0] : levels[score] || levels[1];
  fill.style.width = level.width;
  fill.style.background = level.color;
  label.textContent = level.text;
}

/* ---------- OTP: generation, sending, countdown ---------- */
function getContactValue() {
  const input = document.getElementById("contactInput");
  return input ? input.value.trim() : "";
}

function validateContact() {
  const value = getContactValue();
  const errorEl = document.getElementById("contactError");
  let valid = true;
  let message = "";

  if (!value) {
    valid = false;
    message = AuthState.channel === "phone" ? "Enter a phone number." : "Enter an email address.";
  } else if (AuthState.channel === "phone" && !/^\+?[0-9\s-]{8,15}$/.test(value)) {
    valid = false;
    message = "Enter a valid phone number.";
  } else if (AuthState.channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    valid = false;
    message = "Enter a valid email address.";
  }

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.toggle("show", !valid);
  }
  return valid;
}

function sendOtp() {
  if (!validateContact()) return;

  // Simulated OTP generation — in production this call goes to a backend
  // which generates and dispatches the OTP via SMS/email gateway.
  AuthState.otp = String(Math.floor(100000 + Math.random() * 900000));
  AuthState.otpVerified = false;

  const destination = getContactValue();
  const masked = maskContact(destination);

  const otpBlock = document.getElementById("otpBlock");
  const sentNote = document.getElementById("otpSentNote");
  const sendBtn = document.getElementById("sendOtpBtn");

  if (otpBlock) otpBlock.classList.add("show");
  if (sentNote) sentNote.innerHTML = `<i data-lucide="check-circle-2"></i> 6-digit code sent to <strong>${masked}</strong>`;
  if (sendBtn) sendBtn.disabled = true;

  lucide.createIcons();
  clearOtpInputs();
  startResendTimer();

  showToast(`OTP sent to ${masked}`, "success", "send");

  // DEV CONVENIENCE ONLY: surfaces the generated code so the flow is
  // testable without a real SMS/email backend wired up. Remove in production.
  console.info("[UrbanEye DEV] Generated OTP:", AuthState.otp);
  const devHint = document.getElementById("devOtpHint");
  if (devHint) {
    devHint.textContent = `Dev preview only — code: ${AuthState.otp}`;
    devHint.style.display = "block";
  }
}

function maskContact(value) {
  if (AuthState.channel === "phone") {
    return value.length > 4 ? value.slice(0, -4).replace(/\d/g, "•") + value.slice(-4) : value;
  }
  const [user, domain] = value.split("@");
  if (!domain) return value;
  const maskedUser = user.length > 2 ? user.slice(0, 2) + "•".repeat(Math.max(user.length - 2, 2)) : user;
  return `${maskedUser}@${domain}`;
}

function clearOtpInputs() {
  const inputs = document.querySelectorAll(".otp-inputs input");
  inputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
  if (inputs[0]) inputs[0].focus();
  const status = document.getElementById("otpStatus");
  if (status) { status.classList.remove("show", "success", "error"); status.textContent = ""; }
}

function resetOtpBlock() {
  AuthState.otp = null;
  AuthState.otpVerified = false;
  const otpBlock = document.getElementById("otpBlock");
  const sendBtn = document.getElementById("sendOtpBtn");
  if (otpBlock) otpBlock.classList.remove("show");
  if (sendBtn) sendBtn.disabled = false;
  clearTimeout(AuthState.timerHandle);
  const devHint = document.getElementById("devOtpHint");
  if (devHint) devHint.style.display = "none";
}

function startResendTimer() {
  let seconds = AuthState.resendSeconds;
  const resendBtn = document.getElementById("resendBtn");
  const timerEl = document.getElementById("otpTimer");
  clearTimeout(AuthState.timerHandle);
  if (resendBtn) resendBtn.disabled = true;

  function tick() {
    if (timerEl) timerEl.innerHTML = `Code expires in <strong>00:${String(seconds).padStart(2, "0")}</strong>`;
    if (seconds <= 0) {
      if (timerEl) timerEl.innerHTML = `<strong>Code expired</strong> — request a new one`;
      if (resendBtn) resendBtn.disabled = false;
      return;
    }
    seconds--;
    AuthState.timerHandle = setTimeout(tick, 1000);
  }
  tick();
}

function resendOtp() {
  sendOtp();
}

/* ---------- OTP input box behavior (auto-advance / backspace / paste) ---------- */
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

function verifyOtp(enteredOverride) {
  const inputs = Array.from(document.querySelectorAll(".otp-inputs input"));
  const entered = enteredOverride || inputs.map(i => i.value).join("");
  const status = document.getElementById("otpStatus");

  if (entered.length < inputs.length) {
    if (status) {
      status.textContent = "Enter all 6 digits.";
      status.className = "otp-status show error";
    }
    return;
  }

  if (entered === AuthState.otp) {
    AuthState.otpVerified = true;
    if (status) {
      status.innerHTML = '<i data-lucide="check-circle-2"></i> Verified successfully';
      status.className = "otp-status show success";
      lucide.createIcons();
    }
    clearTimeout(AuthState.timerHandle);
    showToast("Contact verified", "success", "check-circle-2");
  } else {
    AuthState.otpVerified = false;
    if (status) {
      status.innerHTML = '<i data-lucide="x-circle"></i> Incorrect code — try again';
      status.className = "otp-status show error";
      lucide.createIcons();
    }
  }
}

/* ---------- Form submission stubs ---------- */
function handleLoginSubmit(event) {
  event.preventDefault();
  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!identifier || !password) {
    showToast("Enter your credentials to continue.", "error", "alert-triangle");
    return;
  }

  const roleLabel = AuthState.role === "admin" ? "Admin" : "Citizen";
  showToast(`${roleLabel} login successful — redirecting…`, "success", "check-circle-2");
  // In production: POST credentials + role to /api/auth/login, then redirect
  // to the role-appropriate dashboard on success.
  setTimeout(() => {
    window.location.href = AuthState.role === "admin" ? "index.html#analytics" : "index.html#feed";
  }, 1200);
}

function handleRegisterSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regConfirmPassword").value;

  if (!name) {
    showToast("Enter your full name.", "error", "alert-triangle");
    return;
  }
  if (!validateContact()) {
    showToast("Check your phone/email field.", "error", "alert-triangle");
    return;
  }
  if (!AuthState.otpVerified) {
    showToast("Please verify the OTP before continuing.", "error", "shield-alert");
    return;
  }
  if (password.length < 8) {
    showToast("Password must be at least 8 characters.", "error", "alert-triangle");
    return;
  }
  if (password !== confirmPassword) {
    showToast("Passwords don't match.", "error", "alert-triangle");
    return;
  }
  if (AuthState.role === "admin") {
    const code = document.getElementById("adminAccessCode");
    if (code && !code.value.trim()) {
      showToast("Enter the Admin Access Code.", "error", "shield-alert");
      return;
    }
  }

  const roleLabel = AuthState.role === "admin" ? "Admin" : "Citizen";
  showToast(`${roleLabel} account created — redirecting to login…`, "success", "check-circle-2");
  // In production: POST verified registration payload to /api/auth/register.
  setTimeout(() => { window.location.href = "login.html"; }, 1400);
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
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