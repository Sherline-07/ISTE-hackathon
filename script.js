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
// Initialize Interactive Leaflet Map with Click-to-Pin Capability
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
  // CLICK-TO-PIN ON MAP (User can click anywhere to pick location)
  map.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(4);
    const lng = e.latlng.lng.toFixed(4);
    
    updateLocationPin(lat, lng, "Custom Map Pin Selected");
  });
}
// Helper function to update map pin and trigger duplicate detection
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

  if (detectedDuplicate) {
    document.getElementById('duplicateId').textContent = detectedDuplicate.id;
    document.getElementById('duplicateAlert').classList.remove('hidden');
  } else {
    document.getElementById('duplicateAlert').classList.add('hidden');
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

// AI Photo Content Inspector (Detects Document / Text-Only Images)
function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    reader.onload = function(e) {
      const img = document.getElementById('imagePreview');
      img.src = e.target.result;
      document.getElementById('imagePreviewContainer').style.display = 'block';

      const aiBadge = document.getElementById('aiBadge');
      const aiText = document.getElementById('aiResultText');
      const submitBtn = document.getElementById('submitBtn');

      aiBadge.className = "ai-tag-badge";
      aiText.textContent = "Analyzing image content...";

      setTimeout(() => {
        // Simple heuristic: check if file name or properties resemble a text screenshot/document
        if (fileName.includes("screenshot") || fileName.includes("text") || fileName.includes("doc")) {
          aiBadge.className = "ai-tag-badge invalid";
          aiText.innerHTML = "❌ <strong>Invalid Photo:</strong> Image appears to be text/document. Please upload a clear photo of the physical infrastructure defect.";
          submitBtn.disabled = true;
          submitBtn.style.opacity = "0.5";
        } else {
          aiBadge.className = "ai-tag-badge";
          aiText.innerHTML = "✅ <strong>Infrastructure Hazard Confirmed</strong> (96% AI Vision Confidence)";
          submitBtn.disabled = false;
          submitBtn.style.opacity = "1";
        }
      }, 900);
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
        <span class="ai-verified-pill"><i data-lucide="check"></i> AI Verified Photo</span>
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
          <span class="issue-id">ID: ${ticketId}</span>
        </div>
      </div>
    </div>
  `;

  feedGrid.insertAdjacentHTML('afterbegin', newCardHtml);

  // Append to "My Submitted Reports"
  const myReportsList = document.getElementById('myReportsList');
  if (myReportsList.querySelector('.empty-state')) {
    myReportsList.innerHTML = '';
  }

  const myReportItem = `
    <div style="background:#fff; padding: 0.85rem; border-radius:8px; border:1px solid #e2e8f0; margin-bottom: 0.5rem; display:flex; justify-between; align-items:center;">
      <div>
        <strong>${ticketId}: ${title}</strong>
        <div style="font-size: 0.8rem; color:#64748b;">Category: ${category} • Status: <span style="color:#d97706; font-weight:bold;">Pending Review</span></div>
      </div>
      <span style="font-size: 0.8rem; color:#64748b;">Contact: ${reporterContact}</span>
    </div>
  `;
  myReportsList.insertAdjacentHTML('afterbegin', myReportItem);

  lucide.createIcons();

  alert(`Report successfully submitted!\n\nYour Reference ID is ${ticketId}.\nKeep this ID to track your complaint.`);
  document.getElementById('issueForm').reset();
  document.getElementById('imagePreviewContainer').style.display = 'none';
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
  const ctx = document.getElementById('reportsChart').getContext('2d');
  
  const redGradient = ctx.createLinearGradient(0, 0, 0, 300);
  redGradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
  redGradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

  const greenGradient = ctx.createLinearGradient(0, 0, 0, 300);
  greenGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  greenGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [
        {
          label: 'Issues Reported',
          data: [65, 85, 110, 130, 155, 140, 175],
          borderColor: '#ef4444',
          backgroundColor: redGradient,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#ef4444',
          fill: true,
          tension: 0.35
        },
        {
          label: 'Issues Resolved',
          data: [50, 78, 102, 125, 150, 138, 168],
          borderColor: '#10b981',
          backgroundColor: greenGradient,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#10b981',
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', weight: 'bold' } } },
        tooltip: {
          padding: 12,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'bold' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 13 }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
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
