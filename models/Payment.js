const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, required: true }, 
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true }, 
  outletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' }, 

  timeIn: { type: String, required: true }, 
  timeOut: { type: String, required: true },
  breakTime: { type: Number, default: 0 }, 
  breakType: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' }, 

  duration: { type: Number, required: true }, 
  rateType: { type: String, enum: ['Flat Rate', 'Hourly'], required: true }, 
  hourlyRate: { type: Number }, 
  flatRate: { type: Number },
  penaltyAmount: { type: Number, default: 0 }, 
  totalAmount: { type: Number, required: true }, 

  paymentStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Rejected'],
    default: 'Pending',
  },
  createdAt: { type: Date, default: Date.now }, 
  updatedAt: { type: Date, default: Date.now }, 
});

module.exports = mongoose.model('Payment', paymentSchema);
