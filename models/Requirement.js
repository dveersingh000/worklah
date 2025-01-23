const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  description: { type: String, required: true },
  icon: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Requirement', RequirementSchema);
