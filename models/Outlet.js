const mongoose = require("mongoose");

const OutletSchema = new mongoose.Schema(
  {
    outletName: { type: String, required: true },
    outletAddress: { type: String, required: true },
    outletType: { type: String, enum: ["Restaurant", "Bar", "Cafe", "Other"] },
    outletImage: { type: String, default: '/static/Job.png' },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "Employer" },

    // ✅ New fields for storing geolocation
    latitude: { type: Number },
    longitude: { type: Number }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Outlet", OutletSchema);
