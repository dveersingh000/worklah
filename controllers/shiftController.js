const Job = require("../models/Job");
const Shift = require("../models/Shift");

exports.createShift = async (req, res) => {
  try {
    const { jobId, ...shiftData } = req.body;

    // Validate job existence
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Create the shift and associate it with the job
    const shift = new Shift({ ...shiftData, jobId });
    const savedShift = await shift.save();

    // Update the job document
    job.shifts.push(savedShift._id);
    await job.save();

    res.status(201).json(savedShift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create shift', details: err.message });
  }
};

exports.getShiftAvailability = async (req, res) => {
  try {
    const { jobId, shift } = req.query;

    const shiftDetails = await Shift.findOne({
      job: jobId,
      time: shift,
    });

    if (!shiftDetails) return res.status(404).json({ error: 'Shift not found' });

    res.status(200).json({
      shift: shiftDetails.time,
      availability: shiftDetails.availability,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getShiftById = async (req, res) => {
  try {
    const { jobId } = req.params;

    const shifts = await Shift.find({ job: jobId });
    if (!shifts.length) {
      return res.status(404).json({ error: "No shifts found for this job" });
    }

    res.status(200).json(shifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
};

// Update an existing shift
exports.updateShift = async (req, res) => {
  try {
    const updatedShift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedShift) return res.status(404).json({ message: 'Shift not found' });
    res.status(200).json(updatedShift);
  } catch (err) {
    res.status(400).json({ message: 'Error updating shift' });
  }
};

// Delete a specific shift
exports.deleteShift = async (req, res) => {
  try {
    const deletedShift = await Shift.findByIdAndDelete(req.params.id);
    if (!deletedShift) return res.status(404).json({ message: 'Shift not found' });
    res.status(200).json({ message: 'Shift deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting shift' });
  }
};

//for qr
exports.getJobShifts = async (req, res) => {
  try {
    const { jobId } = req.params;
    const shifts = await Shift.find({ job: jobId });
    res.status(200).json({ shifts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shifts.', details: err.message });
  }
};


exports.getJobDetails = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId).populate('shifts');
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job details', details: error.message });
  }
};