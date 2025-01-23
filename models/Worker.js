const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  walletBalance: { type: Number, default: 0 }, 
  totalCompletedJobs: { type: Number, default: 0 }, 
  totalCancelledJobs: { type: Number, default: 0 }, 
  totalHoursWorked: { type: Number, default: 0 }, 
  noShowCount: { type: Number, default: 0 }, 
  attendanceRate: { type: Number, default: 100 }, 
  ratings: {
    averageRating: { type: Number, default: 0 }, 
    ratingCount: { type: Number, default: 0 }, 
  },
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }], 
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }], 
  jobsWorkedOn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }], 
  shifts: [{ type: mongoose.Schema.Types.ObjectId }],
  outletsWorked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' }],
  createdAt: { type: Date, default: Date.now }, 
  updatedAt: { type: Date, default: Date.now },
  });

module.exports = mongoose.model('Worker', workerSchema);
