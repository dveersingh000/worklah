const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cashoutDate: { type: Date, default: Date.now },
  cashoutAmount: { type: Number, required: true },
  availableWalletBalance: { type: Number, required: true },
  cashoutMethod: { type: String, enum: ['PayNow', 'Bank Transfer'], required: true }, 
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
    default: 'Pending',
  }, 
  remarks: { type: String }, 
  createdAt: { type: Date, default: Date.now }, 
  updatedAt: { type: Date, default: Date.now }, 
});

module.exports = mongoose.model('Transaction', transactionSchema);
