const QRCode = require("qrcode");
const Job = require("../models/Job");
const Employer = require("../models/Employer");
const QRCodeModel = require("../models/QRCode"); // A new model to store QR codes
const moment = require("moment");
const Application = require("../models/Application");


// Admin-side QR Code Generation
exports.generateQRCode = async (req, res) => {
  try {
    const { jobId, shiftId } = req.body;

    // Validate job
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Find the shift
    let shift = null;
    job.dates.forEach(d => {
      d.shifts.forEach(s => {
        if (s._id.toString() === shiftId) {
          shift = s;
        }
      });
    });

    if (!shift) return res.status(404).json({ message: "Shift not found" });

    // Prepare QR Code data
    const qrData = {
      jobId,
      shiftId,
      startTime: shift.startTime,
      endTime: shift.endTime,
      timestamp: new Date().toISOString(),
    };

    // Generate QR Code
    const qrCodeURL = await QRCode.toDataURL(JSON.stringify(qrData));

    // Store QR Code in Database
    const newQRCode = new QRCodeModel({
      jobId,
      shiftId,
      qrCode: qrCodeURL,
      validFrom: shift.startTime,
      validUntil: shift.endTime,
    });

    await newQRCode.save();

    res.status(201).json({ message: "QR Code generated successfully", qrCode: qrCodeURL });
  } catch (error) {
    console.error("QR Generation Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

//Worker Scans QR to Clock-In
exports.scanQRCode = async (req, res) => {
  try {
    const { jobId, shiftId, latitude, longitude } = req.body;
    const userId = req.user.id; // Authenticated user

    // Find the job and shift
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const shift = job.dates.flatMap(date => date.shifts).find(s => s._id.toString() === shiftId);
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    // Validate if the user has applied for this shift
    const application = await Application.findOne({ userId, jobId, shiftId });
    if (!application) {
      return res.status(403).json({ message: "You have not applied for this shift" });
    }

    if (application.clockInTime) {
      return res.status(400).json({ message: "You have already clocked in" });
    }

    // Mark Clock-in
    application.clockInTime = new Date();
    application.checkInLocation = { latitude, longitude };
    await application.save();

    res.json({ message: "Clock-in successful", application });
  } catch (error) {
    console.error("QR Scan Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

//Worker Clocks Out
exports.clockOut = async (req, res) => {
  try {
    const { jobId, shiftId } = req.body;
    const userId = req.user.id; // Authenticated user

    // Find application
    const application = await Application.findOne({ userId, jobId, shiftId });
    if (!application) return res.status(403).json({ message: "You have not applied for this shift" });

    if (!application.clockInTime) {
      return res.status(400).json({ message: "You haven't clocked in yet" });
    }

    if (application.clockOutTime) {
      return res.status(400).json({ message: "You have already clocked out" });
    }

    // Mark Clock-out
    application.clockOutTime = new Date();
    await application.save();

    res.json({ message: "Clock-out successful", application });
  } catch (error) {
    console.error("Clock-out Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};