const Job = require('../models/Job');
const Employer = require('../models/Employer');
const Outlet = require('../models/Outlet');
const User = require('../models/User');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const moment = require('moment');

// Create a new job
exports.createJob = async (req, res) => {
  try {
    const { jobName, subtitle, subtitleIcon, jobIcon, employerId, outletId, dates, location, locationCoordinates, requirements, jobStatus, postedDate } = req.body;

    // Validate employer and outlet
    const employer = await Employer.findById(employerId);
    if (!employer) return res.status(404).json({ message: 'Employer not found' });

    const outlet = await Outlet.findById(outletId);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });

    // Process dates and shifts
    const processedDates = dates.map((dateObj) => {
      const processedShifts = dateObj.shifts.map((shift) => {
        const duration =
          (new Date(`1970-01-01T${shift.endTime}Z`) - new Date(`1970-01-01T${shift.startTime}Z`)) /
            3600000 -
          shift.breakHours;
        const totalWage =
          shift.rateType === "Hourly rate" ? shift.payRate * duration : shift.payRate;

        return { ...shift, duration, totalWage };
      });

      return { date: dateObj.date, shifts: processedShifts };
    });

    const job = new Job({
      jobName,
      subtitle,
      subtitleIcon,
      jobIcon,
      employer: employerId,
      outlet: outletId,
      dates: processedDates,
      location,
      requirements,
      locationCoordinates,
      jobStatus,
      postedDate
    });

    await job.save();

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchJobs = async (req, res) => {
  try {
    const { jobName, location, status, employerId, outletId } = req.query;

    // Validate ObjectId inputs
    if (employerId && !mongoose.Types.ObjectId.isValid(employerId)) {
      return res.status(400).json({ error: "Invalid Employer ID" });
    }
    if (outletId && !mongoose.Types.ObjectId.isValid(outletId)) {
      return res.status(400).json({ error: "Invalid Outlet ID" });
    }

    // Build filters dynamically
    const filters = {};
    if (jobName) filters.jobName = { $regex: jobName, $options: "i" }; // Case-insensitive regex for jobName
    if (location) filters.location = { $regex: location, $options: "i" }; // Case-insensitive regex for location
    if (status) filters.jobStatus = status; // Exact match for job status
    if (employerId) filters.employer = mongoose.Types.ObjectId(employerId);
    if (outletId) filters.outlet = mongoose.Types.ObjectId(outletId);

    // Fetch jobs based on filters
    const jobs = await Job.find(filters)
      .populate("employer", "companyName")
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
    const { page = 1, limit = 10 } = req.query;

    // Fetch job data with selected fields
    const jobs = await Job.find({})
      .populate('employer', '_id companyName contractEndDate companyLogo')
      .populate('outlet', '_id outletName location outletImage outletType')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Get application counts for all jobs
    const applicationCounts = await Application.aggregate([
      {
        $group: {
          _id: '$jobId',
          applicationCount: { $sum: 1 },
        },
      },
    ]);

    // Map application counts
    const applicationCountMap = {};
    applicationCounts.forEach((item) => {
      applicationCountMap[item._id] = item.applicationCount;
    });

    // Helper function to extract short address before first comma
    const getShortAddress = (address) => {
      return address ? address.split(',')[0].trim() : '';
    };

    // Format jobs for UI
    const formattedJobs = jobs.map((job) => {
      const applicationCount = applicationCountMap[job._id] || 0;
      const popularity = Math.min(applicationCount * 10, 100); // Max 100%

      const totalPotentialWages = job.dates.reduce((total, date) => {
        return (
          total +
          date.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.totalWage, 0)
        );
      }, 0);

      // Calculate total pay rate
      const totalPayRate = job.dates.reduce((total, date) => {
        return (
          total +
          date.shifts.reduce((shiftTotal, shift) => {
            const effectiveHours = shift.duration - shift.breakHours;
            return shiftTotal + shift.payRate * effectiveHours;
          }, 0)
        );
      }, 0);

      const totalVacancies = job.dates.reduce((total, date) => {
        return (
          total +
          date.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.vacancy, 0)
        );
      }, 0);

      // Extract first shift's break info (assuming all shifts have the same break rules)
      const firstShift = job.dates.length > 0 && job.dates[0].shifts.length > 0 ? job.dates[0].shifts[0] : null;
      const breakHours = firstShift ? firstShift.breakHours : 0;
      const breakType = firstShift ? firstShift.breakType : "Unpaid";

      // Extract only the start times of shifts
      const shiftsAvailable = job.dates.flatMap((date) =>
        date.shifts.map((shift) => shift.startTime)
      );

      return {
        _id: job._id,
        jobName: job.jobName,
        subtitle: job.subtitle,
        location: getShortAddress(job.location),
        jobStatus: job.jobStatus,
        totalPotentialWages: `${totalPotentialWages}`,
        payRate: `$${totalPayRate}/Hr`,
        subtitleIcon: job.subtitleIcon,
        jobIcon: job.jobIcon,
        popularity: `${popularity}%`,
        postedDate: job.postedDate,
        employer: {
          companyName: job.employer.companyName,
          companyLogo: job.employer.companyLogo,
        },
        outlet: {
          outletName: job.outlet.outletName,
          outletImage: job.outlet.outletImage,
          location: getShortAddress(job.outlet.location),
          outletType: job.outlet.outletType,
        },
        shiftsAvailable, // Only includes shift start times
        breakHours, // Directly added break hours
        breakType, // Directly added break type
        showFewShiftsLeft: totalVacancies <= 5,
        showDates: job.dates.map((date) => date.date),
      };
    });

    res.status(200).json({
      success: true,
      totalJobs: await Job.countDocuments(),
      page: Number(page),
      jobs: formattedJobs,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// Get a specific job by ID

exports.getJobById = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    const applied = await Application.findOne({
      jobId: new mongoose.Types.ObjectId(req.params.id),
      userId: new mongoose.Types.ObjectId(userId),
      appliedStatus: "Applied",
    });

    const job = await Job.findById(req.params.id)
      .populate("employer", "_id companyName contractEndDate companyLogo")
      .populate("outlet", "_id outletName location outletImage outletType");

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Calculate total salary, potential wages, and total pay rate
    let totalPotentialWages = 0;
    let totalPayRate = 0;
    let totalVacancies = 0;

    const shiftsAvailable = job.dates.map((date) => {
      return {
        date: date.date,
        shifts: date.shifts.map((shift) => {
          // Ensure vacancies are not negative
          const filledVacancies = Math.max(shift.filledVacancies, 0);
          const standbyFilled = Math.max(shift.standbyFilled, 0);
          const vacancy = Math.max(shift.vacancy, 0);
          const standbyVacancy = Math.max(shift.standbyVacancy, 0);

          // Calculate effective hours (excluding break hours)
          const effectiveHours = shift.duration - shift.breakHours;

          // Update total wages and pay rate calculations
          const totalWage =
            shift.rateType === "Hourly rate"
              ? shift.payRate * effectiveHours
              : shift.payRate;

          totalPotentialWages += totalWage;
          totalPayRate += shift.payRate * effectiveHours;
          totalVacancies += vacancy;

          return {
            _id: shift._id,
            startTime: moment(shift.startTime, "HH:mm").format("hh:mm A"), // Convert to AM/PM
            endTime: moment(shift.endTime, "HH:mm").format("hh:mm A"), // Convert to AM/PM
            payRate: `$${shift.payRate}`, // Add '$' sign
            vacancy,
            standbyVacancy,
            filledVacancies,
            standbyFilled,
            duration: shift.duration,
            breakHours: shift.breakHours,
            totalWage: `$${totalWage}`, // Add '$' sign
          };
        }),
      };
    });

    // Format the response
    const formattedJob = {
      _id: job._id,
      jobName: job.jobName,
      subtitle: job.subtitle,
      subtitleIcon: job.subtitleIcon,
      jobIcon: job.jobIcon,
      jobStatus: job.jobStatus,
      postedDate: job.postedDate,
      salary: `$${totalPotentialWages}`, // Add '$' sign
      totalPotentialWages: `$${totalPotentialWages}`, // Add '$' sign
      totalPayRate: `$${totalPayRate}`, // Add '$' sign
      totalVacancies,
      applied: applied ? true : false,
      profileCompleted: user?.profileCompleted || false,
      location: job.location,
      locationCoordinates: job.locationCoordinates,
      requirements: job.requirements,
      shiftsAvailable,
      employer: {
        _id: job.employer._id,
        name: job.employer.companyName,
        companyLogo: job.employer.companyLogo,
        contractEndDate: job.employer.contractEndDate,
      },
      outlet: {
        _id: job.outlet._id,
        name: job.outlet.outletName,
        location: job.outlet.location,
        outletImage: job.outlet.outletImage,
        outletType: job.outlet.outletType,
      },
    };

    res.status(200).json(formattedJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // Check if user exists and profile is completed
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.profileCompleted) {
      return res.status(400).json({ error: 'Profile not completed. Please complete your profile first.' });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Find the specific date
    const jobDate = job.dates.find(d => {
      const storedDate = new Date(d.date).toISOString().split('T')[0];
      return storedDate === date;
    });

    if (!jobDate) return res.status(404).json({ error: 'Job date not found' });

    // Find the specific shift within the found date
    const shift = jobDate.shifts.find(shift => shift._id.toString() === shiftId);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    // Validate vacancies
    if (!isStandby && shift.filledVacancies < shift.vacancy) {
      shift.filledVacancies += 1;
    } else if (isStandby && shift.standbyFilled < shift.standbyVacancy) {
      shift.standbyFilled += 1;
    } else {
      return res.status(400).json({ error: 'No vacancies available for this shift' });
    }

    // Save the job application
    const application = new Application({
      userId,
      jobId,
      shiftId,
      date,
      isStandby,
      status: 'Ongoing',
      appliedStatus: 'Applied',
    });
    await application.save();

    // Add application reference to the user's applications array
    user.applications.push(application._id);
    await user.save();

    // Save updated job
    await job.save();

    // Create a notification for the user
    const notification = new Notification({
      userId,
      jobId,
      type: 'Job',
      title: 'Job Application Successful',
      message: `You have successfully applied for the job "${job.jobName}".`,
      isRead: false,
    });
    await notification.save();

    res.status(200).json({ message: 'Job application successful', application });
  } catch (error) {
    console.error('Error in applyForJob:', error.message);
    res.status(500).json({ error: 'Failed to apply for the job', details: error.message });
  }
};


exports.cancelApplication = async (req, res) => {
  try {
    const { applicationId, reason } = req.body;

    // Find the application
    const application = await Application.findById(applicationId);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Calculate penalty based on the time of cancellation
    const shiftStartTime = new Date(application.date).getTime();
    const now = new Date().getTime();
    const hoursToShift = (shiftStartTime - now) / (1000 * 60 * 60);

    let penalty = 0;
    if (hoursToShift < 1) {
      penalty = 50; // No-show penalty
    } else if (hoursToShift <= 24) {
      penalty = 15;
    } else if (hoursToShift <= 48) {
      penalty = 10;
    } else if (hoursToShift <= 72) {
      penalty = 5;
    }

    // Update application with cancellation details
    application.status = 'Cancelled';
    application.appliedStatus = 'Cancelled';
    application.reason = reason;
    application.penalty = penalty;
    application.cancelledAt = new Date();
    await application.save();

    // Update job and shift vacancies
    const job = await Job.findById(application.jobId);
    const jobDate = job.dates.find(d => new Date(d.date).toISOString().split('T')[0] === new Date(application.date).toISOString().split('T')[0]);
    const shift = jobDate.shifts.find(s => s._id.toString() === application.shiftId.toString());

    if (application.isStandby) {
      shift.standbyFilled -= 1;
    } else {
      shift.filledVacancies -= 1;
    }

    await job.save();

    // Notify the user
    const notification = new Notification({
      userId: application.userId,
      jobId: application.jobId,
      type: 'Job',
      title: 'Job Application Cancelled',
      message: `Your application for job ${application.jobId} has been cancelled. Penalty applied: $${penalty}.`,
    });
    await notification.save();

    res.status(200).json({
      message: 'Application cancelled successfully',
      application,
      penalty,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel application', details: error.message });
  }
};

exports.getOngoingJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch applications with job and shift details
    const applications = await Application.find({ userId, status: 'Ongoing' })
    .populate({
      path: 'jobId',
      select: 'jobName jobIcon location subtitle subtitleIcon dates outlet',
      populate: { path: 'outlet', select: 'outletImage' }, 
    })
      .lean(); 

    // Map through applications to construct ongoingJobs array
    const ongoingJobs = applications.map((app) => {
      // Find the shift from the job's dates using shiftId
      const job = app.jobId;
      let shiftDetails = null;

      // Iterate through dates to find the matching shift
      for (const date of job.dates) {
        shiftDetails = date.shifts.find((shift) => shift._id.equals(app.shiftId));
        if (shiftDetails) break;
      }

      // If no shift found, skip this application
      if (!shiftDetails) return null;

      const currentDate = moment().startOf('day');
      const jobDate = moment(app.date).startOf('day');
      const daysRemaining = jobDate.diff(currentDate, 'days');

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
        jobStatus: 'Ongoing',
        appliedAt: app.appliedAt,
        daysRemaining: daysRemaining >= 0 ? daysRemaining : 0, // Ensure it's not negative
      };
    });

    // Filter out any null entries in case of unmatched shifts
    const filteredJobs = ongoingJobs.filter((job) => job !== null);

    res.status(200).json({ success: true, jobs: filteredJobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getJobDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Find the application by ID
    const application = await Application.findById(applicationId)
      .populate({
        path: 'jobId',
        select: 'jobName jobIcon location locationCoordinates subtitle subtitleIcon dates outlet requirements employer',
        populate: [
          { path: 'outlet', select: 'outletName location outletImage outletType' },
          { path: 'employer', select: 'companyName companyLogo companyImage contractEndDate' },
        ],
      })
      .lean(); // Convert documents to plain objects for easier manipulation

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // Extract job details
    const job = application.jobId;
    let shiftDetails = null;

    // Find the relevant shift
    for (const date of job.dates) {
      if (new Date(date.date).toISOString().split('T')[0] === new Date(application.date).toISOString().split('T')[0]) {
        shiftDetails = date.shifts.find((shift) => shift._id.toString() === application.shiftId.toString());
        break;
      }
    }

    if (!shiftDetails) {
      return res.status(404).json({ success: false, error: 'Shift not found' });
    }

    // Construct response
    const detailedJob = {
      applicationId: application._id,
      jobId: job._id,
      jobName: job.jobName,
      jobIcon: job.jobIcon,
      subtitle: job.subtitle,
      subtitleIcon: job.subtitleIcon,
      location: job.location,
      locationCoordinates: job.locationCoordinates,
      salary: shiftDetails.totalWage,
      duration: `${shiftDetails.duration || 0} hrs`,
      ratePerHour: `$${shiftDetails.payRate || 0}/hr`,
      shiftDate: application.date,
      shiftStartTime: shiftDetails.startTime,
      shiftEndTime: shiftDetails.endTime,
      breakType: shiftDetails.breakType,
      breakDuration: `${shiftDetails.breakHours || 0} hrs`,
      jobScope: job.requirements?.jobScopeDescription || [],
      jobRequirements: job.requirements?.jobRequirements || [],
      penalty: application.penalty || 0, // Include penalty
      reason: application.reason || '', // Include reason for cancellation
      shiftsAvailable: job.dates.map((date) => ({
        date: date.date,
        shifts: date.shifts.map((shift) => ({
          _id: shift._id,
          startTime: shift.startTime,
          endTime: shift.endTime,
          payRate: shift.payRate,
          vacancy: shift.vacancy,
          standbyVacancy: shift.standbyVacancy,
          filledVacancies: shift.filledVacancies,
          standbyFilled: shift.standbyFilled,
          duration: shift.duration,
          breakHours: shift.breakHours,
          totalWage: shift.totalWage,
        })),
      })),
      employer: {
        _id: job.employer?._id,
        name: job.employer?.companyName,
        companyLogo: job.employer?.companyLogo,
        contractEndDate: job.employer?.contractEndDate,
      },
      outlet: {
        _id: job.outlet?._id,
        name: job.outlet?.outletName,
        location: job.outlet?.location,
        outletImage: job.outlet?.outletImage,
        outletType: job.outlet?.outletType,
      },
    };

    res.status(200).json({ success: true, job: detailedJob });
  } catch (error) {
    console.error('Error fetching job details:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch job details', details: error.message });
  }
};



exports.getCompletedJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch applications with job and shift details
    const applications = await Application.find({ userId, status: 'Completed' })
    .populate({
      path: 'jobId',
      select: 'jobName jobIcon location subtitle subtitleIcon dates outlet',
      populate: { path: 'outlet', select: 'outletImage' }, // Populate outletImage
    })
      .lean(); // Convert documents to plain objects for easier manipulation

    // Map through applications to construct completedJobs array
    const completedJobs = applications.map((app) => {
      // Find the shift from the job's dates using shiftId
      const job = app.jobId;
      let shiftDetails = null;

      // Iterate through dates to find the matching shift
      for (const date of job.dates) {
        shiftDetails = date.shifts.find((shift) => shift._id.equals(app.shiftId));
        if (shiftDetails) break;
      }

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

    // Fetch applications with job and shift details
    const applications = await Application.find({ userId, status: 'Cancelled' })
    .populate({
      path: 'jobId',
      select: 'jobName jobIcon location subtitle subtitleIcon dates outlet',
      populate: { path: 'outlet', select: 'outletImage' }, // Populate outletImage
    })
      .lean(); // Convert documents to plain objects for easier manipulation

    // Map through applications to construct cancelledJobs array
    const cancelledJobs = applications.map((app) => {
      // Find the shift from the job's dates using shiftId
      const job = app.jobId;
      let shiftDetails = null;

      // Iterate through dates to find the matching shift
      for (const date of job.dates) {
        shiftDetails = date.shifts.find((shift) => shift._id.equals(app.shiftId));
        if (shiftDetails) break;
      }

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
        jobStatus: 'Cancelled',
        appliedAt: app.appliedAt,
        daysRemaining: "",
      };
    });

    // Filter out any null entries in case of unmatched shifts
    const filteredJobs = cancelledJobs.filter((job) => job !== null);

    res.status(200).json({ success: true, jobs: filteredJobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
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

// exports.getOngoingShifts = async (req, res) => {
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


// exports.getCompletedShifts = async (req, res) => {
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


// exports.getCanceledShifts = async (req, res) => {
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
