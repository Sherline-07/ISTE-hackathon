const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");
const requireAuth = require("../middleware/requireAuth");
const { listComplaints, updateComplaintStatus, createComplaint } = require("../controllers/complaintController");

const router = express.Router();

router.get("/", requireAuth, listComplaints);   // ← was requireAdmin, now requireAuth
router.patch("/:id", requireAdmin, updateComplaintStatus);
router.post("/", requireAuth, createComplaint);

module.exports = router;
