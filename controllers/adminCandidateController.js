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
      if (employerData) {
        jobQuery.company = employerData._id;
      } else {
        // Return early if employer doesn't match — avoids false positives
        return res.status(200).json({
          success: true,
          totalCandidates: 0,
          confirmedCount: 0,
          pendingCount: 0,
          standbyCount: 0,
          candidates: [],
        });
      }
    }

    const jobs = await Job.find(jobQuery)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress")
      .populate("shifts", "startTime startMeridian endTime endMeridian vacancy standbyVacancy")
      .lean();

    // ✅ Fetch applications for these jobs
    let applications = [];
    if (jobs.length > 0) {
      const jobIds = jobs.map((job) => job._id);
      applications = await Application.find({ jobId: { $in: jobIds } })
        .populate({
          path: "userId",
          select: "fullName phoneNumber profilePicture createdAt status profileId", // ✅ Include profileId
          populate: {
            path: "profileId",
            select: "dob gender nricNumber", // ✅ Get Profile Data
          },
        })
        .populate("jobId", "jobName date company isCancelled")
        .populate("shiftId")
        .lean();
    }

    // ✅ Fetch all users, including profile data
    const allUsers = await User.find({})
      .select("fullName phoneNumber profilePicture createdAt status profileId")
      .populate("profileId", "dob gender nricNumber") // ✅ Populate Profile Data
      .lean();

    // ✅ Fetch Worker Data
    const workerIds = applications.map((app) => app.userId?._id).filter(Boolean);
    const workers = await Worker.find({ userId: { $in: workerIds } })
      .select("userId totalHoursWorked attendanceRate")
      .lean();

    // Convert workers to a Map for quick lookup
    const workerMap = {};
    workers.forEach((worker) => {
      workerMap[worker.userId.toString()] = worker;
    });

    const candidates = [];

    // ✅ Process Applications
    applications.forEach((app) => {
      if (!app.userId || !app.jobId || !app.shiftId) return;

      const employerName = app.jobId.company ? app.jobId.company.companyLegalName : "Unknown Employer";
      const jobDate = moment(app.jobId.date).format("DD MMM, YY");

      // ✅ Get Worker Data
      const workerData = workerMap[app.userId._id.toString()] || {};
      const totalHoursWorked = workerData.totalHoursWorked || 0;
      const avgAttendanceRate = workerData.attendanceRate ? `${workerData.attendanceRate}%` : "0%";
      const workingHours = `${totalHoursWorked} hrs`;
      const workPassStatus = app.userId.status || "Unknown";
      const turnUpRate = app.clockInTime ? 1 : 0;

      // ✅ Get Profile Data
      const profile = app.userId.profileId || {};
      const gender = profile.gender || "N/A";
      const dob = profile.dob ? moment(profile.dob).format("DD MMM, YYYY") : "N/A";
      const nric = profile.nricNumber ? profile.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A";

      // ✅ Calculate Age
      let age = "N/A";
      if (profile.dob) {
        const birthYear = moment(profile.dob).year();
        const currentYear = moment().year();
        age = currentYear - birthYear;
      }

      // ✅ Calculate job status
      const today = moment().startOf("day");
      const jobMomentDate = moment(app.jobId.date).startOf("day");
      let jobStatus = app.jobId.isCancelled ? "Cancelled" : jobMomentDate.isAfter(today) ? "Upcoming" : "Active";

      candidates.push({
        id: app.userId._id,
        fullName: app.userId.fullName,
        gender,
        mobile: app.userId.phoneNumber || "N/A",
        dob,
        age,
        nric,
        profilePicture: app.userId.profilePicture || "/static/default-avatar.png",
        registrationDate: moment(app.userId.createdAt).format("DD MMM, YYYY"),
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
          wageGenerated: `$${app.shiftId.totalWage}`,
          rateType: app.shiftId.rateType,
          payRate: `$${app.shiftId.payRate}/hr`,
          breakType: app.shiftId.breakType,
          totalDuration: `${app.shiftId.duration} hrs`,
          vacancyFilled: app.shiftId.vacancyFilled,
          standbyFilled: app.shiftId.standbyFilled,
        },
        turnUpRate,
        avgAttendanceRate,
        workPassStatus,
        workingHours,
        completedJobs: 122, // Example static value
      });
    });

    // ✅ Add Users Who Have No Applications
    allUsers.forEach((user) => {
      if (!candidates.find((c) => c.id.toString() === user._id.toString())) {
        const profile = user.profileId || {};
        // ✅ Calculate Age for Users Without Applications
        let age = "N/A";
        if (profile.dob) {
          const birthYear = moment(profile.dob).year();
          const currentYear = moment().year();
          age = currentYear - birthYear;
        }
        candidates.push({
          id: user._id,
          fullName: user.fullName,
          gender: profile.gender || "N/A",
          mobile: user.phoneNumber || "N/A",
          dob: profile.dob ? moment(profile.dob).format("DD MMM, YYYY") : "N/A",
          age,
          nric: profile.nricNumber ? profile.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A",
          profilePicture: user.profilePicture || "/static/default-avatar.png",
          registrationDate: moment(user.createdAt).format("DD MMM, YYYY"),
          appliedStatus: "N/A",
          confirmedOrStandby: "N/A",
          job: null,
          shift: null,
          turnUpRate: 0,
          avgAttendanceRate: "0%",
          workPassStatus: user.status || "Unknown",
          workingHours: "0 hrs",
          completedJobs: 0,
        });
      }
    });

    // ✅ Apply filtering
    let filteredCandidates = candidates;
    if (status) filteredCandidates = filteredCandidates.filter((c) => c.workPassStatus.toLowerCase() === status.toLowerCase());
    if (shiftTime) filteredCandidates = filteredCandidates.filter((c) => c.shift?.startTime === shiftTime);

    res.status(200).json({
      success: true,
      totalCandidates: filteredCandidates.length,
      confirmedCount: candidates.filter((c) => c.appliedStatus === "Applied").length,
      pendingCount: candidates.filter((c) => c.appliedStatus === "Pending").length,
      standbyCount: candidates.filter((c) => c.confirmedOrStandby === "Standby").length,
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

    // ✅ Fetch Job with details
    const job = await Job.findById(id)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress")
      .populate("shifts", "startTime startMeridian endTime endMeridian vacancy standbyVacancy")
      .lean();

    if (!job) return res.status(404).json({ message: "Job not found" });

    // ✅ Extract Job Details
    const employerName = job.company ? job.company.companyLegalName : "Unknown Employer";
    const jobDate = moment(job.date).format("DD MMM, YYYY");

    // ✅ Calculate Current Headcount
    const totalVacancy = job.shifts.reduce((acc, shift) => acc + shift.vacancy, 0);
    const totalApplied = await Application.countDocuments({ jobId: id });
    const currentHeadCount = `${totalApplied}/${totalVacancy}`;

    // ✅ Fetch Applications for this Job
    const applications = await Application.find({ jobId: id })
      .populate({
        path: "userId",
        select: "fullName phoneNumber profilePicture createdAt status profileId",
        populate: {
          path: "profileId",
          select: "dob gender nricNumber",
        },
      })
      .populate("shiftId")
      .lean();

      if (!applications.length) {
        return res.status(200).json({
          success: true,
          job: {
            jobId: job._id,
            jobName: job.jobName,
            employer: employerName,
            date: jobDate,
            currentHeadCount,
            jobStatus: "No Applicants",
          },
          totalCandidates: 0,
          confirmedCount: 0,
          pendingCount: 0,
          standbyCount: 0,
          candidates: [],
        });
      }
      

    // ✅ Organize Candidates (By Default: Show All)
    const candidates = applications.map((app) => {
      if (!app.userId || !app.shiftId) return null;

      const approvedStatus = app.userId.status || "Unknown";

      // ✅ Fetch Profile Data
      const profile = app.userId.profileId || {};
      const gender = profile.gender || "N/A";
      const dob = profile.dob ? moment(profile.dob).format("DD MMM, YYYY") : "N/A";
      const nric = profile.nricNumber ? profile.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A";

      // ✅ Calculate Age
      let age = "N/A";
      if (profile.dob) {
        const birthYear = moment(profile.dob).year();
        const currentYear = moment().year();
        age = currentYear - birthYear;
      }

      // ✅ Determine Candidate Status
      const turnUpRate = app.clockInTime ? 1 : 0;

      return {
        id: app.userId._id,
        fullName: app.userId.fullName,
        gender,
        age,
        mobile: app.userId.phoneNumber || "N/A",
        dob,
        nric,
        profilePicture: app.userId.profilePicture || "/static/default-avatar.png",
        registrationDate: moment(app.userId.createdAt).format("DD MMM, YYYY"),
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
        // turnUpRate,
        approvedStatus,
        completedJobs: 122, // Example static value (fetch from Applications DB if needed)
      };
    }).filter(Boolean);

    // ✅ Apply Filters (Only if explicitly requested)
    let filteredCandidates = [...candidates];
    if (status) filteredCandidates = filteredCandidates.filter((c) => c.confirmedOrStandby.toLowerCase() === status.toLowerCase());
    if (shiftTime) filteredCandidates = filteredCandidates.filter((c) => c.shift.startTime === shiftTime);

    // ✅ Sort by Recent Candidates First
    filteredCandidates.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));

    // ✅ Determine Job Status
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
      confirmedCount: candidates.filter((c) => c.confirmedOrStandby === "Confirmed").length,
      pendingCount: candidates.filter((c) => c.appliedStatus === "Pending").length,
      standbyCount: candidates.filter((c) => c.confirmedOrStandby === "Standby").length,
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
