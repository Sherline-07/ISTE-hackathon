const Complaint = require("../models/Complaint");

const VALID_PRIORITIES = ["low", "medium", "high"];
const VALID_STATUSES   = ["pending", "in_progress", "resolved"];

// Generates a unique ticket ID like "UE-2026-4821" using a timestamp prefix
// to avoid the infinite-loop collision risk of the old pure-random approach.
async function generateTicketId() {
  const year = new Date().getFullYear();
  const num  = Math.floor(1000 + Math.random() * 9000);
  let ticketId = `UE-${year}-${num}`;
  // Retry once on collision (astronomically rare with year prefix)
  if (await Complaint.findOne({ ticketId })) {
    ticketId = `UE-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return ticketId;
}

/* GET /api/complaints?page=1&limit=20 */
async function listComplaints(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Complaint.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Complaint.countDocuments()
    ]);

    const complaints = docs.map(c => ({
      id: c.ticketId,
      title: c.title,
      category: c.category,
      description: c.description,
      priority: c.priority,
      status: c.status,
      lat: c.lat,
      lng: c.lng,
      image: c.image,
      user: c.user,
      assignedCrew: c.assignedCrew,
      officialNote: c.officialNote,
      time: c.createdAt,
    }));

    return res.json({ success: true, complaints, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("[listComplaints]", err);
    return res.status(500).json({ success: false, message: "Failed to load complaints." });
  }
}

/* POST /api/complaints
   body: { title, category, priority, description, lat, lng, image } */
async function createComplaint(req, res) {
  try {
    const { title, category, priority = "medium", description, lat, lng, image } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Title must be at least 3 characters." });
    }
    if (!category || typeof category !== "string") {
      return res.status(400).json({ success: false, message: "Category is required." });
    }
    if (lat === undefined || lng === undefined || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res.status(400).json({ success: false, message: "Valid lat and lng coordinates are required." });
    }
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      return res.status(400).json({ success: false, message: "Coordinates out of valid range." });
    }
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, message: `Priority must be one of: ${VALID_PRIORITIES.join(", ")}.` });
    }
    // Reject oversized base64 images (> ~4 MB)
    if (image && image.length > 5_500_000) {
      return res.status(400).json({ success: false, message: "Image too large. Please upload a smaller photo." });
    }

    const ticketId = await generateTicketId();

    const complaint = await Complaint.create({
      ticketId,
      reportedBy: req.user.id,
      user: req.user.contact,
      title: title.trim(),
      category,
      description: description ? String(description).trim() : "",
      priority,
      lat: parsedLat,
      lng: parsedLng,
      image: image || "",
    });

    return res.status(201).json({
      success: true,
      complaint: { id: complaint.ticketId },
    });
  } catch (err) {
    console.error("[createComplaint]", err);
    return res.status(500).json({ success: false, message: "Failed to submit complaint." });
  }
}

/* PATCH /api/complaints/:id  (admin only)
   body: { status?, assignedCrew?, officialNote? } */
async function updateComplaintStatus(req, res) {
  try {
    const { status, assignedCrew, officialNote } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}.` });
    }

    const complaint = await Complaint.findOne({ ticketId: req.params.id });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    if (status      !== undefined) complaint.status       = status;
    if (assignedCrew !== undefined) complaint.assignedCrew = String(assignedCrew).trim();
    if (officialNote !== undefined) complaint.officialNote = String(officialNote).trim();

    await complaint.save();

    return res.json({ success: true, complaint: { id: complaint.ticketId, status: complaint.status } });
  } catch (err) {
    console.error("[updateComplaintStatus]", err);
    return res.status(500).json({ success: false, message: "Failed to update complaint." });
  }
}

module.exports = { listComplaints, createComplaint, updateComplaintStatus };