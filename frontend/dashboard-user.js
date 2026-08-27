/* --- UrbanEye Dashboard: account menu + notifications bell --- */
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("urbaneye_token");
  const name = localStorage.getItem("urbaneye_name");
  const phone = localStorage.getItem("urbaneye_phone");
  const role = localStorage.getItem("urbaneye_role");

  if (!token || !name) return; // not logged in — leave navbar as-is

  const navActions = document.querySelector(".nav-actions");
  const navbar = document.querySelector(".nav-container") || document.querySelector("nav");
  const mountPoint = navActions || navbar || document.body;

  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;align-items:center;gap:0.75rem;position:relative;";

  const initial = (name.trim().charAt(0) || "U").toUpperCase();
  const roleLabel = role === "admin" ? "Admin" : "Citizen";

  wrap.innerHTML = `
    <!-- Notification bell -->
    <div style="position:relative;">
      <button id="ueNotifBtn" aria-label="Notifications" style="
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.15);
        color:#fff;
        width:38px;height:38px;
        border-radius:10px;
        cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        position:relative;">
        <i data-lucide="bell" style="width:18px;height:18px;"></i>
        <span id="ueNotifDot" style="
          position:absolute;top:6px;right:6px;
          width:8px;height:8px;border-radius:50%;
          background:#ef4444;border:1.5px solid #0f172a;"></span>
      </button>
      <div id="ueNotifPanel" style="
        display:none;
        position:absolute;
        top:48px;right:0;
        width:300px;
        background:#0f172a;
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        box-shadow:0 20px 40px rgba(0,0,0,0.45);
        padding:0.75rem;
        z-index:2000;">
        <div style="font-size:0.8rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;padding:0.25rem 0.5rem 0.5rem;">Notifications</div>
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          ${notifItem("check-circle-2", "#34d399", "Report #UE-4790 marked In Progress", "10 min ago")}
          ${notifItem("thumbs-up", "#38bdf8", "Your report received 5 new upvotes", "1 hr ago")}
          ${notifItem("alert-triangle", "#fbbf24", "Duplicate report merged near your area", "3 hr ago")}
        </div>
      </div>
    </div>

    <!-- Account avatar + dropdown -->
    <div style="position:relative;">
      <button id="ueAccountBtn" style="
        display:flex;align-items:center;gap:0.5rem;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.15);
        color:#fff;
        padding:0.4rem 0.75rem 0.4rem 0.4rem;
        border-radius:10px;
        cursor:pointer;
        font-weight:600;
        font-size:0.85rem;">
        <span style="
          width:28px;height:28px;border-radius:50%;
          background:linear-gradient(135deg,#10b981,#0284c7);
          display:flex;align-items:center;justify-content:center;
          font-size:0.8rem;font-weight:800;color:#fff;">${escapeHtml(initial)}</span>
        ${escapeHtml(name.split(" ")[0] || "Account")}
        <i data-lucide="chevron-down" style="width:14px;height:14px;"></i>
      </button>
      <div id="ueAccountPanel" style="
        display:none;
        position:absolute;
        top:48px;right:0;
        width:240px;
        background:#0f172a;
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        box-shadow:0 20px 40px rgba(0,0,0,0.45);
        padding:0.85rem;
        z-index:2000;">
        <div style="font-size:0.95rem;font-weight:700;color:#fff;">${escapeHtml(name)}</div>
        <div style="font-size:0.78rem;color:#94a3b8;margin-top:0.15rem;">${escapeHtml(roleLabel)} account</div>
        ${phone ? `<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.82rem;color:#cbd5e1;margin-top:0.6rem;"><i data-lucide="phone" style="width:14px;height:14px;"></i> ${escapeHtml(phone)}</div>` : ""}
        <a href="#my-reports" style="
          display:flex;align-items:center;gap:0.5rem;
          margin-top:0.85rem;
          padding:0.55rem 0.6rem;
          border-radius:8px;
          background:rgba(255,255,255,0.05);
          color:#e2e8f0;
          text-decoration:none;
          font-size:0.82rem;
          font-weight:600;">
          <i data-lucide="file-text" style="width:14px;height:14px;"></i> My Reports
        </a>
        <button id="ueAccountLogout" style="
          width:100%;
          margin-top:0.5rem;
          background:rgba(239,68,68,0.12);
          color:#f87171;
          border:1px solid rgba(239,68,68,0.25);
          padding:0.55rem 0.6rem;
          border-radius:8px;
          font-size:0.82rem;
          font-weight:700;
          cursor:pointer;
          display:flex;align-items:center;gap:0.5rem;">
          <i data-lucide="log-out" style="width:14px;height:14px;"></i> Log out
        </button>
      </div>
    </div>
  `;

  mountPoint.prepend(wrap);
  if (typeof lucide !== "undefined") lucide.createIcons();

  const notifBtn = document.getElementById("ueNotifBtn");
  const notifPanel = document.getElementById("ueNotifPanel");
  const accountBtn = document.getElementById("ueAccountBtn");
  const accountPanel = document.getElementById("ueAccountPanel");
  const notifDot = document.getElementById("ueNotifDot");

  notifBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    accountPanel.style.display = "none";
    notifPanel.style.display = notifPanel.style.display === "block" ? "none" : "block";
    if (notifDot) notifDot.style.display = "none";
  });

  accountBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notifPanel.style.display = "none";
    accountPanel.style.display = accountPanel.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", () => {
    notifPanel.style.display = "none";
    accountPanel.style.display = "none";
  });

  document.getElementById("ueAccountLogout").addEventListener("click", () => {
    localStorage.removeItem("urbaneye_token");
    localStorage.removeItem("urbaneye_role");
    localStorage.removeItem("urbaneye_name");
    localStorage.removeItem("urbaneye_phone");
    window.location.href = "index.html";
  });

  function notifItem(icon, color, text, time) {
    return `
      <div style="display:flex;gap:0.6rem;padding:0.5rem;border-radius:10px;">
        <div style="
          width:30px;height:30px;border-radius:8px;
          background:${color}22;color:${color};
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;">
          <i data-lucide="${icon}" style="width:15px;height:15px;"></i>
        </div>
        <div>
          <div style="font-size:0.8rem;color:#e2e8f0;line-height:1.35;">${escapeHtml(text)}</div>
          <div style="font-size:0.72rem;color:#64748b;margin-top:0.15rem;">${escapeHtml(time)}</div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }
});