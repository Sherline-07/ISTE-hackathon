let map, selectedMarker;

// Database of existing complaints for duplicate detection
const existingIssues = [
  { id: "#UE-4812", title: "Severe Pothole Cluster", lat: 12.9716, lng: 80.2452, upvotes: 18 },
  { id: "#UE-4790", title: "Damaged Streetlight Junction Box", lat: 12.9812, lng: 80.2311, upvotes: 43 },
  { id: "#UE-4655", title: "Overflowing Bin", lat: 12.9601, lng: 80.2188, upvotes: 31 }
];

// Calculate Haversine distance in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Initialize Interactive Leaflet Map
function initMap() {
  map = L.map('map').setView([12.9716, 80.2452], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Existing report markers
  existingIssues.forEach(issue => {
    L.marker([issue.lat, issue.lng])
      .addTo(map)
      .bindPopup(`<b>${issue.id}: ${issue.title}</b><br>${issue.upvotes} Upvotes`);
  });

  // CLICK-TO-PIN ON MAP
  map.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(4);
    const lng = e.latlng.lng.toFixed(4);
    updateLocationPin(lat, lng, "Custom Map Pin Selected");
  });
}

// Update map pin and trigger duplicate detection
function updateLocationPin(lat, lng, label) {
  document.getElementById('locationDisplay').value = `${lat}, ${lng}`;

  if (selectedMarker) map.removeLayer(selectedMarker);
  selectedMarker = L.marker([lat, lng]).addTo(map).bindPopup(label).openPopup();

  // RUN DUPLICATE DETECTION LOGIC
  let detectedDuplicate = null;
  for (let issue of existingIssues) {
    const dist = calculateDistance(lat, lng, issue.lat, issue.lng);
    if (dist < 500) {
      detectedDuplicate = issue;
      break;
    }
  }

  const dupAlert = document.getElementById('duplicateAlert');
  if (detectedDuplicate) {
    document.getElementById('duplicateId').textContent = detectedDuplicate.id;
    dupAlert.classList.remove('hidden');
  } else {
    dupAlert.classList.add('hidden');
  }
}

// Fetch Geolocation via GPS Button
function getLocation() {
  const locInput = document.getElementById('locationDisplay');
  if (navigator.geolocation) {
    locInput.value = "Fetching GPS coordinates...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude.toFixed(4);
        const userLng = position.coords.longitude.toFixed(4);
        updateLocationPin(userLat, userLng, "Your GPS Location");
        map.panTo([userLat, userLng]);
      },
      () => {
        updateLocationPin("12.9716", "80.2452", "Default GPS Location");
      }
    );
  }
}

// Emergency Level Trigger Check
function checkEmergencyLevel(urgencyVal) {
  const banner = document.getElementById('emergencyBanner');
  if (urgencyVal === 'high') {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// AI Photo Inspection
function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.getElementById('imagePreview');
      img.src = e.target.result;
      document.getElementById('imagePreviewContainer').style.display = 'block';

      const aiBadge = document.getElementById('aiBadge');
      const aiText = document.getElementById('aiResultText');
      const submitBtn = document.getElementById('submitBtn');

      aiBadge.style.display = 'inline-flex';
      aiText.textContent = "Analyzing image content with AI...";
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.7";

      // Simulation for demo
      setTimeout(() => {
        aiText.innerHTML = "✅ <strong>Infrastructure Hazard Verified</strong> (95% AI Confidence)";
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
      }, 1200);
    }
    reader.readAsDataURL(file);
  }
}

// Handle Form Submission
function handleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('title').value;
  const category = document.getElementById('category').value;
  const location = document.getElementById('locationDisplay').value;
  const description = document.getElementById('description').value || 'No extra description provided.';
  const reporterContact = document.getElementById('reporterContact').value || 'Not provided';
  const imgSrc = document.getElementById('imagePreview').src || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80';

  const ticketId = `#UE-${Math.floor(1000 + Math.random() * 9000)}`;

  const feedGrid = document.getElementById('feedGrid');
  const newCardHtml = `
    <div class="issue-card" data-status="pending">
      <div class="card-image-wrap">
        <img src="${imgSrc}" alt="Issue Photo" class="card-img"/>
        <span class="status-badge status-pending">Pending</span>
        <span class="ai-verified-pill" style="position: absolute; bottom: 10px; right: 10px; background: rgba(15,23,42,0.8); color: #06b6d4; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; gap: 0.3rem;"><i data-lucide="check"></i> AI Verified Photo</span>
      </div>
      <div class="card-body">
        <span class="card-category">${category}</span>
        <h3 class="card-title">${title}</h3>
        <p class="card-desc">${description}</p>
        <div class="card-meta">
          <span><i data-lucide="map-pin"></i> ${location}</span>
          <span><i data-lucide="clock"></i> Just now</span>
        </div>
        <div class="card-footer">
          <button class="btn-upvote" onclick="upvote(this)">
            <i data-lucide="thumbs-up"></i> <span class="vote-count">1</span> Upvotes
          </button>
          <span class="issue-id" style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">ID: ${ticketId}</span>
        </div>
      </div>
    </div>
  `;

  feedGrid.insertAdjacentHTML('afterbegin', newCardHtml);

  const myReportsList = document.getElementById('myReportsList');
  if (myReportsList.querySelector('.empty-state')) {
    myReportsList.innerHTML = '';
  }

  const myReportItem = `
    <div style="background:#fff; padding: 1rem; border-radius:12px; border:1px solid #e2e8f0; margin-bottom: 0.75rem; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${ticketId}: ${title}</strong>
        <div style="font-size: 0.8rem; color:#64748b;">Category: ${category} • Status: <span style="color:#f59e0b; font-weight:bold;">Pending Review</span></div>
      </div>
      <span style="font-size: 0.8rem; color:#64748b;">Contact: ${reporterContact}</span>
    </div>
  `;
  myReportsList.insertAdjacentHTML('afterbegin', myReportItem);

  lucide.createIcons();

  alert(`Report successfully submitted!\n\nYour Reference ID is ${ticketId}.`);
  document.getElementById('issueForm').reset();
  document.getElementById('imagePreviewContainer').style.display = 'none';
  document.getElementById('aiBadge').style.display = 'none';
  document.getElementById('duplicateAlert').classList.add('hidden');
  document.getElementById('emergencyBanner').classList.add('hidden');
}

function upvoteExisting() {
  const dupId = document.getElementById('duplicateId').textContent;
  alert(`Thank you! Your vote has been logged for existing report ${dupId}. Submission cancelled to prevent duplicate clutter.`);
  document.getElementById('issueForm').reset();
  document.getElementById('duplicateAlert').classList.add('hidden');
}

function upvote(btn) {
  const countSpan = btn.querySelector('.vote-count');
  let currentVotes = parseInt(countSpan.textContent);

  if (btn.classList.contains('voted')) {
    btn.classList.remove('voted');
    countSpan.textContent = currentVotes - 1;
  } else {
    btn.classList.add('voted');
    countSpan.textContent = currentVotes + 1;
  }
}

function filterFeed(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const cards = document.querySelectorAll('.issue-card');
  cards.forEach(card => {
    if (status === 'all' || card.getAttribute('data-status') === status) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function initChart() {
  const canvas = document.getElementById('reportsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [
        {
          label: 'Issues Reported',
          data: [65, 85, 110, 130, 155, 140, 175],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Issues Resolved',
          data: [50, 78, 102, 125, 150, 138, 168],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', weight: 'bold' } } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function scrollToReport() {
  document.getElementById('report').scrollIntoView({ behavior: 'smooth' });
}

window.addEventListener('DOMContentLoaded', () => {
  initMap();
  initChart();
});
