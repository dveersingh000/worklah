const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  jobIcon: { type: String },
  jobName: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: "Outlet", required: true },
  date : { type: Date, required: true },
  location: { type: String, required: true },
  shortAddress: { type: String },
  industry : { type: String, enum: ["Retail", "Restaurant", "Hotel", "Healthcare"], default: "Restaurant" },
  outletImage: { type: String },
  shifts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shift" }], // Reference to Shift model
  jobScope: { type: [String], required: true },
  jobRequirements: { type: [String], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Job", jobSchema);


