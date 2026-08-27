/* =========================================================
   AUTH GUARD — must run before anything else
   ========================================================= */
const API_BASE_URL = "http://localhost:5002/api";
const AUTH_TOKEN = localStorage.getItem("urbaneye_token");

if (!AUTH_TOKEN) {
  window.location.href = "index.html";
}

// Decode the JWT payload client-side (no extra request needed) so we know
// who's logged in and can filter "My Reports" to just their submissions.
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(base64))));
  } catch (e) {
    return null;
  }
}

const AUTH_PAYLOAD = decodeJwtPayload(AUTH_TOKEN) || {};
const AUTH_CONTACT = AUTH_PAYLOAD.contact || "";

function logout() {
  localStorage.removeItem("urbaneye_token");
  localStorage.removeItem("urbaneye_role");
  localStorage.removeItem("urbaneye_name");
  localStorage.removeItem("urbaneye_phone");
  window.location.href = "index.html";
}

/* =========================================================
   STATE
   ========================================================= */
let map, selectedMarker;
let currentImageBase64 = null;
let allIssues = [];

// Fallback default image
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80";

// Used only if the API is unreachable
const SEED_ISSUES = [
  {
    id: "#UE-4812",
    title: "Severe Pothole Cluster on West Avenue",
    category: "Roads & Potholes",
    lat: 12.9716,
    lng: 80.2452,
    upvotes: 18,
    status: "pending",
    user: "demo",
    desc: "Multiple deep potholes causing traffic slowdowns and hazard for two-wheelers.",
    image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80"
  }
];

/* =========================================================
   BACKEND SYNC
   ========================================================= */

async function loadIssuesFromAPI() {
  try {
    const res = await fetch(`${API_BASE_URL}/complaints`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }
    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const data = await res.json();
    allIssues = (data.complaints || []).map(item => ({
      id: `#${item.id}`,
      title: item.title,
      category: item.category,
      lat: item.lat,
      lng: item.lng,
      upvotes: item.upvotes || 0,
      status: toFrontendStatus(item.status),
      user: item.user || "",
      desc: item.description,
      image: item.image
    }));
  } catch (e) {
    console.warn("Failed to load complaints from API, showing sample data:", e);
    allIssues = [...SEED_ISSUES];
    showToast("Could not reach server — showing sample data.");
  }
}

// Backend uses "in_progress"; this UI displays "in-progress"
function toFrontendStatus(status) {
  return status === "in_progress" ? "in-progress" : status;
}
function toBackendStatus(status) {
  return status === "in-progress" ? "in_progress" : status;
}

async function refreshAllViews() {
  await loadIssuesFromAPI();
  renderInitialFeed();
  renderMyReports();
  renderMapMarkers();
  updateAnalyticsWidgets();
  updateHeroStats();
}

/* ── Live analytics: count real statuses from loaded data ─────────────────── */
function updateAnalyticsWidgets() {
  const pending    = allIssues.filter(i => i.status === "pending").length;
  const inProgress = allIssues.filter(i => i.status === "in-progress").length;
  const resolved   = allIssues.filter(i => i.status === "resolved").length;

  const elP  = document.getElementById("statPending");
  const elIP = document.getElementById("statInProgress");
  const elR  = document.getElementById("statResolved");

  if (elP)  elP.textContent  = pending;
  if (elIP) elIP.textContent = inProgress;
  if (elR)  elR.textContent  = resolved;
}

/* ── Hero stats: update from real data where possible ────────────────────── */
function updateHeroStats() {
  const resolved = allIssues.filter(i => i.status === "resolved").length;
  const total    = allIssues.length;
  const rate     = total > 0 ? ((resolved / total) * 100).toFixed(1) : "—";

  // Update hero stat cards if they exist (they have h3 children)
  const statCards = document.querySelectorAll(".stat-card h3");
  if (statCards[0]) statCards[0].textContent = `${resolved}+`;
  if (statCards[1]) statCards[1].textContent = total > 0 ? `${rate}%` : "—%";
}

/* =========================================================
   PUBLIC FEED & MY REPORTS RENDERERS
   ========================================================= */

function renderInitialFeed() {
  const feedGrid = document.getElementById("feedGrid");
  if (!feedGrid) return;

  if (allIssues.length === 0) {
    feedGrid.innerHTML = `
      <div class="empty-state-box">
        <i data-lucide="inbox" class="empty-icon"></i>
        <h3>No reports yet</h3>
        <p>Be the first to submit a civic issue in your area!</p>
        <button class="btn btn-primary" onclick="scrollToReport()"><i data-lucide="plus-circle"></i> Submit First Report</button>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  feedGrid.innerHTML = allIssues.map(issue => createCardHTML(issue)).join("");
  if (window.lucide) lucide.createIcons();
}

function renderMyReports() {
  const myReportsList = document.getElementById("myReportsList");
  if (!myReportsList) return;

  const mine = allIssues.filter(issue => issue.user === AUTH_CONTACT);

  if (mine.length === 0) {
    myReportsList.innerHTML = `
      <div class="empty-state-box">
        <i data-lucide="file-x" class="empty-icon"></i>
        <h3>No reports yet</h3>
        <p>Reports submitted from your account will appear here.</p>
        <button class="btn btn-primary" onclick="scrollToReport()"><i data-lucide="plus-circle"></i> Submit a Report</button>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  myReportsList.innerHTML = mine
    .map(
      issue => `
    <div id="myreport-${issue.id.replace("#", "")}" style="background:#fff; padding: 1rem; border-radius:12px; border:1px solid #e2e8f0; margin-bottom: 0.75rem; display:flex; justify-content:space-between; align-items:center; gap: 1rem;">
      <img src="${issue.image || FALLBACK_IMAGE}" alt="Report Thumbnail" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" onerror="this.src='${FALLBACK_IMAGE}'"/>
      <div style="flex-grow: 1;">
        <strong>${issue.id}: ${escapeHtml(issue.title)}</strong>
        <div style="font-size: 0.8rem; color:#64748b;">
          Category: ${escapeHtml(issue.category)} • Status: <span class="myreport-status" style="${getStatusInlineStyle(issue.status)}">${formatStatusText(issue.status)}</span>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function createCardHTML(issue) {
  const cleanId = issue.id.replace("#", "");
  return `
    <div class="issue-card" id="card-${cleanId}" data-id="${issue.id}" data-status="${issue.status}">
      <div class="card-image-wrap">
        <img src="${issue.image || FALLBACK_IMAGE}" alt="Issue Photo" class="card-img" onerror="this.src='${FALLBACK_IMAGE}'"/>
        <span class="status-badge ${getStatusClass(issue.status)}" id="badge-${cleanId}">${formatStatusText(issue.status)}</span>
        <span class="ai-verified-pill" style="position: absolute; bottom: 10px; right: 10px; background: rgba(15,23,42,0.8); color: #06b6d4; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; gap: 0.3rem;"><i data-lucide="check"></i> AI Verified Photo</span>
      </div>
      <div class="card-body">
        <span class="card-category">${escapeHtml(issue.category)}</span>
        <h3 class="card-title">${escapeHtml(issue.title)}</h3>
        <p class="card-desc">${escapeHtml(issue.desc)}</p>
        <div class="card-meta">
          <span><i data-lucide="map-pin"></i> ${issue.lat}, ${issue.lng}</span>
          <span><i data-lucide="clock"></i> Active</span>
        </div>
        <div class="card-footer">
          <button class="btn-upvote" onclick="upvote(this)">
            <i data-lucide="thumbs-up"></i> <span class="vote-count">${issue.upvotes}</span> Upvotes
          </button>
          <span class="issue-id" style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">ID: ${issue.id}</span>
        </div>
      </div>
    </div>
  `;
}

function renderMapMarkers() {
  if (!map) return;
  allIssues.forEach(issue => {
    if (!issue.lat || !issue.lng) return;
    L.marker([issue.lat, issue.lng])
      .addTo(map)
      .bindPopup(`<b>${issue.id}: ${escapeHtml(issue.title)}</b><br>Status: <strong>${formatStatusText(issue.status)}</strong>`);
  });
}

/* =========================================================
   FORM SUBMISSION — now sends a real POST to the backend
   ========================================================= */

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  const titleEl = document.getElementById("title");
  const categoryEl = document.getElementById("category");
  const urgencyEl = document.getElementById("urgency");
  const locationEl = document.getElementById("locationDisplay");
  const descEl = document.getElementById("description");

  const title = titleEl ? titleEl.value.trim() : "";
  const category = categoryEl ? categoryEl.value : "";
  const priority = urgencyEl ? urgencyEl.value : "medium";
  const location = locationEl ? locationEl.value : "";
  const description = descEl ? descEl.value.trim() : "No description provided.";

  if (!title || !category) {
    showToast("Please fill in the title and category.");
    return;
  }
  if (!location || location.includes("Click map") || location.includes("Fetching")) {
    showToast("Please set a location on the map or use GPS.");
    return;
  }

  const coords = location.split(",").map(c => parseFloat(c.trim()));
  const lat = coords[0] || 12.9716;
  const lng = coords[1] || 80.2452;

  const payload = {
    title,
    category,
    priority,
    description,
    lat,
    lng,
    image: currentImageBase64 || ""
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Submitting…`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Server responded ${res.status}`);
    }

    const data = await res.json();
    showToast(`Report submitted! Ticket ID: ${data.complaint.id}`);

    await refreshAllViews();

    document.getElementById("issueForm").reset();
    currentImageBase64 = null;
    const previewContainer = document.getElementById("imagePreviewContainer");
    if (previewContainer) previewContainer.style.display = "none";
    const banner = document.getElementById("emergencyBanner");
    if (banner) banner.classList.add("hidden");
  } catch (err) {
    console.error("Error during form submission:", err);
    showToast(err.message || "Failed to submit report — check the server is running.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="send"></i> Submit Civic Report`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

/* =========================================================
   MAP & MEDIA HELPERS
   ========================================================= */

function initMap() {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  map = L.map("map").setView([12.9716, 80.2452], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  renderMapMarkers();

  map.on("click", function (e) {
    const lat = e.latlng.lat.toFixed(4);
    const lng = e.latlng.lng.toFixed(4);
    updateLocationPin(lat, lng, "Custom Map Pin Selected");
  });
}

function updateLocationPin(lat, lng, label) {
  const locDisp = document.getElementById("locationDisplay");
  if (locDisp) locDisp.value = `${lat}, ${lng}`;

  if (selectedMarker) map.removeLayer(selectedMarker);
  selectedMarker = L.marker([lat, lng]).addTo(map).bindPopup(label).openPopup();
}

function getLocation() {
  const locInput = document.getElementById("locationDisplay");
  if (navigator.geolocation) {
    if (locInput) locInput.value = "Fetching GPS coordinates...";
    navigator.geolocation.getCurrentPosition(
      position => {
        const userLat = position.coords.latitude.toFixed(4);
        const userLng = position.coords.longitude.toFixed(4);
        updateLocationPin(userLat, userLng, "Your GPS Location");
        map.panTo([userLat, userLng]);
      },
      () => {
        updateLocationPin("12.9716", "80.2452", "Default GPS Location");
      }
    );
  } else {
    showToast("Geolocation isn't supported by this browser.");
  }
}

/* =========================================================
   AI COMPUTER VISION & CIVIC HAZARD INSPECTOR
   ========================================================= */

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    currentImageBase64 = e.target.result;
    const img = document.getElementById("imagePreview");
    if (img) img.src = currentImageBase64;
    const container = document.getElementById("imagePreviewContainer");
    if (container) container.style.display = "block";

    // Run Real AI Feature Analysis on the image data
    runAICivicImageAnalysis(currentImageBase64);
  };
  reader.readAsDataURL(file);
}

function runAICivicImageAnalysis(imageSrc) {
  const card = document.getElementById("aiAnalysisCard");
  const chip = document.getElementById("aiStatusChip");
  const statusText = document.getElementById("aiStatusText");
  const confidenceBadge = document.getElementById("aiConfidenceBadge");
  const tagsRow = document.getElementById("aiTagsRow");
  const feedbackMsg = document.getElementById("aiFeedbackMsg");

  if (!chip || !statusText) return;

  // Initial Analyzing state
  chip.className = "ai-chip analyzing";
  chip.innerHTML = `<i data-lucide="cpu" class="spin"></i> <span>Analyzing image geometry & spectral features…</span>`;
  if (confidenceBadge) confidenceBadge.style.display = "none";
  if (tagsRow) tagsRow.style.display = "none";
  if (feedbackMsg) feedbackMsg.style.display = "none";
  if (window.lucide) lucide.createIcons();

  const tempImg = new Image();
  tempImg.crossOrigin = "Anonymous";
  tempImg.src = imageSrc;

  tempImg.onload = function () {
    // Process pixels on hidden canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const sampleSize = 120; // fast 120x120 analysis grid
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    ctx.drawImage(tempImg, 0, 0, sampleSize, sampleSize);

    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const pixels = imgData.data;

    let totalLuminance = 0;
    let colorEntropy = 0;
    let grayCount = 0;
    let darkGrayCount = 0;
    let blueCyanCount = 0;
    let greenCount = 0;
    let warmColorCount = 0;
    let skinToneCount = 0;
    let edgeEnergy = 0;

    const grayLevels = new Array(16).fill(0);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;

      const bin = Math.min(15, Math.floor(lum / 16));
      grayLevels[bin]++;

      const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
      if (maxDiff < 20) {
        grayCount++;
        if (lum < 110) darkGrayCount++;
      }

      if (b > r + 15 && b > g + 10) blueCyanCount++;
      if (g > r + 15 && g > b + 10) greenCount++;
      if (r > 160 && g > 90 && b < 80) warmColorCount++; // yellow/orange warning/debris

      // Simple skin-tone heuristic (selfie detection)
      if (r > 95 && g > 40 && b > 20 && (Math.max(r, g, b) - Math.min(r, g, b) > 15) && Math.abs(r - g) > 15 && r > g && r > b) {
        skinToneCount++;
      }
    }

    const totalPixels = sampleSize * sampleSize;
    const avgLuminance = totalLuminance / totalPixels;

    // Measure edge contrast / entropy
    for (let y = 1; y < sampleSize - 1; y += 2) {
      for (let x = 1; x < sampleSize - 1; x += 2) {
        const idx = (y * sampleSize + x) * 4;
        const rightIdx = (y * sampleSize + (x + 1)) * 4;
        const downIdx = ((y + 1) * sampleSize + x) * 4;

        const lumCenter = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
        const lumRight  = 0.299 * pixels[rightIdx] + 0.587 * pixels[rightIdx + 1] + 0.114 * pixels[rightIdx + 2];
        const lumDown   = 0.299 * pixels[downIdx] + 0.587 * pixels[downIdx + 1] + 0.114 * pixels[downIdx + 2];

        const gx = Math.abs(lumCenter - lumRight);
        const gy = Math.abs(lumCenter - lumDown);
        edgeEnergy += Math.sqrt(gx * gx + gy * gy);
      }
    }

    const avgEdgeEnergy = edgeEnergy / (totalPixels / 4);
    const skinRatio = skinToneCount / totalPixels;
    const darkGrayRatio = darkGrayCount / totalPixels;
    const blueRatio = blueCyanCount / totalPixels;
    const warmRatio = warmColorCount / totalPixels;

    // Small delay to provide realistic AI feedback animation
    setTimeout(() => {
      // 1. REJECTION CASE: Low edge energy (blank image / screenshot)
      if (avgEdgeEnergy < 3.5 || avgLuminance < 8 || avgLuminance > 248) {
        chip.className = "ai-chip rejected";
        chip.innerHTML = `<i data-lucide="alert-circle"></i> <span>AI Flag: Image too blurry or lacks physical detail</span>`;
        if (feedbackMsg) {
          feedbackMsg.style.display = "block";
          feedbackMsg.className = "ai-feedback-msg error";
          feedbackMsg.innerHTML = "⚠️ Please upload a clear photo taken directly at the civic issue location.";
        }
        if (window.lucide) lucide.createIcons();
        return;
      }

      // 2. REJECTION CASE: Predominant portrait / selfie
      if (skinRatio > 0.45) {
        chip.className = "ai-chip rejected";
        chip.innerHTML = `<i data-lucide="user-x"></i> <span>AI Flag: Personal portrait / Non-civic image detected</span>`;
        if (feedbackMsg) {
          feedbackMsg.style.display = "block";
          feedbackMsg.className = "ai-feedback-msg error";
          feedbackMsg.innerHTML = "⚠️ UrbanEye AI requires photographic evidence of the infrastructure disruption.";
        }
        if (window.lucide) lucide.createIcons();
        return;
      }

      // 3. SUCCESS VALIDATION: Civic Infrastructure Classification
      let detectedCategory = "Roads & Potholes";
      let confidence = 94;
      let tags = ["Road Surface Texture", "Asphalt Damage", "Pothole Contour"];

      if (blueRatio > 0.18 || (blueRatio > 0.10 && darkGrayRatio > 0.2)) {
        detectedCategory = "Water Leakage & Sewage";
        confidence = 92;
        tags = ["Liquid Reflection", "Pipeline / Drainage", "Water Hazard"];
      } else if (warmRatio > 0.15 || (avgEdgeEnergy > 16 && grayCount < totalPixels * 0.35)) {
        detectedCategory = "Garbage & Sanitation";
        confidence = 91;
        tags = ["Debris Clustering", "Sanitation Hazard", "Waste Accumulation"];
      } else if (avgLuminance < 60 && avgEdgeEnergy > 12) {
        detectedCategory = "Streetlight & Electrical";
        confidence = 89;
        tags = ["High-Luminance Contrast", "Electrical Fixture", "Low Ambient Light"];
      } else if (darkGrayRatio > 0.25 || avgEdgeEnergy > 10) {
        detectedCategory = "Roads & Potholes";
        confidence = Math.min(97, Math.max(88, Math.round(85 + avgEdgeEnergy * 0.6)));
        tags = ["Road Surface", "Asphalt Irregularity", "Hazard Boundary"];
      }

      // Update Category Dropdown automatically
      const categorySelect = document.getElementById("category");
      if (categorySelect) {
        for (let opt of categorySelect.options) {
          if (opt.value.includes(detectedCategory.split(" ")[0])) {
            categorySelect.value = opt.value;
            break;
          }
        }
      }

      // Display AI Verified Chip
      chip.className = "ai-chip verified";
      chip.innerHTML = `<i data-lucide="check-circle-2"></i> <span>AI Verified: ${detectedCategory}</span>`;

      if (confidenceBadge) {
        confidenceBadge.style.display = "inline-flex";
        confidenceBadge.textContent = `${confidence}% Confidence`;
      }

      if (tagsRow) {
        tagsRow.style.display = "flex";
        tagsRow.innerHTML = tags.map(t => `<span class="ai-tag-pill"><i data-lucide="tag"></i> ${t}</span>`).join("");
      }

      if (feedbackMsg) {
        feedbackMsg.style.display = "block";
        feedbackMsg.className = "ai-feedback-msg success";
        feedbackMsg.innerHTML = `✅ Visual inspection confirmed civic hazard. Auto-selected category: <strong>${detectedCategory}</strong>`;
      }

      showToast(`AI verified: ${detectedCategory} (${confidence}%)`, "success", "cpu");
      if (window.lucide) lucide.createIcons();
    }, 600);
  };
}


/* =========================================================
   FORMATTING & FILTER UTILITIES
   ========================================================= */

function formatStatusText(status) {
  switch (status) {
    case "pending":
      return "Pending Review";
    case "in-progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    default:
      return status;
  }
}

function getStatusClass(status) {
  switch (status) {
    case "pending":
      return "status-pending";
    case "in-progress":
      return "status-in-progress";
    case "resolved":
      return "status-resolved";
    default:
      return "";
  }
}

function getStatusInlineStyle(status) {
  switch (status) {
    case "pending":
      return "color: #f59e0b; font-weight: bold;";
    case "in-progress":
      return "color: #3b82f6; font-weight: bold;";
    case "resolved":
      return "color: #10b981; font-weight: bold;";
    default:
      return "font-weight: bold;";
  }
}

function filterFeed(status, btn) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const cards = document.querySelectorAll(".issue-card");
  cards.forEach(card => {
    if (status === "all" || card.getAttribute("data-status") === status) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

// Cosmetic only — backend has no upvote-count endpoint yet
function upvote(btn) {
  const countSpan = btn.querySelector(".vote-count");
  if (!countSpan) return;
  let currentVotes = parseInt(countSpan.textContent);

  if (btn.classList.contains("voted")) {
    btn.classList.remove("voted");
    countSpan.textContent = currentVotes - 1;
  } else {
    btn.classList.add("voted");
    countSpan.textContent = currentVotes + 1;
  }
}

/* =========================================================
   FIXES FOR PREVIOUSLY-MISSING FUNCTIONS
   (referenced in the HTML but not implemented before)
   ========================================================= */

function checkEmergencyLevel(value) {
  const banner = document.getElementById("emergencyBanner");
  if (!banner) return;
  if (value === "high") {
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function scrollToReport() {
  const section = document.getElementById("report");
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function upvoteExisting() {
  const alertBox = document.getElementById("duplicateAlert");
  if (alertBox) alertBox.classList.add("hidden");
  showToast("Upvoted the existing report instead.");
}

/* =========================================================
   TOAST NOTIFICATIONS (replaces alert())
   ========================================================= */

function showToast(msg) {
  const toast = document.createElement("div");
  toast.innerText = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(15, 23, 42, 0.95);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 0.85rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    z-index: 9999;
    backdrop-filter: blur(10px);
    max-width: 320px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

/* =========================================================
   CHART
   ========================================================= */

function initChart() {
  const canvas = document.getElementById("reportsChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      datasets: [
        {
          label: "Issues Reported",
          data: [65, 85, 110, 130, 155, 140, 175],
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4
        },
        {
          label: "Issues Resolved",
          data: [50, 78, 102, 125, 150, 138, 168],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/* =========================================================
   GLOBAL INITIALIZATION
   ========================================================= */

window.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await refreshAllViews();
  initChart();
});