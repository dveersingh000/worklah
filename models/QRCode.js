const mongoose = require("mongoose");

const QRCodeSchema = new mongoose.Schema({
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true }, // 🔥 Store Employer ID
  qrCode: { type: String, required: true },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QRCode", QRCodeSchema);
