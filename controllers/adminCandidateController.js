const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const mongoose = require("mongoose");
const moment = require("moment");

exports.getCandidatesByJob = async (req, res) => {
  try {
    const { id } = req.params; // Job ID
    const { status, shiftTime } = req.query; // Filters: "confirmed", "pending", "standby", "shiftTime"

    // Check if job exists
    const job = await Job.findById(id).populate("employer", "companyName").lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Fetch all applications for this job
    const applications = await Application.find({ jobId: id })
      .populate("userId", "fullName gender phoneNumber dob nricNumber profilePicture")
      .lean();

    // Ensure applications exist
    if (!applications.length) {
      return res.status(404).json({ message: "No candidates found for this job" });
    }

    // Fetch job shifts
    const jobShifts = job.dates.flatMap(date => date.shifts.map(shift => ({
      shiftId: shift._id.toString(),
      date: moment(date.date).format("DD MMM, YYYY"),
      startTime: shift.startTime,
      endTime: shift.endTime,
      totalWage: shift.totalWage,
      rateType: shift.rateType,
      payRate: shift.payRate,
      breakType: shift.breakType,
      duration: shift.duration,
      filledVacancies: shift.filledVacancies,
      standbyFilled: shift.standbyFilled,
    })));

    // Organize candidates into categories
    const confirmedCandidates = [];
    const pendingCandidates = [];
    const standbyCandidates = [];

    applications.forEach((app) => {
      if (!app.userId) return;

      // Find the shift details for this candidate
      const shift = jobShifts.find(s => s.shiftId === app.shiftId.toString());

      // Ensure shift exists before proceeding
      if (!shift) return;

      const candidate = {
        id: app.userId?._id,
        fullName: app.userId?.fullName || "N/A",
        gender: app.userId?.gender || "N/A",
        mobile: app.userId?.phoneNumber || "N/A",
        dob: app.userId?.dob ? moment(app.userId.dob).format("DD MMM, YYYY") : "N/A",
        nric: app.userId?.nricNumber ? app.userId.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A",
        profilePicture: app.userId?.profilePicture || "/static/default-avatar.png",
        approvedStatus: app.appliedStatus === "Applied" ? "Confirmed" : "Pending", // Mark as Confirmed or Pending
        confirmedOrStandby: app.isStandby ? "Standby" : "Confirmed",
        shift: {
          date: shift.date || "N/A",
          startTime: shift.startTime || "N/A",
          endTime: shift.endTime || "N/A",
          clockedIn: app.clockInTime ? moment(app.clockInTime).format("hh:mm A") : "N/A",
          clockedOut: app.clockOutTime ? moment(app.clockOutTime).format("hh:mm A") : "N/A",
          jobStatus: app.status || "Unknown",
          wageGenerated: shift.totalWage ? `$${shift.totalWage}` : "$0",
          rateType: shift.rateType || "N/A",
          payRate: shift.payRate ? `$${shift.payRate}/hr` : "N/A",
          breakType: shift.breakType || "N/A",
          totalDuration: shift.duration ? `${shift.duration} hrs` : "N/A",
          vacancyFilled: `${shift.filledVacancies || 0}`,
          standbyFilled: `${shift.standbyFilled || 0}`,
        },
      };

      if (app.appliedStatus === "Applied") {
        confirmedCandidates.push(candidate);
      } else if (app.appliedStatus === "Pending") {
        pendingCandidates.push(candidate);
      } else if (app.isStandby) {
        standbyCandidates.push(candidate);
      }
    });

    let filteredCandidates = [...confirmedCandidates, ...pendingCandidates, ...standbyCandidates];

    // Apply filtering if status is provided
    if (status) {
      if (status === "confirmed") filteredCandidates = confirmedCandidates;
      if (status === "pending") filteredCandidates = pendingCandidates;
      if (status === "standby") filteredCandidates = standbyCandidates;
    }

    // Apply filtering by shift time
    if (shiftTime) {
      filteredCandidates = filteredCandidates.filter(candidate => candidate.shift.startTime === shiftTime);
    }

    res.status(200).json({
      success: true,
      job: {
        jobId: job._id,
        jobName: job.jobName,
        employer: job.employer.companyName,
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
  
      // ✅ Fetch candidate applications
      const applications = await Application.find({ userId: id })
        .populate({
          path: "jobId",
          select: "jobName jobStatus employer outlet dates location rateType",
          populate: [
            { path: "employer", select: "companyName" },
            { path: "outlet", select: "outletName location" },
          ],
        })
        .lean();
  
      // ✅ Format candidate details
      const candidateProfile = {
        candidateId: user._id,
        fullName: user.fullName,
        profilePicture: user.profilePicture || "/static/default-avatar.png",
        workPassStatus: "Verified",
        registeredAt: moment(user.createdAt).format("DD MMM, YYYY, hh:mm A"),
        personalDetails: {
          eWalletAmount: "€ 2,450",
          contactNumber: user.phoneNumber,
          dob: user.profileId?.dob ? moment(user.profileId.dob).format("DD - MM - YYYY") : "N/A",
          gender: user.profileId?.gender || "N/A",
          nationality: "Singapore",
          paynowNumber: "4512-1321-2312",
          race: "Korean",
          nric: user.profileId?.nricNumber ? user.profileId.nricNumber.replace(/.(?=.{4})/g, "*") : "N/A",
          foodHygieneCert: user.profileId?.finImages?.front || "N/A",
          icNumber: user.profileId?.finNumber || "N/A",
          nricImages: {
            front: user.profileId?.nricImages?.front || "N/A",
            back: user.profileId?.nricImages?.back || "N/A",
          },
        },
      };
  
      // ✅ Process active job details
      const activeJob = applications.find(app => app.status === "Ongoing");
      let activeJobDetails = null;
      if (activeJob) {
        const job = activeJob.jobId;
        let shiftDetails = null;
  
        for (const date of job.dates) {
          if (new Date(date.date).toISOString().split("T")[0] === new Date(activeJob.date).toISOString().split("T")[0]) {
            shiftDetails = date.shifts.find((shift) => shift._id.toString() === activeJob.shiftId.toString());
            break;
          }
        }
  
        activeJobDetails = {
          jobName: job.jobName,
          employer: job.employer.companyName,
          jobStatus: job.jobStatus,
          date: moment(activeJob.date).format("DD MMM, YYYY"),
          shiftStartTime: shiftDetails?.startTime || "N/A",
          shiftEndTime: shiftDetails?.endTime || "N/A",
          totalDuration: shiftDetails?.duration ? `${shiftDetails.duration} hrs` : "N/A",
          totalWage: shiftDetails?.totalWage ? `$${shiftDetails.totalWage}` : "$--",
          rateType: job.rateType || "Flat Rate",
          clockedInTime: activeJob.clockInTime ? moment(activeJob.clockInTime).format("hh:mm A") : "--",
          clockedOutTime: activeJob.clockOutTime ? moment(activeJob.clockOutTime).format("hh:mm A") : "--",
          wageGenerated: shiftDetails?.totalWage ? `$${shiftDetails.totalWage}` : "$--",
        };
      }
  
      // ✅ Process job history
      const jobHistory = applications.map(app => {
        const job = app.jobId;
        let shiftDetails = null;
  
        for (const date of job.dates) {
          if (new Date(date.date).toISOString().split("T")[0] === new Date(app.date).toISOString().split("T")[0]) {
            shiftDetails = date.shifts.find((shift) => shift._id.toString() === app.shiftId.toString());
            break;
          }
        }
  
        return {
          jobName: job.jobName,
          jobId: job._id,
          date: moment(app.date).format("DD MMM, YYYY"),
          employer: job.employer.companyName,
          shiftTiming: `${shiftDetails?.startTime || "N/A"} - ${shiftDetails?.endTime || "N/A"}`,
          shiftId: shiftDetails?._id || "N/A",
          clockedIn: app.clockInTime ? moment(app.clockInTime).format("hh:mm A") : "--",
          clockedOut: app.clockOutTime ? moment(app.clockOutTime).format("hh:mm A") : "--",
          breakIncluded: shiftDetails?.breakHours ? `${shiftDetails.breakHours} Hrs` : "N/A",
          breakType: shiftDetails?.breakType || "Unpaid",
          confirmedOrStandby: app.isStandby ? "Standby" : "Confirmed",
          rateType: job.rateType || "Flat Rate",
          totalWage: shiftDetails?.totalWage ? `$${shiftDetails.totalWage}` : "$--",
          wageGenerated: shiftDetails?.totalWage ? `$${shiftDetails.totalWage}` : "$--",
          jobStatus: app.status,
          paymentStatus: app.status === "Completed" ? "Paid" : "Pending",
        };
      });
  
      // ✅ Work history details
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
        workPassStatus,
        dob,
        phoneNumber,
        email,
        postalCode,
        country,
        city,
        streetAddress
      } = req.body;
  
      // ✅ Validate MongoDB ObjectId
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
      
      // ✅ Check if profile exists
      if (user.profileId) {
        const profile = await Profile.findById(user.profileId);
        if (profile) {
          profile.gender = gender || profile.gender;
          profile.dob = dob || profile.dob;
          profile.postalCode = postalCode || profile.postalCode;
          profile.country = country || profile.country;
          profile.city = city || profile.city;
          profile.streetAddress = streetAddress || profile.streetAddress;
          await profile.save();
        }
      }
  
      await user.save();
      res.status(200).json({ success: true, message: "Candidate details updated successfully", user });
    } catch (error) {
      console.error("Error in updateCandidate:", error);
      res.status(500).json({ error: "Failed to update candidate details", details: error.message });
    }
  };