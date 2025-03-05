const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const Shift = require("../models/Shift");
const mongoose = require("mongoose");
const moment = require("moment");

/**
 * ✅ Get candidates by Job ID with applied filters (Confirmed, Pending, Standby)
 */

exports.getCandidatesByJob = async (req, res) => {
  try {
    const { id } = req.params; // Job ID
    const { status, shiftTime } = req.query; // Filters

    // ✅ Fetch Job with company and outlet details
    const job = await Job.findById(id)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress")
      .populate("shifts", "startTime startMeridian endTime endMeridian vacancy standbyVacancy")
      .lean();

    if (!job) return res.status(404).json({ message: "Job not found" });

    // ✅ Ensure `company` exists before accessing properties
    const employerName = job.company ? job.company.companyLegalName : "Unknown Employer";
    const jobDate = moment(job.date).format("DD MMM, YY");

    // ✅ Calculate Current Headcount
    const totalVacancy = job.shifts.reduce((acc, shift) => acc + shift.vacancy, 0);
    const totalApplied = await Application.countDocuments({ jobId: id });

    const currentHeadCount = `${totalApplied}/${totalVacancy}`;

    // ✅ Fetch all applications
    const applications = await Application.find({ jobId: id })
      .populate("userId", "fullName gender phoneNumber dob nricNumber profilePicture")
      .populate("shiftId")
      .lean();

    if (!applications.length) return res.status(404).json({ message: "No candidates found" });

    // ✅ Organize candidates into categories
    const confirmedCandidates = [];
    const pendingCandidates = [];
    const standbyCandidates = [];

    applications.forEach((app) => {
      if (!app.userId || !app.shiftId) return;

      const candidate = {
        id: app.userId._id,
        fullName: app.userId.fullName,
        gender: app.userId.gender || "N/A",
        mobile: app.userId.phoneNumber || "N/A",
        dob: app.userId.dob ? moment(app.userId.dob).format("DD MMM, YYYY") : "N/A",
        nric: app.userId.nricNumber ? app.userId.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A",
        profilePicture: app.userId.profilePicture || "/static/default-avatar.png",
        appliedStatus: app.appliedStatus || "Applied",
        confirmedOrStandby: app.isStandby ? "Standby" : "Confirmed",
        shift: {
          date: moment(app.date).format("DD MMM, YYYY"),
          startTime: `${app.shiftId.startTime} ${app.shiftId.startMeridian}`,
          endTime: `${app.shiftId.endTime} ${app.shiftId.endMeridian}`,
          clockedIn: app.clockInTime ? moment(app.clockInTime).format("hh:mm A") : "--",
          clockedOut: app.clockOutTime ? moment(app.clockOutTime).format("hh:mm A") : "--",
          wageGenerated: `$${app.shiftId.totalWage}`,
          rateType: app.shiftId.rateType,
          payRate: `$${app.shiftId.payRate}/hr`,
          breakType: app.shiftId.breakType,
          totalDuration: `${app.shiftId.duration} hrs`,
          vacancyFilled: app.shiftId.vacancyFilled,
          standbyFilled: app.shiftId.standbyFilled,
        },
        completedJobs: 122, // Example static value (fetch from Applications DB if needed)
      };

      if (app.appliedStatus === "Applied") confirmedCandidates.push(candidate);
      else if (app.appliedStatus === "Pending") pendingCandidates.push(candidate);
      else if (app.isStandby) standbyCandidates.push(candidate);
    });

    let filteredCandidates = [...confirmedCandidates, ...pendingCandidates, ...standbyCandidates];

    // ✅ Apply filtering
    if (status) filteredCandidates = filteredCandidates.filter((c) => c.confirmedOrStandby.toLowerCase() === status.toLowerCase());
    if (shiftTime) filteredCandidates = filteredCandidates.filter((c) => c.shift.startTime === shiftTime);

    // ✅ Determine Job Status (Similar to `getAllJobs`)
    const today = moment().startOf("day");
    const jobMomentDate = moment(job.date).startOf("day");

    let jobStatus = "Unknown";
    if (job.isCancelled) {
      jobStatus = "Cancelled";
    } else if (jobMomentDate.isAfter(today)) {
      jobStatus = "Upcoming";
    } else if (totalApplied >= totalVacancy) {
      jobStatus = "Completed";
    } else {
      jobStatus = "Active";
    }

    res.status(200).json({
      success: true,
      job: {
        jobId: job._id,
        jobName: job.jobName,
        employer: employerName,
        date: jobDate,
        currentHeadCount,
        jobStatus,
      },
      totalCandidates: filteredCandidates.length,
      confirmedCount: confirmedCandidates.length,
      pendingCount: pendingCandidates.length,
      standbyCount: standbyCandidates.length,
      candidates: filteredCandidates,
    });
  } catch (error) {
    console.error("Error in getCandidatesByJob:", error);
    res.status(500).json({ error: "Failed to fetch candidates", details: error.message });
  }
};



/**
 * ✅ Get Candidate Profile with Job History
 */
exports.getCandidateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Candidate ID" });
    }

    // ✅ Fetch candidate details
    const user = await User.findById(id)
      .populate("profileId")
      .lean();

    if (!user) return res.status(404).json({ message: "Candidate not found" });

    // ✅ Fetch candidate applications
    const applications = await Application.find({ userId: id })
      .populate({
        path: "jobId",
        select: "jobName company outlet",
        populate: [
          { path: "company", select: "companyLegalName companyLogo" },
          { path: "outlet", select: "outletName outletAddress" },
        ],
      })
      .populate("shiftId")
      .lean();

    // ✅ Candidate Profile Object
    const candidateProfile = {
      candidateId: user._id,
      fullName: user.fullName,
      employmentStatus: user.employmentStatus,
      profilePicture: user.profilePicture || "/static/default-avatar.png",
      registeredAt: moment(user.createdAt).format("DD MMM, YYYY, hh:mm A"),
      personalDetails: {
        eWalletAmount: "$2,450",
        contactNumber: user.phoneNumber,
        dob: user.profileId?.dob ? moment(user.profileId.dob).format("DD - MM - YYYY") : "N/A",
        gender: user.profileId?.gender || "N/A",
        nationality: "Singapore",
        nric: user.profileId?.nricNumber ? user.profileId.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A",
        icNumber: user.profileId?.finNumber || "N/A",
      },
    };

    // ✅ Active Job Processing
    const activeJob = applications.find(app => app.status === "Upcoming");
    let activeJobDetails = activeJob ? {
      jobName: activeJob.jobId.jobName,
      employer: activeJob.jobId.company.companyLegalName,
      date: moment(activeJob.date).format("DD MMM, YYYY"),
      shiftStartTime: `${activeJob.shiftId.startTime} ${activeJob.shiftId.startMeridian}`,
      shiftEndTime: `${activeJob.shiftId.endTime} ${activeJob.shiftId.endMeridian}`,
      totalWage: `$${activeJob.shiftId.totalWage}`,
    } : null;

    res.status(200).json({
      success: true,
      candidateProfile,
      activeJob: activeJobDetails || {},
    });
  } catch (error) {
    console.error("Error in getCandidateProfile:", error);
    res.status(500).json({ error: "Failed to fetch candidate details", details: error.message });
  }
};

/**
 * ✅ Update Candidate Profile
 */
exports.updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, gender, dob, phoneNumber, email, employmentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Candidate ID" });
    }

    // ✅ Find Candidate
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Candidate not found" });

    // ✅ Update fields
    user.fullName = fullName || user.fullName;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;
    user.employmentStatus = employmentStatus || user.employmentStatus;

    await user.save();
    res.status(200).json({ success: true, message: "Candidate details updated", user });
  } catch (error) {
    console.error("Error in updateCandidate:", error);
    res.status(500).json({ error: "Failed to update candidate details", details: error.message });
  }
};
