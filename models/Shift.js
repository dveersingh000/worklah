const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  startTime: { type: String, required: true },
  startMeridian: { type: String, enum: ['AM', 'PM'], required: true },
  endTime: { type: String, required: true },
  endMeridian: { type: String, enum: ['AM', 'PM'], required: true },
  vacancy: { type: Number, default: 0 },
  standbyVacancy: { type: Number, default: 0 },
  duration: { type: Number },
  breakHours: { type: Number, default: 0 },
  breakType: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
  rateType: { type: String, enum: ['Flat rate', 'Hourly rate'] },
  payRate: { type: Number, required: true },
  totalWage: { type: Number },
  appliedShifts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model('Shift', shiftSchema);
