const mongoose = require("mongoose");

const QRCodeSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, required: true },
  qrCode: { type: String, required: true },
  validFrom: { type: String, required: true },
  validUntil: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QRCode", QRCodeSchema);
