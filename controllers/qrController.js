const QRCode = require("qrcode");
const Job = require("../models/Job");
const QRCodeModel = require("../models/QRCode");
const Application = require("../models/Application");

// ✅ Admin: Generate QR Code for a Job and Shift
exports.generateQRCode = async (req, res) => {
  try {
    const { jobId, shiftId } = req.body;

    // Validate job
    const job = await Job.findById(jobId)
      .populate("employer", "companyName")
      .populate("outlet", "outletName location outletImage");

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Find the shift
    let selectedShift = null;
    let jobDate = null;
    job.dates.forEach(date => {
      date.shifts.forEach(shift => {
        if (shift._id.toString() === shiftId) {
          selectedShift = shift;
          jobDate = date.date; // Extracting job date
        }
      });
    });

    if (!selectedShift) return res.status(404).json({ message: "Shift not found" });

    // Prepare QR Code data
    const qrData = {
      jobId,
      shiftId,
      jobName: job.jobName,
      jobDate,
      employer: job.employer.companyName,
      outlet: {
        name: job.outlet.outletName,
        location: job.outlet.location,
        image: job.outlet.outletImage
      },
      shiftTime: `${selectedShift.startTime} - ${selectedShift.endTime}`,
      timestamp: new Date().toISOString(),
    };

    // Generate QR Code
    const qrCodeURL = await QRCode.toDataURL(JSON.stringify(qrData));

    // Store QR Code in Database
    const newQRCode = new QRCodeModel({
      jobId,
      shiftId,
      qrCode: qrCodeURL,
      validFrom: selectedShift.startTime,
      validUntil: selectedShift.endTime,
    });

    await newQRCode.save();

    res.status(201).json({ message: "QR Code generated successfully", qrCode: qrCodeURL, qrData });
  } catch (error) {
    console.error("QR Generation Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Worker Scans QR to Get Job & Shift Details (No Clock-In Yet)
exports.scanQRCode = async (req, res) => {
  try {
    const { qrData } = req.body; // Scanned QR code data
    const parsedData = JSON.parse(qrData);
    const { jobId, shiftId } = parsedData;

    const job = await Job.findById(jobId)
      .populate("employer", "companyName")
      .populate("outlet", "outletName location outletImage");

    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    // Find the shift
    let selectedShift = null;
    let jobDate = null;
    job.dates.forEach(date => {
      date.shifts.forEach(shift => {
        if (shift._id.toString() === shiftId) {
          selectedShift = shift;
          jobDate = date.date;
        }
      });
    });

    if (!selectedShift) return res.status(404).json({ message: "Shift not found" });

    res.json({
      success: true,
      jobDetails: {
        jobId: job._id,
        jobName: job.jobName,
        jobDate,
        employer: job.employer.companyName,
        outlet: {
          name: job.outlet.outletName,
          location: job.outlet.location,
          image: job.outlet.outletImage
        },
        shiftTime: `${selectedShift.startTime} - ${selectedShift.endTime}`,
      }
    });
  } catch (error) {
    console.error("QR Scan Error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// Get Available Shifts
exports.getShifts = async (req, res) => {
  try {
    const { jobId } = req.query;

    // Validate job existence
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Extract shifts
    let availableShifts = [];
    job.dates.forEach(date => {
      date.shifts.forEach(shift => {
        availableShifts.push({
          shiftId: shift._id,
          date: date.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          breakDuration: shift.breakDuration,
          isBooked: shift.isBooked, // Assuming a boolean field
        });
      });
    });

    res.json({ success: true, shifts: availableShifts });
  } catch (error) {
    console.error("Fetch Shifts Error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};



// ✅ Worker Clicks "Clock-In" After Scanning QR
exports.clockIn = async (req, res) => {
  try {
    const { jobId, shiftId, latitude, longitude } = req.body;
    const userId = req.user.id; // Authenticated user

    // Validate if the user has applied for this shift
    const application = await Application.findOne({ userId, jobId, shiftId });
    if (!application) {
      return res.status(403).json({ success: false, message: "Not applied for this shift" });
    }

    if (application.clockInTime) {
      return res.status(400).json({ success: false, message: "Already clocked in" });
    }

    // Mark Clock-in
    application.clockInTime = new Date();
    application.checkInLocation = { latitude, longitude };
    await application.save();

    res.json({ message: "Clock-in successful", clockInTime: application.clockInTime });
  } catch (error) {
    console.error("Clock-In Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Worker Clicks "Clock-Out"
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

    res.json({ message: "Clock-out successful", clockOutTime: application.clockOutTime });
  } catch (error) {
    console.error("Clock-Out Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
