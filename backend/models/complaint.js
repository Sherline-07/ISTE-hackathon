const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    user: { type: String, required: true },
    category: { type: String, default: "General" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["pending", "in_progress", "resolved"], default: "pending" },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    image: { type: String, default: "" },
    assignedCrew: { type: String, default: "Div-14" },
    officialNote: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);