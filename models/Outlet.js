const mongoose = require("mongoose");
const OutletSchema = new mongoose.Schema(
  {
    outletName: { type: String, required: true },
    outletAddress: { type: String, required: true },
    outletType: { type: String, enum: ["Resturant", "Bar", "Cafe", "Other"] },
    outletImage: { type: String, default: '/static/Job.png' },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "Employer"},
  },
  { timestamps: true }
);

module.exports = mongoose.model("Outlet", OutletSchema);
