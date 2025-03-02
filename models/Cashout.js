// models/cashoutModel.js
const mongoose = require("mongoose");

const cashoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ["PayNow", "Bank Transfer"], required: true },
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
  },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cashout", cashoutSchema);
