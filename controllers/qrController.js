const geolib = require('geolib');
const Job = require('../models/Job');
const Shift = require('../models/Shift');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

// Validate QR Code

// Validate QR Code
exports.validateQRCode = async (req, res) => {
  try {
    const { jobId, shiftId, action } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid Job ID format.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Find the correct shift inside the `dates` array
    let shift;
    for (const dateObj of job.dates) {
      shift = dateObj.shifts.find(s => s._id.toString() === shiftId);
      if (shift) break; // Stop looping once found
    }

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found.' });
    }

    // Validate Action
    if (!['check_in', 'check_out'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    res.status(200).json({ message: 'QR code validated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to validate QR code.', details: err.message });
  }
};




// Clock In/Out
exports.clockInOut = async (req, res) => {
  try {
    const { jobId, shiftId, action, latitude, longitude } = req.body;
    const userId = req.user.id;

    console.log("Received Job ID:", jobId);
    console.log("Received Shift ID:", shiftId);
    console.log("Action:", action);

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found.' });

    // Find the correct shift inside the `dates` array
    let shift;
    for (const dateObj of job.dates) {
      shift = dateObj.shifts.find(s => s._id.toString() === shiftId);
      if (shift) break; // Stop looping once found
    }

    if (!shift) {
      // console.log("Shift not found for ID:", shiftId);
      return res.status(404).json({ error: 'Shift not found.' });
    }

    // console.log("Shift Details:", shift);

    // Check if user is within radius
    const isWithinRadius = geolib.isPointWithinRadius(
      { latitude, longitude },
      { latitude: job.locationCoordinates.latitude, longitude: job.locationCoordinates.longitude },
      100
    );

    if (!isWithinRadius) {
      return res.status(400).json({ error: 'User is not within the allowed location radius.' });
    }

    let attendance = await Attendance.findOne({ user: userId, shift: shiftId });

    if (action === 'check_in') {
      if (attendance?.clockIn) {
        return res.status(400).json({ error: 'Already checked in for this shift.' });
      }

      // Create a new attendance record for clock-in
      attendance = new Attendance({
        user: userId,
        job: jobId,
        shift: shiftId,
        clockIn: new Date(),
      });

      await attendance.save();

      return res.status(200).json({ message: 'Clocked in successfully.' });
    } else if (action === 'check_out') {
      if (!attendance || !attendance.clockIn) {
        return res.status(400).json({ error: 'Cannot clock out without clocking in.' });
      }

      if (attendance.clockOut) {
        return res.status(400).json({ error: 'Already clocked out for this shift.' });
      }

      attendance.clockOut = new Date();
      await attendance.save();

      return res.status(200).json({ message: 'Clocked out successfully.' });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  } catch (err) {
    console.error("Error in clockInOut:", err);
    res.status(500).json({ error: 'Failed to clock in/out.', details: err.message });
  }
};



