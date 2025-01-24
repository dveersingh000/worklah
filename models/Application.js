const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: Date, required: true },
  isStandby: { type: Boolean, default: false },
  appliedStatus: { type: String, enum: ['Applied', 'Cancelled'], default: 'Applied' },
  status: { type: String, enum: ['Ongoing', 'Completed', 'Cancelled'], default: 'Ongoing' },
  appliedAt: { type: Date, default: Date.now },
  cancelledAt: { type: Date },
  completedAt: { type: Date }, 
  reason: { type: String }, 
  penalty: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
