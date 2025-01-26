const mongoose = require("mongoose");

const EmployerSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    companyLogo: { type: String, default: '/static/companyLogo.png' },
    mainContactPerson: { type: String, required: true },
    jobPosition: { type: String },
    contactNumber: { type: String, required: true },
    companyEmail: { type: String, required: true, unique: true },
    companyNumber: { type: String, unique: true },
    accountManager: { type: String },
    industry: { type: String, enum: ["Retail", "Hospitality", "IT", "Healthcare"] },
    outlets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Outlet" }],
    contractStartDate: { type: Date },
    contractEndDate: { type: Date },
    serviceAgreement: { type: String, enum: ["Completed", "In Progress", "Expired"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employer", EmployerSchema);
