const mongoose = require("mongoose");
const cancellationReasonSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    shiftId: { type: mongoose.Schema.Types.ObjectId },
    reason: String,
    description: String,
    penalty: Number,
});
module.exports = mongoose.model('CancellationReason', cancellationReasonSchema);