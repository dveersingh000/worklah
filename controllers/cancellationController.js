const CancellationReason = require('../models/CancellationReason');
const Shift = require('../models/Shift');
exports.getShiftCancellationDetails = async (req, res) => {
  try {
    const { jobId } = req.params;
    const shifts = await Shift.find({ job: jobId });
    res.status(200).json(shifts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shift cancellation details', details: error.message });
  }
};

exports.cancelShift = async (req, res) => {
  try {
    const { userId, jobId, shiftId, reason, description } = req.body;
    const penalty = 10; // Example penalty calculation

    const cancellation = new CancellationReason({
      userId,
      jobId,
      shiftId,
      reason,
      description,
      penalty,
    });

    await cancellation.save();
    res.status(200).json({ message: 'Shift cancelled successfully', penalty });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel shift', details: error.message });
  }
};