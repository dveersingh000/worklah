const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  date: { type: Date, required: true },
  isStandby: { type: Boolean, default: false },
  appliedStatus: { type: String, enum: ['Applied', 'Cancelled']},
  status: { type: String, enum: ['Upcoming', 'Completed', 'Cancelled', 'No Show']},
  appliedAt: { type: Date, default: Date.now },
  cancelledAt: { type: Date },
  completedAt: { type: Date }, 
  // ✅ New Fields for Cancellation Feature
  reason: { type: String, enum: ["Medical", "Emergency", "Personal Reason", "Transport Issue", "Other"] },
  describedReason: { type: String }, // ✅ Stores additional details for cancellation
  penalty: { type: Number, default: 0 },
  medicalCertificate: { type: String }, // ✅ Stores MC file path if applicable
  cancellationCount: { type: Number, default: 0 }, // ✅ Tracks number of times user cancelled
  clockInTime: { type: Date }, // ✅ Clock-in timestamp
  clockOutTime: { type: Date }, // ✅ Clock-out timestamp
  checkInLocation: { // ✅ Store GPS location during clock-in
    latitude: { type: Number },
    longitude: { type: Number },
  },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
