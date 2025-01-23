const mongoose = require("mongoose");
const OutletSchema = new mongoose.Schema(
  {
    outletName: { type: String, required: true },
    outletImage: { type: String, default: '/static/Job.png' },
    location: { type: String, required: true },
    outletType: { type: String, enum: ["Resturant", "Bar", "Cafe", "Other"] },
    operatingHours: { type: String },
    contact: { type: String, required: true },
    // email: { type: String },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true },
    jobsPosted: { type: Number, default: 0 },
    activeJobs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Outlet", OutletSchema);
