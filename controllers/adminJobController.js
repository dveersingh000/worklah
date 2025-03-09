const Job = require("../models/Job");
const Employer = require("../models/Employer");
const Outlet = require("../models/Outlet");
const Application = require("../models/Application");
const Shift = require("../models/Shift");
const mongoose = require("mongoose");
const moment = require("moment");

exports.getAllJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, jobName, employerId, outletId, status, city } = req.query;

    const filters = {};
    if (jobName) filters.jobName = { $regex: jobName, $options: "i" };
    if (status) filters.jobStatus = status;
    if (employerId && mongoose.Types.ObjectId.isValid(employerId)) filters.company = employerId;
    if (outletId && mongoose.Types.ObjectId.isValid(outletId)) filters.outlet = outletId;
    if (city) filters.location = { $regex: city, $options: "i" };

    const jobs = await Job.find(filters)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress outletImage")
      .populate({
        path: "shifts",
        model: "Shift",
        select: "startTime startMeridian endTime endMeridian vacancy standbyVacancy duration breakHours breakType rateType payRate totalWage",
      })
      .lean();

    const applicationCounts = await Application.aggregate([
      {
        $group: {
          _id: "$jobId",
          totalApplications: { $sum: 1 },
          standbyApplications: { $sum: { $cond: [{ $eq: ["$isStandby", true] }, 1, 0] } },
        },
      },
    ]);

    const applicationCountMap = {};
    applicationCounts.forEach((app) => {
      applicationCountMap[app._id] = {
        totalApplications: app.totalApplications || 0,
        standbyApplications: app.standbyApplications || 0,
      };
    });

    const formattedJobs = jobs.map((job) => {
      let totalVacancy = 0;
      let totalStandby = 0;
      let totalShifts = job.shifts.length;

      const shiftsArray = job.shifts.map((shift) => {
        totalVacancy += shift.vacancy;
        totalStandby += shift.standbyVacancy;

        return {
          shiftId: shift._id,
          startTime: `${shift.startTime} ${shift.startMeridian}`,
          endTime: `${shift.endTime} ${shift.endMeridian}`,
          breakIncluded: `${shift.breakHours} Hrs ${shift.breakType}`,
          vacancy: shift.vacancy,
          standbyVacancy: shift.standbyVacancy,
          duration: shift.duration,
          payRate: `$${shift.payRate}`,
          totalWage: `$${shift.totalWage}`,
        };
      });

      const applicationStats = applicationCountMap[job._id] || {
        totalApplications: 0,
        standbyApplications: 0,
      };


      // Determine Job Status Logic
      const today = moment().startOf("day");
      const jobDate = moment(job.date).startOf("day");

      let jobStatus = "Unknown";

      if (job.isCancelled) {
        jobStatus = "Cancelled";
      } else if (jobDate.isAfter(today)) {
        jobStatus = "Upcoming";
      } else if (applicationStats.totalApplications >= totalVacancy) {
        jobStatus = "Completed";
      } else {
        jobStatus = "Active";
      }

      return {
        _id: job._id,
        jobName: job.jobName,
        employer: {
          name: job.company?.companyLegalName || "Unknown",
          logo: job.company?.companyLogo || "/static/companyLogo.png",
        },
        outlet: {
          name: job.outlet?.outletName || "Unknown",
          location: job.outlet?.outletAddress || "Not available",
          logo: job.outlet?.outletImage || "/static/Job.png",
        },
        industry: job.industry,
        date: moment(job.date).format("DD MMM, YY"),
        numberOfShifts: totalShifts,
        vacancyUsers: `${applicationStats.totalApplications}/${totalVacancy}`,
        standbyUsers: `${applicationStats.standbyApplications}/${totalStandby}`,
        totalWage: `$${shiftsArray.reduce((acc, shift) => acc + parseFloat(shift.totalWage.replace("$", "")), 0)}`,
        jobStatus, // Now dynamically set
        shiftSummary: { totalVacancy, totalStandby, totalShifts },
        shifts: shiftsArray,
      };
    });

    const totalActiveJobs = formattedJobs.filter((job) => job.jobStatus === "Active").length;
    const totalUpcomingJobs = formattedJobs.filter((job) => job.jobStatus === "Upcoming").length;
    const totalCancelledJobs = formattedJobs.filter((job) => job.jobStatus === "Cancelled").length;

    const attendanceData = await Application.aggregate([
      { $match: { status: "Completed" } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);
    const totalCompletedJobs = attendanceData[0]?.count || 0;
    const totalApplications = await Application.countDocuments();
    const attendanceRate = totalApplications > 0 ? ((totalCompletedJobs / totalApplications) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      totalJobs: formattedJobs.length,
      totalActiveJobs,
      totalUpcomingJobs,
      totalCancelledJobs,
      averageAttendanceRate: `${attendanceRate}%`,
      page: Number(page),
      jobs: formattedJobs,
    });
  } catch (error) {
    console.error("Error in getAllJobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs", details: error.message });
  }
};




// ✅ Fetch a single job by ID (with employer, outlet, shifts)
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress outletImage")
      .populate({
        path: "shifts",
        model: "Shift",
        select: "startTime startMeridian endTime endMeridian vacancy standbyVacancy duration breakHours breakType rateType payRate totalWage",
      })
      .lean();

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Fetch applications to calculate filled vacancies & standby users
    const applicationStats = await Application.aggregate([
      { $match: { jobId: job._id } },
      {
        $group: {
          _id: "$jobId",
          totalApplications: { $sum: 1 },
          standbyApplications: { $sum: { $cond: [{ $eq: ["$isStandby", true] }, 1, 0] } },
        },
      },
    ]);

    const jobApplications = applicationStats[0] || {
      totalApplications: 0,
      standbyApplications: 0,
    };

    // Initialize shift summary
    let totalVacancy = 0;
    let totalStandby = 0;
    let totalShifts = job.shifts.length;

    // Extracting shift data for easier frontend integration
    const shiftsArray = job.shifts.map((shift) => {
      totalVacancy += shift.vacancy;
      totalStandby += shift.standbyVacancy;

      return {
        shiftId: shift._id,
        startTime: shift.startTime,
        startMeridian: shift.startMeridian,
        endTime: shift.endTime,
        endMeridian: shift.endMeridian,
        totalDuration: `${shift.duration} Hrs`,
        breakIncluded: shift.breakHours,
        breakType: shift.breakType,
        rateType: shift.rateType,
        vacancy: shift.vacancy,
        standbyVacancy: shift.standbyVacancy,
        payRate: shift.payRate,
        totalWage: shift.totalWage,
      };
    });
    const totalWage = shiftsArray.reduce((acc, shift) => acc + shift.totalWage, 0);

    // Determine Job Status Logic
    const today = moment().startOf("day");
    const jobDate = moment(job.date).startOf("day");

    let jobStatus = "Unknown";

    if (job.isCancelled) {
      jobStatus = "Cancelled";
    } else if (jobDate.isAfter(today)) {
      jobStatus = "Upcoming";
    } else if (jobApplications.totalApplications >= totalVacancy) {
      jobStatus = "Completed";
    } else {
      jobStatus = "Active";
    }

    // Shift Summary
    const shiftSummary = {
      totalVacancy,
      totalStandby,
      totalShifts,
    };

    // Static shift cancellation penalties
    const shiftCancellationPenalties = [
      { condition: "5 Minutes after applying", penalty: "No Penalty" },
      { condition: "< 24 Hours", penalty: "No Penalty" },
      { condition: "> 24 Hours", penalty: "$5 Penalty" },
      { condition: "> 48 Hours", penalty: "$10 Penalty" },
      { condition: "> 72 Hours", penalty: "$15 Penalty" },
      { condition: "No Show - During Shift", penalty: "$50 Penalty" },
    ];

    // Construct job response
    const jobDetails = {
      jobId: job._id,
      jobName: job.jobName,
      jobIcon: job.jobIcon || "/static/jobIcon.png",
      industry: job.industry,
      employer: {
        _id: job.company?._id,
        name: job.company?.companyLegalName || "Unknown",
        logo: job.company?.companyLogo || "/static/companyLogo.png",
      },
      outlet: {
        _id: job.outlet?._id,
        name: job.outlet?.outletName || "Unknown",
        location: job.outlet?.outletAddress || "Not Available",
        logo: job.outlet?.outletImage || "/static/Job.png",
      },
      date: moment(job.date).format("DD MMM, YY"),
      location: job.location,
      shortAddress: job.shortAddress || "Not Available",
      jobScope: job.jobScope || [],
      jobRequirements: job.jobRequirements || [],
      jobStatus, // ✅ Job status now included
      vacancyUsers: `${jobApplications.totalApplications}/${totalVacancy}`, // ✅ Vacancy count
      standbyUsers: `${jobApplications.standbyApplications}/${totalStandby}`, // ✅ Standby count
      shiftSummary, // Summary of shifts
      shifts: shiftsArray, // ✅ Flattened shift data for frontend ease
      totalWage: totalWage,
      shiftCancellationPenalties, // Static penalties
    };

    res.status(200).json({ success: true, job: jobDetails });
  } catch (error) {
    console.error("Error in getJobById:", error);
    res.status(500).json({ error: "Failed to fetch job details", details: error.message });
  }
};


// ✅ Create a new job with proper shift details
exports.createJob = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      jobName,
      employerId,
      outletId,
      date,
      location,
      industry,
      jobScope,
      jobRequirements,
      shifts,
    } = req.body;

    // Validate Employer
    const employer = await Employer.findById(employerId).session(session);
    if (!employer) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Employer not found" });
    }

    // Validate Outlet
    const outlet = await Outlet.findById(outletId).session(session);
    if (!outlet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Outlet not found" });
    }

    // Create Job Entry
    const newJob = new Job({
      jobIcon: "/static/jobIcon.png", // Default Icon
      jobName,
      company: employerId,
      outlet: outletId,
      date: new Date(date),
      location,
      shortAddress: outlet.outletAddress, // Pull address from outlet
      industry,
      outletImage: outlet.outletImage || "/static/outletImage.png",
      jobScope,
      jobRequirements,
    });

    // Save Job
    const savedJob = await newJob.save({ session });

    // Handle Shifts if provided
    let createdShifts = [];
    if (shifts && shifts.length > 0) {
      createdShifts = await Shift.insertMany(
        shifts.map((shift) => ({
          job: savedJob._id,
          startTime: shift.startTime,
          startMeridian: shift.startMeridian,
          endTime: shift.endTime,
          endMeridian: shift.endMeridian,
          vacancy: shift.vacancy,
          standbyVacancy: shift.standbyVacancy,
          duration: shift.duration,
          breakHours: shift.breakHours,
          breakType: shift.breakType,
          rateType: shift.rateType,
          payRate: shift.payRate,
          totalWage: shift.rateType === "Hourly rate" ? shift.payRate * shift.duration : shift.payRate,
        })),
        { session }
      );

      // Associate shifts with the job
      savedJob.shifts = createdShifts.map((shift) => shift._id);
      await savedJob.save({ session });
    }

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      job: savedJob,
      shifts: createdShifts,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating job:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

// ✅ Update a job properly
exports.updateJob = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { jobName, employerId, outletId, date, location, industry, jobScope, jobRequirements, shifts } = req.body;

    // Validate employer
    const employer = await Employer.findById(employerId).session(session);
    if (!employer) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Employer not found" });
    }

    // Validate outlet
    const outlet = await Outlet.findById(outletId).session(session);
    if (!outlet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Outlet not found" });
    }

    // Find the existing job
    const job = await Job.findById(req.params.id).session(session);
    if (!job) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Job not found" });
    }

    // Remove existing shifts & create new shifts
    await Shift.deleteMany({ job: job._id }).session(session);

    const createdShifts = await Shift.insertMany(
      shifts.map((shift) => ({
        job: job._id,
        startTime: shift.startTime,
        startMeridian: shift.startMeridian,
        endTime: shift.endTime,
        endMeridian: shift.endMeridian,
        vacancy: shift.vacancy,
        standbyVacancy: shift.standbyVacancy,
        duration: shift.duration,
        breakHours: shift.breakHours,
        breakType: shift.breakType,
        rateType: shift.rateType,
        payRate: shift.payRate,
        totalWage: shift.rateType === "Hourly rate" ? shift.payRate * shift.duration : shift.payRate,
      })),
      { session }
    );

    // Update job details
    job.jobName = jobName;
    job.company = employerId;
    job.outlet = outletId;
    job.date = new Date(date);
    job.location = location;
    job.industry = industry;
    job.jobScope = jobScope;
    job.jobRequirements = jobRequirements;
    job.shifts = createdShifts.map((shift) => shift._id);

    await job.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, message: "Job updated successfully", job, shifts: createdShifts });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating job:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};


// ✅ Duplicate Job API
exports.duplicateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("shifts");
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Create a copy of the job
    const newJob = new Job({
      jobIcon: job.jobIcon,
      jobName: `${job.jobName} (Copy)`,
      company: job.company,
      outlet: job.outlet,
      date: job.date,
      location: job.location,
      industry: job.industry,
      outletImage: job.outletImage,
      jobScope: job.jobScope,
      jobRequirements: job.jobRequirements,
    });

    // Save duplicated job
    const savedJob = await newJob.save();

    // Duplicate shifts
    const duplicatedShifts = await Shift.insertMany(
      job.shifts.map((shift) => ({
        job: savedJob._id,
        startTime: shift.startTime,
        startMeridian: shift.startMeridian,
        endTime: shift.endTime,
        endMeridian: shift.endMeridian,
        vacancy: shift.vacancy,
        standbyVacancy: shift.standbyVacancy,
        duration: shift.duration,
        breakHours: shift.breakHours,
        breakType: shift.breakType,
        rateType: shift.rateType,
        payRate: shift.payRate,
        totalWage: shift.totalWage,
      }))
    );

    savedJob.shifts = duplicatedShifts.map((shift) => shift._id);
    await savedJob.save();

    return res.status(201).json({ success: true, message: "Job duplicated successfully", job: savedJob });
  } catch (error) {
    console.error("Error duplicating job:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};


// ✅ Change Job Status (Activate, Deactivate, Cancel)
exports.changeJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Active", "Completed", "Cancelled", "Upcoming"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const job = await Job.findByIdAndUpdate(req.params.id, { jobStatus: status }, { new: true });
    if (!job) return res.status(404).json({ message: "Job not found" });

    res.status(200).json({ success: true, message: `Job status updated to ${status}`, job });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


// ✅ Cancel Job API
exports.cancelJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { jobStatus: "Cancelled" }, { new: true });

    if (!job) return res.status(404).json({ message: "Job not found" });

    res.status(200).json({ success: true, message: "Job Cancelled", job });
  } catch (error) {
    console.error("Error cancelling job:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


// ✅ Deactivate Job API
exports.deactivateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { jobStatus: "Deactivated" }, { new: true });

    if (!job) return res.status(404).json({ message: "Job not found" });

    res.status(200).json({ success: true, message: "Job Deactivated", job });
  } catch (error) {
    console.error("Error deactivating job:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


// ✅ Delete Job API
exports.deleteJob = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const job = await Job.findById(req.params.id).session(session);
    if (!job) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Job not found" });
    }

    // Remove linked shifts
    await Shift.deleteMany({ job: job._id }).session(session);

    // Delete the job
    await Job.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, message: "Job and associated shifts deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting job:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};
