const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const Shift = require("../models/Shift");
const mongoose = require("mongoose");
const moment = require("moment");
const Employer = require("../models/Employer");
const Profile = require("../models/Profile");
const Outlet = require("../models/Outlet");
const Notification = require('../models/Notification'); 

const Worker = require("../models/Worker");

/**
 * ✅ Get candidates by Job ID with applied filters (Confirmed, Pending, Standby)
 */



exports.getCandidates = async (req, res) => {
  try {
    const { jobName, employer, status, shiftTime } = req.query;

    // ✅ Fetch jobs based on job name or employer
    let jobQuery = {};
    if (jobName) jobQuery.jobName = new RegExp(jobName, "i"); // Case-insensitive search
    if (employer) {
      const employerData = await Employer.findOne({ companyLegalName: new RegExp(employer, "i") });
      if (employerData) jobQuery.company = employerData._id;
    }

    const jobs = await Job.find(jobQuery)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress")
      .populate("shifts", "startTime startMeridian endTime endMeridian vacancy standbyVacancy")
      .lean();

    if (!jobs.length) return res.status(404).json({ message: "No jobs found" });

    // ✅ Fetch applications for these jobs
    const jobIds = jobs.map((job) => job._id);
    const applications = await Application.find({ jobId: { $in: jobIds } })
      .populate("userId", "fullName gender phoneNumber dob nricNumber profilePicture createdAt")
      .populate("jobId", "jobName date company isCancelled")
      .populate("shiftId")
      .lean();

    if (!applications.length) return res.status(404).json({ message: "No candidates found" });

    // ✅ Fetch Worker Data
    const workerIds = applications.map((app) => app.userId?._id).filter(Boolean);
    const workers = await Worker.find({ userId: { $in: workerIds } })
      .select("userId workPassStatus totalHoursWorked attendanceRate")
      .lean();

    // Convert workers to a Map for quick lookup
    const workerMap = {};
    workers.forEach((worker) => {
      workerMap[worker.userId.toString()] = worker;
    });

    const confirmedCandidates = [];
    const pendingCandidates = [];
    const standbyCandidates = [];

    applications.forEach((app) => {
      if (!app.userId || !app.jobId || !app.shiftId) return;

      const employerName = app.jobId.company ? app.jobId.company.companyLegalName : "Unknown Employer";
      const jobDate = moment(app.jobId.date).format("DD MMM, YY");

      // ✅ Get Worker Data
      const workerData = workerMap[app.userId._id.toString()] || {};
      const workPassStatus = workerData.workPassStatus || "Unknown";
      const totalHoursWorked = workerData.totalHoursWorked || 0;
      const avgAttendanceRate = workerData.attendanceRate || 100;

      // ✅ Calculate Turn-up Rate
      const turnUpRate = app.clockInTime ? "Turned Up" : "Did Not Turn Up";

      // ✅ Calculate job status
      const today = moment().startOf("day");
      const jobMomentDate = moment(app.jobId.date).startOf("day");

      let jobStatus = "Unknown";
      if (app.jobId.isCancelled) {
        jobStatus = "Cancelled";
      } else if (jobMomentDate.isAfter(today)) {
        jobStatus = "Upcoming";
      } else {
        jobStatus = "Active";
      }

      // ✅ Candidate object with new data
      const candidate = {
        id: app.userId._id,
        fullName: app.userId.fullName,
        gender: app.userId.gender || "N/A",
        mobile: app.userId.phoneNumber || "N/A",
        dob: app.userId.dob ? moment(app.userId.dob).format("DD MMM, YYYY") : "N/A",
        nric: app.userId.nricNumber ? app.userId.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A",
        profilePicture: app.userId.profilePicture || "/static/default-avatar.png",
        registrationDate: moment(app.userId.createdAt).format("DD MMM, YYYY"), // ✅ Registration Date
        appliedStatus: app.appliedStatus || "Applied",
        confirmedOrStandby: app.isStandby ? "Standby" : "Confirmed",
        job: {
          jobId: app.jobId._id,
          jobName: app.jobId.jobName,
          employer: employerName,
          date: jobDate,
          jobStatus,
        },
        shift: {
          shiftId: app.shiftId._id,
          date: moment(app.date).format("DD MMM, YYYY"),
          startTime: `${app.shiftId.startTime} ${app.shiftId.startMeridian}`,
          endTime: `${app.shiftId.endTime} ${app.shiftId.endMeridian}`,
          clockedIn: app.clockInTime ? moment(app.clockInTime).format("hh:mm A") : "--",
          clockedOut: app.clockOutTime ? moment(app.clockOutTime).format("hh:mm A") : "--",
          totalHoursWorked, // ✅ Total Working Hours
          wageGenerated: `$${app.shiftId.totalWage}`,
          rateType: app.shiftId.rateType,
          payRate: `$${app.shiftId.payRate}/hr`,
          breakType: app.shiftId.breakType,
          totalDuration: `${app.shiftId.duration} hrs`,
          vacancyFilled: app.shiftId.vacancyFilled,
          standbyFilled: app.shiftId.standbyFilled,
        },
        turnUpRate, // ✅ Turn-up Rate
        avgAttendanceRate, // ✅ Average Attendance Rate
        workPassStatus, // ✅ Work Pass Status
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

    res.status(200).json({
      success: true,
      totalCandidates: filteredCandidates.length,
      confirmedCount: confirmedCandidates.length,
      pendingCount: pendingCandidates.length,
      standbyCount: standbyCandidates.length,
      candidates: filteredCandidates,
    });
  } catch (error) {
    console.error("Error in getCandidates:", error);
    res.status(500).json({ error: "Failed to fetch candidates", details: error.message });
  }
};



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

    // ✅ Fetch Worker Details (Work Pass, Attendance, Work History)
    const worker = await Worker.findOne({ userId: id })
      .select("workPassStatus attendanceRate totalCompletedJobs totalHoursWorked cancellationCount noShowCount")
      .lean();

    // ✅ Fetch candidate applications (Job History & Active Job)
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

    // ✅ Calculate Age from DOB
    const calculateAge = (dob) => {
      return dob ? moment().diff(moment(dob), "years") : "N/A";
    };

    // ✅ Candidate Profile Object
    const candidateProfile = {
      candidateId: user._id,
      fullName: user.fullName,
      employmentStatus: user.employmentStatus,
      workPassStatus: worker?.workPassStatus || "N/A", // ✅ Work Pass Status
      profilePicture: user.profilePicture || "/static/default-avatar.png",
      registeredAt: moment(user.createdAt).format("DD MMM, YYYY, hh:mm A"),
      personalDetails: {
        eWalletAmount: "$2,450",
        contactNumber: user.phoneNumber,
        dob: user.profileId?.dob ? moment(user.profileId.dob).format("DD - MM - YYYY") : "N/A",
        age: calculateAge(user.profileId?.dob), // ✅ Age Calculation
        gender: user.profileId?.gender || "N/A",
        nationality: "Singapore",
        race: user.profileId?.race || "N/A", // ✅ Race
        paynowNumber: user.profileId?.paynowNumber || "N/A", // ✅ PayNow Number
        nric: user.profileId?.nricNumber ? user.profileId.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A",
        icNumber: user.profileId?.finNumber || "N/A",
        foodHygieneCert: user.profileId?.foodHygieneCert || "N/A", // ✅ Food & Hygiene Certificate
      },
    };

    // ✅ Active Job Processing (Ensure all fields exist)
    const activeJob = applications.find(app => app.status === "Upcoming");
    let activeJobDetails = activeJob ? {
      jobName: activeJob.jobId?.jobName || "Unknown Job",
      employer: activeJob.jobId?.company?.companyLegalName || "Unknown Employer",
      date: activeJob.date ? moment(activeJob.date).format("DD MMM, YYYY") : "N/A",
      shiftStartTime: activeJob.shiftId ? `${activeJob.shiftId.startTime} ${activeJob.shiftId.startMeridian}` : "N/A",
      shiftEndTime: activeJob.shiftId ? `${activeJob.shiftId.endTime} ${activeJob.shiftId.endMeridian}` : "N/A",
      totalDuration: activeJob.shiftId ? `${activeJob.shiftId.duration} hrs` : "N/A",
      clockedInTime: activeJob.clockInTime ? moment(activeJob.clockInTime).format("hh:mm A") : "--",
      clockedOutTime: activeJob.clockOutTime ? moment(activeJob.clockOutTime).format("hh:mm A") : "--",
      totalWage: activeJob.shiftId ? `$${activeJob.shiftId.totalWage}` : "N/A",
      wageGenerated: activeJob.shiftId ? `$${activeJob.shiftId.totalWage - 5}` : "--", // Example Calculation
      rateType: activeJob.shiftId?.rateType || "N/A",
    } : null;

    // ✅ Work History Data
    const workHistory = {
      attendanceRate: worker?.attendanceRate || "N/A",
      totalCompletedJobs: worker?.totalCompletedJobs || 0,
      workingHours: worker?.totalHoursWorked || 0,
      cancellationWithProof: worker?.cancellationCount?.withProof || 0,
      neverTurnUp: worker?.noShowCount || 0,
      moreThan24hrsCancellation: worker?.cancellationCount?.moreThan24hrs || 0,
      lessThan24hrsCancellation: worker?.cancellationCount?.lessThan24hrs || 0,
    };

    // ✅ Job History Data
    const jobHistory = applications.map(app => ({
      jobName: app.jobId?.jobName || "Unknown Job",
      jobId: app.jobId?._id || "N/A",
      date: app.date ? moment(app.date).format("DD MMM, YYYY") : "N/A",
      employer: app.jobId?.company?.companyLegalName || "Unknown Employer",
      shiftTiming: app.shiftId ? `${app.shiftId.startTime} ${app.shiftId.startMeridian} - ${app.shiftId.endTime} ${app.shiftId.endMeridian}` : "N/A",
      shiftId: app.shiftId?._id || "N/A",
      clockedIn: app.clockInTime ? moment(app.clockInTime).format("hh:mm A") : "--",
      clockedOut: app.clockOutTime ? moment(app.clockOutTime).format("hh:mm A") : "--",
      breakType: app.shiftId?.breakType || "N/A",
      fromConfirmedStandby: app.isStandby ? "Standby" : "Confirmed",
      rateType: app.shiftId?.rateType || "N/A",
      totalWage: app.shiftId ? `$${app.shiftId.totalWage}` : "N/A",
      wageGenerated: app.shiftId ? `$${app.shiftId.totalWage - 5}` : "--", // Example
      jobStatus: app.status || "N/A",
      paymentStatus: app.paymentStatus || "Pending",
    }));

    res.status(200).json({
      success: true,
      candidateProfile,
      activeJob: activeJobDetails || {},
      workHistory,
      jobHistory,
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
    const { fullName, gender, dob, phoneNumber, email, employmentStatus, status, country, city, town } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Candidate ID" });
    }

    // ✅ Find Candidate
    const user = await User.findById(id).populate("profileId");
    if (!user) return res.status(404).json({ message: "Candidate not found" });

    // ✅ Check if status has changed
    const previousStatus = user.status;
    const statusChanged = previousStatus !== status;

    // ✅ Update fields
    user.fullName = fullName || user.fullName;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;
    user.employmentStatus = employmentStatus || user.employmentStatus;
    user.status = status || user.status;

    if (user.profileId) {
      const profile = await Profile.findById(user.profileId);
      profile.gender = gender || profile.gender;
      profile.dob = dob || profile.dob;
      profile.country = country || profile.country;
      profile.city = city || profile.city;
      profile.town = town || profile.town;
      await profile.save();
    }

    await user.save();

    // ✅ Send notification if status changed
    if (statusChanged) {
      let notificationMessage = '';
      if (status === 'Verified') {
        notificationMessage = "Your profile has been verified! You can now apply for jobs.";
      } else if (status === 'Pending') {
        notificationMessage = "Your profile is under review. We'll notify you once it's verified.";
      } else if (status === 'Rejected') {
        notificationMessage = "Your profile has been rejected. Please check your details and resubmit.";
      } else if (status === 'Incomplete Profile') {
        notificationMessage = "Your profile is incomplete. Please fill in all required details.";
      }

      await Notification.create({
        userId: user._id,
        type: 'Admin Update',
        title: 'Profile Status Update',
        message: notificationMessage,
      });
    }
    
    res.status(200).json({ success: true, message: "Candidate details updated", user });
  } catch (error) {
    console.error("Error in updateCandidate:", error);
    res.status(500).json({ error: "Failed to update candidate details", details: error.message });
  }
};
