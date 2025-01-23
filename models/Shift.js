const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  vacancy: { type: Number, default: 0 },
  standbyVacancy: { type: Number, default: 0 },
  duration: { type: Number, required: false },
  breakHours: { type: Number, default: 0 },
  breakType: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
  rateType: { type: String, enum: ['Flat rate', 'Hourly'], required: false },
  payRate: { type: Number, required: false },
  totalWage: { type: Number, required: false },
});

module.exports = mongoose.model('Shift', shiftSchema);
