const mongoose = require('mongoose');

const PenaltySchema = new mongoose.Schema({
  timeframe: { type: String, required: true },
  penalty: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Penalty', PenaltySchema);
