const QRCode = require("qrcode");
const Job = require("../models/Job");
const QRCodeModel = require("../models/QRCode");
const Employer = require("../models/Employer");
const Application = require("../models/Application");
const Shift = require("../models/Shift");

exports.getUpcomingShifts = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ Get user ID from auth middleware
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for date comparison

    // Find all `upcoming` applications sorted by date
    const applications = await Application.find({
      userId,
      status: "Upcoming",
      date: { $gte: today }, // ✅ Only fetch future shifts
    })
      .populate({
        path: "jobId",
        select: "jobName jobIcon company location outlet outletImage",
        populate: [
          { path: "company", select: "companyLegalName _id companyLogo" }, // ✅ Populate Employer Name & ID
          { path: "outlet", select: "outletName _id" }, // ✅ Populate Outlet Name & ID
        ],
      })
      .populate({
        path: "shiftId",
        select: "startTime startMeridian endTime endMeridian duration vacancy payRate breakHours breakType",
      })
      .sort({ date: 1 }); // ✅ Sort by closest date first

    if (!applications.length) {
      return res.status(404).json({ message: "No upcoming shifts found." });
    }

    // ✅ Get the **earliest upcoming shift date**
    const nearestDate = applications[0].date;

    // ✅ Filter shifts that match the **nearest upcoming date**
    const filteredShifts = applications.filter((shift) =>
      new Date(shift.date).toISOString().slice(0, 10) ===
      new Date(nearestDate).toISOString().slice(0, 10)
    );

    res.status(200).json({ shifts: filteredShifts });
  } catch (error) {
    console.error("Error fetching upcoming shifts:", error);
    res.status(500).json({ message: "Server error." });
  }
};



// ✅ Generate QR Code for an Employer
// exports.generateQRCode = async (req, res) => {
//   try {
//     const { employerId } = req.body;

//     // Validate employer
//     const employer = await Employer.findById(employerId);
//     if (!employer) return res.status(404).json({ message: "Employer not found" });

//     // Fetch jobs under the employer
//     let jobs = await Job.find({company: employerId}).populate("outlet");
//     jobs = jobs.filter((job) => 
//       job.date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
//   );
  

//     if (jobs.length === 0) return res.status(404).json({ message: "No jobs found for this employer" });

//     // Extract outlet info
//     const outlet = jobs[0].outlet;

//     // Prepare job roles and shifts
//     let jobRoles = [];
//     let jobIds = [];
//     let shiftIds = [];
//     let date =  new Date().toISOString().split('T')[0]
//     let validFrom = date;
//     let validUntil = new Date();
//     validUntil.setDate(validUntil.getDate() + 1); // Add 1 day (24 hours)
//     validUntil = validUntil.toISOString().split('T')[0]; // Format to YYYY-MM-DD
    

//     jobs.forEach(job => {
//       jobRoles.push(job.jobName);
//       jobIds.push(job._id.toString());
    
//     });

   

//     // Prepare QR Code data
//     const qrData = {
//       employerId,
//       employerName: employer.accountManager,
//       date: new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
//       outlet: {
//         name: outlet.outletName,
//         location: outlet.location
//       },
//       jobRoles,
//       jobIds,
//       totalShifts: shiftIds.length,
//       shiftIds,
//       validFrom:date,
//       validUntil:date,
//       timestamp: new Date().toISOString(),
//     };

//     // Generate QR Code
//     const qrCodeURL = await QRCode.toDataURL(JSON.stringify(qrData));

//     // Store QR Code in Database
//     const newQRCode = new QRCodeModel({
//       employerId,
//       qrCode: qrCodeURL,
//       validFrom,
//       validUntil,
//     });

//     await newQRCode.save();

//     res.status(201).json({
//       message: "QR Code generated successfully",
//       qrCode: qrCodeURL,
//       ...qrData
//     });

//   } catch (error) {
//     console.error("QR Generation Error:", error);
//     res.status(500).json({ message: "Server error", error });
//   }
// };

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
      shiftIds.push(...job.shifts);
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
    const { userId, jobId, shiftId, applicationId, qrData, latitude, longitude } = req.body;

    // ✅ Validate the scanned QR Code
    const qrCode = await QRCodeModel.findOne({ employerId: qrData.employerId });
    if (!qrCode) {
      return res.status(400).json({ message: "Invalid QR Code" });
    }

    // ✅ Ensure the job, shift, and outlet match
    if (!qrData.jobIds.includes(jobId) || !qrData.shiftIds.includes(shiftId)) {
      return res.status(400).json({ message: "Shift and job do not match QR data" });
    }

    // ✅ Check if the user is already clocked in
    const existingAttendance = await Attendance.findOne({
      userId,
      shiftId,
      jobId,
      applicationId,
      clockInTime: { $exists: true },
      clockOutTime: { $exists: false }, // Ensure user hasn't clocked out yet
    });

    if (existingAttendance) {
      return res.status(400).json({ message: "You are already clocked in" });
    }

    // ✅ Save clock-in record
    const newAttendance = new Attendance({
      userId,
      jobId,
      shiftId,
      applicationId,
      date: new Date(),
      clockInTime: new Date(),
      checkInLocation: { latitude, longitude },
      status: "Clocked In",
    });

    await newAttendance.save();
    res.status(200).json({ message: "Clock In Successful", attendance: newAttendance });

  } catch (error) {
    console.error("Clock In Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Worker Clicks "Clock-Out"
exports.clockOut = async (req, res) => {
  try {
    const { userId, jobId, shiftId, applicationId, latitude, longitude } = req.body;

    // ✅ Find the active attendance record
    const attendance = await Attendance.findOne({
      userId,
      jobId,
      shiftId,
      applicationId,
      clockInTime: { $exists: true },
      clockOutTime: { $exists: false }, // Ensure user hasn't clocked out yet
    });

    if (!attendance) {
      return res.status(400).json({ message: "No active clock-in found" });
    }

    // ✅ Save clock-out timestamp
    attendance.clockOutTime = new Date();
    attendance.checkOutLocation = { latitude, longitude };
    attendance.status = "Clocked Out";

    await attendance.save();
    res.status(200).json({ message: "Clock Out Successful", attendance });

  } catch (error) {
    console.error("Clock Out Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

