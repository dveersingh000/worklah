const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: Date, required: true },
  isStandby: { type: Boolean, default: false },
  appliedStatus: { type: String, enum: ['Applied', 'Cancelled'], default: 'Applied' },
  status: { type: String, enum: ['Upcoming', 'Applied', 'Completed', 'Cancelled'], default: 'Upcoming' },
  appliedAt: { type: Date, default: Date.now },
  cancelledAt: { type: Date }, // Optional, to track cancellation time
  completedAt: { type: Date }, // Optional, to track completion time
  reason: { type: String }, // Optional, to store cancellation reason
});

module.exports = mongoose.model('Application', applicationSchema);
