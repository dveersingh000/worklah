const Job = require('../models/Job');
const Employer = require('../models/Employer');
const Outlet = require('../models/Outlet');
const Shift = require("../models/Shift");
const User = require('../models/User');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const moment = require('moment');
const path = require("path");
const multer = require("multer");

// Create a new job with shifts
exports.createJob = async (req, res) => {
  try {
    const {
      jobName,
      company,
      outlet,
      date,
      location,
      shortAddress,
      industry,
      jobScope,
      jobRequirements,
      shifts
    } = req.body;

    // Validate Employer
    const employerExists = await Employer.findById(company);
    if (!employerExists) {
      return res.status(404).json({ message: "Employer not found" });
    }

    // Validate Outlet
    const outletExists = await Outlet.findById(outlet);
    if (!outletExists) {
      return res.status(404).json({ message: "Outlet not found" });
    }

    // Create Job Entry
    const newJob = new Job({
      jobIcon: "/static/jobIcon.png", // Default Icon
      jobName,
      company,
      outlet,
      date: new Date(date),
      location,
      shortAddress, 
      industry,
      outletImage: outletExists.outletImage || "/static/outletImage.png",
      jobScope,
      jobRequirements
    });

    // Save Job
    const savedJob = await newJob.save();

    // Handle Shifts if provided
    let createdShifts = [];
    if (shifts && shifts.length > 0) {
      createdShifts = await Shift.insertMany(
        shifts.map(shift => ({
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
          totalWage: shift.payRate * shift.duration,
        }))
      );

      // Associate shifts with the job
      savedJob.shifts = createdShifts.map(shift => shift._id);
      await savedJob.save();
    }

    return res.status(201).json({ message: "Job created successfully", job: savedJob, shifts: createdShifts });
  } catch (error) {
    console.error("Error creating job:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

exports.searchJobs = async (req, res) => {
  try {
    const { jobName, employerId, selectedDate } = req.query;

    const filters = {};

    // ✅ Search by job name (case-insensitive)
    if (jobName) filters.jobName = { $regex: jobName, $options: "i" };

    // ✅ Filter by employer ID (Only if valid ObjectId)
    if (employerId && mongoose.Types.ObjectId.isValid(employerId)) {
      filters.employer = mongoose.Types.ObjectId(employerId);
    }

    // ✅ Filter jobs by date (Assuming job's shift has a "date" field)
    if (selectedDate) {
      filters["shifts.date"] = selectedDate; // Ensure the date format matches
    }

    const jobs = await Job.find(filters)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName location outletImage");

    res.status(200).json({ success: true, jobs });
  } catch (error) {
    console.error("Error in searchJobs:", error);
    res.status(500).json({
      error: "Failed to search jobs",
      details: error.message,
    });
  }
};


// Get all jobs with pagination
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress")
      .populate("shifts");

    const jobsWithPlanData = jobs.map((job) => {
      const shifts = job.shifts || [];
      
      if (shifts.length === 0) {
        return {
          ...job.toObject(),
          outletTiming: "Not Available",
          estimatedWage: 0,
          payRatePerHour: "Not Available",
          slotLabel: "New",
        };
      }

      // Get the 1st shift start & end time
      const firstShift = shifts[0];
      const outletTiming = `${firstShift.startTime}${firstShift.startMeridian} - ${firstShift.endTime}${firstShift.endMeridian}`;

      // Calculate total estimated wage (sum of all shifts)
      const estimatedWage = shifts.reduce((sum, shift) => sum + shift.totalWage, 0);

      // Get a distinct pay rate per hour from shifts (assumes uniform rate)
      const payRatePerHour = `$${firstShift.payRate}/Hr`;

      // Determine slot label logic
      let slotLabel = "New";
      const totalVacancies = shifts.reduce((sum, shift) => sum + shift.vacancy, 0);
      const totalStandby = shifts.reduce((sum, shift) => sum + shift.standbyVacancy, 0);

      if (totalVacancies >= 10) {
        slotLabel = "Trending";
      } else if (totalVacancies > 3) {
        slotLabel = "Limited Slots";
      } else if (totalVacancies === 1) {
        slotLabel = "Last Slot";
      } else if (totalVacancies === 0 && totalStandby > 0) {
        slotLabel = "Standby Slot Available";
      }

      return {
        ...job.toObject(),
        outletTiming,
        estimatedWage,
        payRatePerHour,
        slotLabel,
        shortAddress: job.shortAddress || "Not Available",
      };
    });

    res.status(200).json({ jobs: jobsWithPlanData });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


//Job Listings 
exports.getJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const jobs = await Job.find()
      .select("jobName location popularity company requirements shifts status image dates potentialWages duration payRate createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalJobs = await Job.countDocuments();

    res.status(200).json({
      jobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page,
      totalJobs
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

// Get a specific job by ID

exports.getJobById = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    // Find the user
    const user = await User.findById(userId);

    // Check if the user has already applied for this job
    const applied = await Application.findOne({
      jobId: new mongoose.Types.ObjectId(jobId),
      userId: new mongoose.Types.ObjectId(userId),
      appliedStatus: "Applied",
    });

    // Fetch the job details
    const job = await Job.findById(jobId)
      .populate("company", "companyLegalName companyLogo")
      .populate("outlet", "outletName outletAddress outletImage");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Fetch shifts for this job
    const shifts = await Shift.find({ job: jobId });

    // Organize shifts by date and apply standby logic
    const shiftsByDate = {};
    shifts.forEach(shift => {
      const shiftDate = moment(shift.date).format("YYYY-MM-DD");
      
      // Determine standby availability
      const isFullyBooked = shift.appliedShifts >= shift.vacancy;
      const hasStandbyVacancies = shift.standbyVacancy > 0;

      if (!shiftsByDate[shiftDate]) {
        shiftsByDate[shiftDate] = [];
      }

      // Include shift only if not fully booked OR if standby vacancies exist
      if (!isFullyBooked || hasStandbyVacancies) {
        shiftsByDate[shiftDate].push({
          id: shift._id,
          startTime: moment(shift.startTime, "HH:mm").format("hh:mm A"),
          endTime: moment(shift.endTime, "HH:mm").format("hh:mm A"),
          duration: shift.duration,
          breakDuration: shift.breakHours,
          breakPaid: shift.breakType,
          hourlyRate: shift.rateType,
          payRate: `$${shift.payRate}`,
          totalWage: `$${shift.payRate * shift.duration}`,
          vacancy: `${shift.appliedShifts.length}/${shift.vacancy}`,
          standbyVacancy: shift.standbyVacancy > 0 ? 
                      `${shift.appliedShifts.length}/${shift.standbyVacancy}` : "-/-",
          isSelected: shift.appliedShifts.includes(userId),
          // appliedShifts: shift.appliedShifts || 0,
          // availableShifts: shift.vacancy - shift.appliedShifts, 
          standbyAvailable: hasStandbyVacancies,
          standbyMessage: hasStandbyVacancies 
            ? "This shift is fully booked. You can apply as a standby worker."
            : null,
        });
      }
    });

    // Collect all available job dates
    const availableShiftsData = Object.keys(shiftsByDate).map(date => ({
      date: moment(date).format("D ddd MMM"),
      appliedShifts: shiftsByDate[date].reduce((sum, shift) => 
        sum + (Array.isArray(shift.appliedShifts) && shift.appliedShifts.includes(userId) ? 1 : 0), 0), 
      availableShifts: shiftsByDate[date].length,
      shifts: shiftsByDate[date],
    }));

    // Calculate total potential wage and total pay rate
    // const totalPotentialWages = shifts.reduce((sum, shift) => sum + (shift.payRate * shift.duration), 0);
    // const totalPayRate = shifts.reduce((sum, shift) => sum + shift.payRate, 0);
    const totalVacancies = shifts.reduce((sum, shift) => sum + shift.vacancy, 0);

    // Final formatted job response
    const formattedJob = {
      id: job._id,
      jobName: job.jobName,
      jobIcon: job.jobIcon,
      employer: {
        id: job.company._id,
        name: job.company.companyLegalName,
        logo: job.company.companyLogo,
      },
      outlet: {
        id: job.outlet._id,
        name: job.outlet.outletName,
        address: job.outlet.outletAddress,
        image: job.outlet.outletImage,
      },
      location: job.location,
      // industry: job.industry,
      jobScope: job.jobScope,
      jobRequirements: job.jobRequirements,
      // salary: `$${totalPotentialWages}`,
      // totalPotentialWages: `$${totalPotentialWages}`,
      // totalPayRate: `$${totalPayRate}`,
      totalVacancies,
      applied: applied ? true : false,
      profileCompleted: user?.profileCompleted || false,
      availableShiftsData,
      jobCategory: job.industry,
      standbyFeature: true, // Indicates if standby is available for any shift
      standbyDisclaimer:
        "Applying for a standby shift means you will only be activated if a vacancy arises. You will be entitled to an additional $10 upon shift completion. No-shows will result in penalties.",
    };

    res.status(200).json({ job: formattedJob });
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};



// Update a job
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!job) return res.status(404).json({ message: 'Job not found' });

    res.status(200).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a job
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) return res.status(404).json({ message: 'Job not found' });

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.applyForJob = async (req, res) => {
  try {
    const { userId, jobId, shiftId, date, isStandby } = req.body;

    // ✅ Validate User
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.profileCompleted) {
      return res.status(400).json({
        error: "Profile not completed. Please complete your profile first.",
      });
    }

    // ✅ Validate Job
    const job = await Job.findById(jobId).populate("shifts");
    if (!job) return res.status(404).json({ error: "Job not found" });

    // ✅ Validate Shift
    const shift = await Shift.findById(shiftId);
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    // ✅ Ensure shift belongs to this job
    // if (!job.shifts.includes(shiftId)) {
    //   return res.status(400).json({ error: "Shift does not belong to this job" });
    // }

    // ✅ Validate Vacancy & Standby Logic
    if (!isStandby) {
      // Apply for a normal vacancy
      if (shift.vacancy > shift.appliedShifts.length) {
        shift.appliedShifts.push(userId);
      } else {
        return res.status(400).json({ error: "No vacancies available" });
      }
    } else {
      // Apply for Standby ONLY if the shift is fully booked
      if (shift.appliedShifts.length >= shift.vacancy && shift.standbyVacancy > 0) {
        shift.standbyVacancy -= 1; // Reduce standby slots
      } else {
        return res.status(400).json({ error: "Standby not available for this shift" });
      }
    }

    // ✅ Save Shift Changes
    await shift.save();

    // ✅ Create Application Entry
    const application = new Application({
      userId,
      jobId,
      shiftId,
      date,
      isStandby,
      status: "Upcoming",
      appliedStatus: "Applied",
    });

    await application.save();

    // ✅ Link Application to User
    user.applications.push(application._id);
    await user.save();

    // ✅ Create Notification for User
    const notification = new Notification({
      userId,
      jobId,
      type: "Job",
      title: "Job Application Successful",
      message: `You have successfully applied for the shift on ${date} (${shift.startTime} - ${shift.endTime}).`,
      isRead: false,
    });

    await notification.save();

    res.status(200).json({ message: "Shift booking successful", application });
  } catch (error) {
    console.error("Error in applyForJob:", error.message);
    res.status(500).json({
      error: "Failed to apply for the job",
      details: error.message,
    });
  }
};



// ✅ Configure Multer for Medical Certificate Upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/mc-certificates/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage: storage }).single("medicalCertificate");

exports.cancelApplication = async (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(500).json({ error: "File upload error", details: err.message });
      }

      const { applicationId, reason, describedReason } = req.body;
      let medicalCertificate = req.file ? `/uploads/mc-certificates/${req.file.filename}` : null;

      // ✅ Validate reason selection
      const validReasons = ["Medical", "Emergency", "Personal Reason", "Transport Issue", "Others"];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({ error: "Invalid cancellation reason" });
      }

      // ✅ Find Application
      const application = await Application.findById(applicationId);
      if (!application) return res.status(404).json({ error: "Application not found" });

      // ✅ Find Shift Details
      const shift = await Shift.findById(application.shiftId);
      if (!shift) return res.status(404).json({ error: "Shift not found" });

      // ✅ Calculate hours before shift start
      const shiftStart = moment(`${shift.startTime} ${shift.startMeridian}`, "hh:mm A");
      const now = moment();
      const hoursBeforeStart = shiftStart.diff(now, "hours");

      // ✅ Penalty Rules (Same as `getCancelledJobs` API)
      const penaltyRules = [
        { threshold: 48, penalty: 0, label: "> 48 Hours (No Penalty)" },
        { threshold: 24, penalty: 5, label: "> 24 Hours (1st Time)" },
        { threshold: 12, penalty: 10, label: "> 12 Hours (2nd Time)" },
        { threshold: 6, penalty: 15, label: "> 6 Hours (3rd Time)" },
        { threshold: 0, penalty: 50, label: "< 6 Hours (Last Minute)" },
      ];
      const penaltyData = penaltyRules.find((rule) => hoursBeforeStart >= rule.threshold) || {
        penalty: 50,
        label: "Immediate Cancellation",
      };

      // ✅ Update Application with Cancellation Details
      application.status = "Cancelled";
      application.appliedStatus = "Cancelled";
      application.reason = reason;
      application.describedReason = describedReason || "No additional details provided";
      application.penalty = penaltyData.penalty;
      application.cancelledAt = new Date();
      application.cancellationCount = (application.cancellationCount || 0) + 1; // ✅ Increment cancellation count

      if (reason === "Medical" && medicalCertificate) {
        application.medicalCertificate = medicalCertificate;
      }

      await application.save();

      // ✅ Update Job & Shift Vacancies
      const job = await Job.findById(application.jobId);
      const jobDate = job.dates.find(
        (d) => moment(d.date).format("YYYY-MM-DD") === moment(application.date).format("YYYY-MM-DD")
      );
      const shiftInJob = jobDate.shifts.find((s) => s._id.toString() === application.shiftId.toString());

      if (application.isStandby) {
        shiftInJob.standbyFilled -= 1;
      } else {
        shiftInJob.filledVacancies -= 1;
      }

      await job.save();

      // ✅ Send Cancellation Notification
      const notification = new Notification({
        userId: application.userId,
        jobId: application.jobId,
        type: "Job",
        title: "Job Application Cancelled",
        message: `Your application for job ${application.jobId} has been cancelled. Penalty applied: $${penaltyData.penalty}.`,
      });
      await notification.save();

      // ✅ Response
      res.status(200).json({
        message: "Application cancelled successfully",
        application: {
          status: "Cancelled",
          reason,
          describedReason: application.describedReason,
          penalty: penaltyData.penalty,
          penaltyLabel: penaltyData.label,
          medicalCertificate,
          cancelledAt: moment(application.cancelledAt).format("DD MMM, YY"),
        },
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel application", details: error.message });
  }
};

exports.getJobDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // ✅ Fetch Application Details with Job & Shift
    const application = await Application.findById(applicationId)
      .populate({
        path: "jobId",
        select:
          "jobName jobIcon location shortAddress industry outlet company jobScope jobRequirements date",
        populate: [
          { path: "outlet", select: "outletName outletAddress outletImage outletType" },
          { path: "company", select: "companyLegalName companyLogo contractEndDate" },
        ],
      })
      .populate({
        path: "shiftId",
        select:
          "startTime startMeridian endTime endMeridian duration payRate totalWage breakHours breakType vacancy standbyVacancy",
      })
      .lean();

    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }

    const job = application.jobId;
    const shift = application.shiftId;

    if (!job || !shift) {
      return res.status(404).json({ success: false, error: "Job or Shift not found" });
    }

    // ✅ Format Job Dates
    const formattedJobDates = job.date
      ? moment(job.date).format("DD MMM, YYYY") // Example: "02 Mar, 2025"
      : null;

    // ✅ Calculate hours before shift start
    const shiftStart = moment(`${shift.startTime} ${shift.startMeridian}`, "hh:mm A");
    const cancelledAt = moment(application.cancelledAt);
    const hoursBeforeStart = shiftStart.diff(cancelledAt, "hours");

    // ✅ Penalty Rules (Same as `getCancelledJobs` API)
    const penaltyRules = [
      { threshold: 48, penalty: 0, label: "> 48 Hours (No Penalty)" },
      { threshold: 24, penalty: 5, label: "> 24 Hours (1st Time)" },
      { threshold: 12, penalty: 10, label: "> 12 Hours (2nd Time)" },
      { threshold: 6, penalty: 15, label: "> 6 Hours (3rd Time)" },
      { threshold: 0, penalty: 50, label: "< 6 Hours (Last Minute)" },
    ];
    const penaltyData = penaltyRules.find((rule) => hoursBeforeStart >= rule.threshold) || {
      penalty: 50,
      label: "Immediate Cancellation",
    };

    // ✅ Construct API Response
    const detailedJob = {
      applicationId: application._id,
      jobId: job._id,
      jobName: job.jobName,
      jobIcon: job.jobIcon || "/static/default-job-icon.png",
      industry: job.industry,
      location: job.location,
      shortAddress: job.shortAddress,
      jobScope: job.jobScope,
      jobRequirements: job.jobRequirements,
      status: application.status, // ✅ Job Status (Upcoming, Completed, Cancelled, No-Show)
      jobDates: formattedJobDates,

      // ✅ Employer Details
      employer: {
        _id: job.company?._id,
        name: job.company?.companyLegalName || "N/A",
        companyLogo: job.company?.companyLogo || "/static/company-logo.png",
        contractEndDate: job.company?.contractEndDate || "",
      },

      // ✅ Outlet Details
      outlet: {
        _id: job.outlet?._id,
        name: job.outlet?.outletName || "N/A",
        location: job.outlet?.outletAddress || "",
        outletImage: job.outlet?.outletImage || "/static/outlet.png",
        outletType: job.outlet?.outletType || "",
      },

      // ✅ Shift Details
      shift: {
        startTime: moment(shift.startTime, "HH:mm").format("hh:mm A"),
        endTime: moment(shift.endTime, "HH:mm").format("hh:mm A"),
        duration: shift.duration,
        payRate: `$${shift.payRate}`,
        totalWage: `$${shift.payRate * shift.duration}`,
        breakPaid: shift.breakType,
        breakDuration: `${shift.breakHours} hrs`,
        vacancy: shift.vacancy,
        standbyVacancy: shift.standbyVacancy,
      },

      // ✅ Clock-in & Clock-out Data (for Completed Jobs)
      clockInTime: application.clockInTime || null,
      clockOutTime: application.clockOutTime || null,
      checkInLocation: application.checkInLocation || null,

      // ✅ Penalty & Cancellation Reason (for Cancelled/No-Show Jobs)
      penalty: penaltyData.penalty > 0 ? `- $${penaltyData.penalty}` : "No Penalty",
      penaltyLabel: penaltyData.label,
      reason: application.reason || "No Reason Provided",
      describedReason: application.describedReason || "No additional details provided",
      medicalCertificate: application.medicalCertificate || null,
      cancellationCount: application.cancellationCount || 0, // ✅ Tracks total cancellations by user
    };

    res.status(200).json({ success: true, job: detailedJob });
  } catch (error) {
    console.error("Error fetching job details:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch job details",
      details: error.message,
    });
  }
};


exports.getOngoingJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    // ✅ Fetch applications with job and shift details
    const applications = await Application.find({ userId, status: "Upcoming" })
      .populate({
        path: "jobId",
        select: "jobName jobIcon location outlet",
        populate: { path: "outlet", select: "outletName outletImage" },
      })
      .populate({
        path: "shiftId",
        select: "startTime startMeridian endTime endMeridian duration payRate totalWage",
      })
      .lean();

    // ✅ Construct Ongoing Jobs Array
    const ongoingJobs = applications.map((app) => {
      const job = app.jobId;
      const shift = app.shiftId;

      if (!job || !shift) return null;

      const currentDate = moment().startOf("day");
      const jobDate = moment(app.date).startOf("day");
      const daysRemaining = Math.max(moment(app.date).diff(moment(), "days"), 0);

      return {
        applicationId: app._id,
        jobName: job.jobName,
        jobIcon: job.jobIcon,
        outletName: job.outlet?.outletName || "N/A",
        outletImage: job.outlet?.outletImage || "/static/Job.png",
        location: job.location,
        shiftStartTime: `${shift.startTime} ${shift.startMeridian}`,
        shiftEndTime: `${shift.endTime} ${shift.endMeridian}`,
        totalWage: `$${shift.totalWage || 0}`,
        duration: `${shift.duration || 0} hrs`,
        ratePerHour: `$${shift.payRate || 0}/hr`,
        jobStatus: "Upcoming",
        appliedAt: app.appliedAt,
        daysRemaining,
        jobDate: moment(app.date).format("DD MMM, YY"), // Include date for UI grouping
      };
    });

    const filteredJobs = ongoingJobs.filter((job) => job !== null);

    res.status(200).json({ success: true, jobs: filteredJobs });
  } catch (error) {
    console.error("Error fetching ongoing jobs:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch ongoing jobs." });
  }
};


exports.getCompletedJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch applications with job and shift details
    const applications = await Application.find({ userId, status: 'Completed' })
    .populate({
      path: 'jobId',
      select: 'jobName jobIcon location subtitle subtitleIcon outlet',
      populate: { path: 'outlet', select: 'outletImage' }, // Populate outletImage
    })
      .lean(); // Convert documents to plain objects for easier manipulation

    // Map through applications to construct completedJobs array
    const completedJobs = applications.map((app) => {
      // Find the shift from the job's dates using shiftId
      const job = app.jobId;
      let shiftDetails = null;

      // Iterate through dates to find the matching shift
      // for (const date of job.dates) {
      //   shiftDetails = date.shifts.find((shift) => shift._id.equals(app.shiftId));
      //   if (shiftDetails) break;
      // }

      // If no shift found, skip this application
      if (!shiftDetails) return null;

      return {
        applicationId: app._id,
        jobName: job.jobName,
        jobIcon: job.jobIcon,
        subtitle: job.subtitle,
        subtitleIcon: job.subtitleIcon,
        location: job.location,
        outletImage: job.outlet?.outletImage,
        salary: shiftDetails.totalWage,
        duration: `${shiftDetails.duration || 0} hrs`,
        ratePerHour: `$${shiftDetails.payRate || 0}/hr`,
        jobStatus: 'Completed',
        appliedAt: app.appliedAt,
        daysRemaining: 0,
      };
    });

    // Filter out any null entries in case of unmatched shifts
    const filteredJobs = completedJobs.filter((job) => job !== null);

    res.status(200).json({ success: true, jobs: filteredJobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCancelledJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    // ✅ Fetch cancelled applications with job and shift details
    const applications = await Application.find({ userId, status: "Cancelled" })
      .populate({
        path: "jobId",
        select: "jobName jobIcon location outlet",
        populate: { path: "outlet", select: "outletName outletImage" },
      })
      .populate({
        path: "shiftId",
        select:
          "startTime startMeridian endTime endMeridian duration payRate totalWage breakHours breakType",
      })
      .lean();

    // ✅ Penalty rules mapping based on cancellation time
    const penaltyRules = [
      { threshold: 48, penalty: 0, label: "> 48 Hours (No Penalty)" },
      { threshold: 24, penalty: 5, label: "> 24 Hours (1st Time)" },
      { threshold: 12, penalty: 10, label: "> 12 Hours (2nd Time)" },
      { threshold: 6, penalty: 15, label: "> 6 Hours (3rd Time)" },
      { threshold: 0, penalty: 50, label: "< 6 Hours (Last Minute)" },
    ];

    // ✅ Construct Cancelled Jobs Array
    const cancelledJobs = applications.map((app) => {
      const job = app.jobId;
      const shift = app.shiftId;

      if (!job || !shift) return null; // Skip if missing job or shift details

      // ✅ Calculate hours before shift start time
      const shiftStart = moment(`${shift.startTime} ${shift.startMeridian}`, "hh:mm A");
      const cancelledAt = moment(app.cancelledAt);
      const hoursBeforeStart = shiftStart.diff(cancelledAt, "hours");

      // ✅ Determine applicable penalty
      const penaltyData = penaltyRules.find((rule) => hoursBeforeStart >= rule.threshold) || {
        penalty: 50,
        label: "Immediate Cancellation",
      };

      return {
        applicationId: app._id,
        jobName: job.jobName,
        jobIcon: job.jobIcon,
        outletName: job.outlet?.outletName || "N/A",
        outletImage: job.outlet?.outletImage || "/static/Job.png",
        location: job.location,
        shiftStartTime: `${shift.startTime} ${shift.startMeridian}`,
        shiftEndTime: `${shift.endTime} ${shift.endMeridian}`,
        duration: `${shift.duration || 0} hrs`,
        ratePerHour: `$${shift.payRate || 0}/hr`,
        totalWage: `$${shift.totalWage || 0}`,
        breakDuration: `${shift.breakHours || 0} hr`,
        breakType: shift.breakType || "Unpaid",
        penalty: penaltyData.penalty > 0 ? `- $${penaltyData.penalty}` : "No Penalty",
        penaltyLabel: penaltyData.label, // ✅ New field for UI display
        reason: app.reason || "No Reason Provided",
        jobStatus: "Cancelled",
        cancelledAt: moment(app.cancelledAt).format("DD MMM, YY"), // Standardized date format
      };
    });

    // ✅ Filter out null entries & sort by cancellation date
    const filteredJobs = cancelledJobs.filter((job) => job !== null);
    const sortedJobs = filteredJobs.sort((a, b) => moment(b.cancelledAt).diff(moment(a.cancelledAt)));

    res.status(200).json({ success: true, jobs: sortedJobs });
  } catch (error) {
    console.error("Error fetching cancelled jobs:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch cancelled jobs." });
  }
};

exports.markApplicationCompleted = async (req, res) => {
  try {
    const { applicationId } = req.body;

    // Find the application by ID
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Ensure the application is currently ongoing
    if (application.status !== 'Ongoing') {
      return res.status(400).json({ error: 'Application is not in Ongoing status' });
    }

    // Update application status to Completed
    application.status = 'Completed';
    application.completedAt = new Date();
    await application.save();

    // Update the job and shift data if necessary
    const job = await Job.findById(application.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Find the relevant date and shift
    const jobDate = job.dates.find(d => new Date(d.date).toISOString().split('T')[0] === new Date(application.date).toISOString().split('T')[0]);
    const shift = jobDate?.shifts.find(s => s._id.toString() === application.shiftId.toString());

    if (!jobDate || !shift) {
      return res.status(404).json({ error: 'Shift not found for the specified application' });
    }

    // Adjust shift vacancies if applicable
    if (application.isStandby && shift.standbyFilled > 0) {
      shift.standbyFilled -= 1;
    } else if (!application.isStandby && shift.filledVacancies > 0) {
      shift.filledVacancies -= 1;
    }

    await job.save();

    // Notify the user
    const notification = new Notification({
      userId: application.userId,
      jobId: application.jobId,
      type: 'Job',
      title: 'Job Completed',
      message: `Your application for job "${job.jobName}" has been marked as Completed.`,
      isRead: false,
    });
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Application marked as Completed successfully',
      application,
    });
  } catch (error) {
    console.error('Error in markApplicationCompleted:', error.message);
    res.status(500).json({ error: 'Failed to mark application as completed', details: error.message });
  }
};

// exports.getOngoingJobs = async (req, res) => {
//   try {
//     const ongoingShifts = [
//       {
//         jobName: "Waiter",
//         jobIcon: "/static/jobIcon.png",
//         subtitle: "Food Dynasty (United Square)",
//         subtitleIcon: "/static/subTitleIcon.png",
//         outletImage: "/static/Job.png",
//         location: "Food Dynasty (United Square)",
//         duration: "3 Hrs",
//         salary: "$36",
//       },
//     ];

//     res.status(200).json({
//       success: true,
//       shifts: ongoingShifts,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };


// exports.getCompletedJobs = async (req, res) => {
//   try {
//     const completedShifts = [
//       {
//         jobName: "Waiter",
//         jobIcon: "/static/jobIcon.png",
//         subtitle: "Food Dynasty (United Square)",
//         subtitleIcon: "/static/subTitleIcon.png",
//         outletImage: "/static/Job.png",
//         location: "Food Dynasty (United Square)",
//         duration: "3 Hrs",
//         salary: "$36",
//         payRate: "$12/hr",
//         status: "Completed",
//       },
//     ];

//     res.status(200).json({
//       success: true,
//       shifts: completedShifts,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };


// exports.getCancelledJobs = async (req, res) => {
//   try {
//     const canceledShifts = [
//       {
//         jobName: "Waiter",
//         jobIcon: "/static/jobIcon.png",
//         subtitle: "Food Dynasty (United Square)",
//         subtitleIcon: "/static/subTitleIcon.png",
//         outletImage: "/static/Job.png",
//         location: "Food Dynasty (United Square)",
//         duration: "3 Hrs",
//         salary: "$36",
//         payRate: "$12/hr",
//         status: "Cancelled",
//       },
//     ];

//     res.status(200).json({
//       success: true,
//       shifts: canceledShifts,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

exports.getLinkedBanks = async (req, res) => {
  try {
    const banks = [
      {
        bankId: "BANK123",
        bankName: "DBS",
        accountNumber: "**** 3456",
        linked: true,
      },
      {
        bankId: "BANK124",
        bankName: "OCBC",
        accountNumber: "**** 5678",
        linked: false,
      },
    ];

    res.status(200).json({
      success: true,
      banks,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.addBank = async (req, res) => {
  try {
    const { bankName, accountNumber } = req.body;

    // Dummy response for adding a bank
    const bank = {
      bankId: "BANK125",
      bankName,
      accountNumber,
      linked: true,
    };

    res.status(201).json({
      success: true,
      message: "Bank linked successfully.",
      bank,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getWalletBalance = async (req, res) => {
  try {
    const walletBalance = 4553; // Dummy balance
    res.status(200).json({
      success: true,
      balance: walletBalance,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addCashout = async (req, res) => {
  try {
    const { amount, bankId } = req.body;

    // Dummy response for cashout request
    const transaction = {
      transactionId: "TRANS003",
      type: "Cashout",
      amount: -amount,
      fee: -1.5,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      message: "Cash out request successfully created.",
      transaction,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    // Dummy data
    const transactions = [
      {
        transactionId: "TRANS001",
        type: "Cashout",
        amount: -49.50,
        fee: -0.60,
        timestamp: "2024-06-07T15:10:00Z",
      },
      {
        transactionId: "TRANS002",
        type: "Received",
        amount: 49.50,
        fee: 0,
        timestamp: "2024-06-07T15:10:00Z",
      },
    ];

    const walletBalance = 4553; // Dummy wallet balance

    res.status(200).json({
      success: true,
      walletBalance,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
