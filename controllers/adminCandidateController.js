const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const mongoose = require("mongoose");
const moment = require("moment");
const Shift = require("../models/Shift");

exports.getCandidatesByJob = async (req, res) => {
  try {
    const { id } = req.params; // Job ID
    const { status, shiftTime } = req.query; // Filters

    // ✅ Check if job exists
    const job = await Job.findById(id)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress")
      .lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    // ✅ Fetch all applications for this job
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
        approvedStatus: app.appliedStatus === "Applied" ? "Confirmed" : "Pending",
        confirmedOrStandby: app.isStandby ? "Standby" : "Confirmed",
        shift: {
          date: moment(app.date).format("DD MMM, YYYY"),
          startTime: app.shiftId.startTime,
          endTime: app.shiftId.endTime,
          clockedIn: app.clockInTime ? moment(app.clockInTime).format("hh:mm A") : "--",
          clockedOut: app.clockOutTime ? moment(app.clockOutTime).format("hh:mm A") : "--",
          wageGenerated: `$${app.shiftId.totalWage}`,
          rateType: app.shiftId.rateType,
          payRate: `$${app.shiftId.payRate}/hr`,
          breakType: app.shiftId.breakType,
          totalDuration: `${app.shiftId.duration} hrs`,
          vacancyFilled: app.shiftId.vacancy,
          standbyFilled: app.shiftId.standbyVacancy,
        },
      };

      if (app.appliedStatus === "Applied") confirmedCandidates.push(candidate);
      else if (app.appliedStatus === "Pending") pendingCandidates.push(candidate);
      else if (app.isStandby) standbyCandidates.push(candidate);
    });

    let filteredCandidates = [...confirmedCandidates, ...pendingCandidates, ...standbyCandidates];

    // ✅ Apply filtering
    if (status) filteredCandidates = filteredCandidates.filter((c) => c.confirmedOrStandby.toLowerCase() === status.toLowerCase());
    if (shiftTime) filteredCandidates = filteredCandidates.filter((c) => c.shift.startTime === shiftTime);

    res.status(200).json({
      success: true,
      job: { jobId: job._id, jobName: job.jobName, employer: job.company.companyLegalName },
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



exports.getCandidateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Candidate ID" });
    }

    // ✅ Fetch candidate details
    const user = await User.findById(id)
      .populate("profileId", "dob gender nricNumber nricImages finNumber finImages studentIdNumber schoolName")
      .lean();

    if (!user) return res.status(404).json({ message: "Candidate not found" });

    // ✅ Fetch candidate applications (Populate Job & Shift)
    const applications = await Application.find({ userId: id })
      .populate({
        path: "jobId",
        select: "jobName jobStatus company outlet location rateType",
        populate: [
          { path: "company", select: "companyLegalName companyLogo" },
          { path: "outlet", select: "outletName outletAddress" },
        ],
      })
      .populate("shiftId") // ✅ Fetch shift details
      .lean();

    // ✅ Candidate Profile Object
    const candidateProfile = {
      candidateId: user._id,
      fullName: user.fullName,
      employmentStatus: user.employmentStatus,
      profilePicture: user.profilePicture || "/static/default-avatar.png",
      workPassStatus: "Verified",
      registeredAt: moment(user.createdAt).format("DD MMM, YYYY, hh:mm A"),
      personalDetails: {
        eWalletAmount: "$2,450",
        contactNumber: user.phoneNumber,
        dob: user.profileId?.dob ? moment(user.profileId.dob).format("DD - MM - YYYY") : "N/A",
        gender: user.profileId?.gender || "N/A",
        nationality: "Singapore",
        paynowNumber: "4512-1321-2312",
        race: "Korean",
        nric: user.profileId?.nricNumber ? user.profileId.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A",
        icNumber: user.profileId?.finNumber || "N/A",
        nricImages: {
          front: user.profileId?.nricImages?.front || "N/A",
          back: user.profileId?.nricImages?.back || "N/A",
        },
      },
    };

    // ✅ Active Job Processing
    const activeJob = applications.find(app => app.status === "Ongoing");
    let activeJobDetails = null;

    if (activeJob?.shiftId) {
      const job = activeJob.jobId;

      activeJobDetails = {
        jobName: job.jobName || "N/A",
        employer: job.company?.companyLegalName || "N/A",
        jobStatus: job.jobStatus || "N/A",
        date: moment(activeJob.date).format("DD MMM, YYYY"),
        shiftStartTime: activeJob.shiftId.startTime || "N/A",
        shiftEndTime: activeJob.shiftId.endTime || "N/A",
        totalDuration: `${activeJob.shiftId.duration} hrs`,
        totalWage: `$${activeJob.shiftId.totalWage}`,
        rateType: job.rateType || "Flat Rate",
        clockedInTime: activeJob.clockInTime ? moment(activeJob.clockInTime).format("hh:mm A") : "--",
        clockedOutTime: activeJob.clockOutTime ? moment(activeJob.clockOutTime).format("hh:mm A") : "--",
        wageGenerated: `$${activeJob.shiftId.totalWage}`,
      };
    }

    // ✅ Job History
    const jobHistory = applications.map(app => ({
      jobName: app.jobId?.jobName || "N/A",
      jobId: app.jobId?._id || "N/A",
      date: moment(app.date).format("DD MMM, YYYY"),
      employer: app.jobId?.company?.companyLegalName || "N/A",
      shiftTiming: `${app.shiftId?.startTime || "N/A"} - ${app.shiftId?.endTime || "N/A"}`,
      shiftId: app.shiftId?._id || "N/A",
      clockedIn: app.clockInTime ? moment(app.clockInTime).format("hh:mm A") : "--",
      clockedOut: app.clockOutTime ? moment(app.clockOutTime).format("hh:mm A") : "--",
      breakIncluded: app.shiftId?.breakHours ? `${app.shiftId.breakHours} Hrs` : "N/A",
      breakType: app.shiftId?.breakType || "Unpaid",
      confirmedOrStandby: app.isStandby ? "Standby" : "Confirmed",
      rateType: app.jobId?.rateType || "Flat Rate",
      totalWage: `$${app.shiftId?.totalWage}`,
      wageGenerated: `$${app.shiftId?.totalWage}`,
      jobStatus: app.status || "N/A",
      paymentStatus: app.status === "Completed" ? "Paid" : "Pending",
    }));

    // ✅ Work History Summary
    const workHistory = {
      attendanceRate: "95%",
      totalCompletedJobs: applications.filter(app => app.status === "Completed").length,
      workingHours: "234",
      cancellationsWithProof: "1",
      neverTurnUp: "1",
      cancellationsLessThan24hrs: "6",
      cancellationsMoreThan24hrs: "4",
    };

    res.status(200).json({
      success: true,
      candidateProfile,
      activeJob: activeJobDetails || {},
      jobHistory,
      workHistory,
    });
  } catch (error) {
    console.error("Error in getCandidateProfile:", error);
    res.status(500).json({ error: "Failed to fetch candidate details", details: error.message });
  }
};


  
exports.updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      gender,
      dob,
      phoneNumber,
      email,
      employmentStatus,
    } = req.body;

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

    // ✅ Check if profile exists and update it
    if (user.profileId) {
      const profile = await Profile.findById(user.profileId);
      if (profile) {
        profile.gender = gender || profile.gender;
        profile.dob = dob || profile.dob;
        await profile.save();
      }
    }

    await user.save();
    res.status(200).json({ success: true, message: "Candidate details updated", user });
  } catch (error) {
    console.error("Error in updateCandidate:", error);
    res.status(500).json({ error: "Failed to update candidate details", details: error.message });
  }
};
