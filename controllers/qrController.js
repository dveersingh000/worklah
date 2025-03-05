const QRCode = require("qrcode");
const Job = require("../models/Job");
const QRCodeModel = require("../models/QRCode");
const Employer = require("../models/Employer");

// ✅ Generate QR Code for an Employer
exports.generateQRCode = async (req, res) => {
  try {
    const { employerId } = req.body;

    // Validate employer
    const employer = await Employer.findById(employerId);
    if (!employer) return res.status(404).json({ message: "Employer not found" });

    // Fetch jobs under the employer
    let jobs = await Job.find({company: employerId}).populate("outlet");
    jobs = jobs.filter((job) => 
      job.date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
  );
  

    if (jobs.length === 0) return res.status(404).json({ message: "No jobs found for this employer" });

    // Extract outlet info
    const outlet = jobs[0].outlet;

    // Prepare job roles and shifts
    let jobRoles = [];
    let jobIds = [];
    let shiftIds = [];
    let date =  new Date().toISOString().split('T')[0]
    let validFrom = date;
    let validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 1); // Add 1 day (24 hours)
    validUntil = validUntil.toISOString().split('T')[0]; // Format to YYYY-MM-DD
    

    jobs.forEach(job => {
      jobRoles.push(job.jobName);
      jobIds.push(job._id.toString());
    
    });

   

    // Prepare QR Code data
    const qrData = {
      employerId,
      employerName: employer.accountManager,
      date: new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      outlet: {
        name: outlet.outletName,
        location: outlet.location
      },
      jobRoles,
      jobIds,
      totalShifts: shiftIds.length,
      shiftIds,
      validFrom:date,
      validUntil:date,
      timestamp: new Date().toISOString(),
    };

    // Generate QR Code
    const qrCodeURL = await QRCode.toDataURL(JSON.stringify(qrData));

    // Store QR Code in Database
    const newQRCode = new QRCodeModel({
      employerId,
      qrCode: qrCodeURL,
      validFrom,
      validUntil,
    });

    await newQRCode.save();

    res.status(201).json({
      message: "QR Code generated successfully",
      qrCode: qrCodeURL,
      ...qrData
    });

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
