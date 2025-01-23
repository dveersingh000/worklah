const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, required: true },
  timeIn: { type: String },
  timeOut: { type: String },
  duration: { type: Number }, // Total hours worked for the shift
  status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
  penalties: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Attendance', attendanceSchema);
