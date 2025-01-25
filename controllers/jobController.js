const Job = require('../models/Job');
const Employer = require('../models/Employer');
const Outlet = require('../models/Outlet');
const User = require('../models/User');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Create a new job
exports.createJob = async (req, res) => {
  try {
    const { jobName, subtitle, jobIcon, employerId, outletId, dates, location, locationCoordinates, requirements, jobStatus } = req.body;

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
      jobIcon,
      employer: employerId,
      outlet: outletId,
      dates: processedDates,
      location,
      requirements,
      locationCoordinates,
      jobStatus
    });

    await job.save();

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchJobs = async (req, res) => {
  try {
    const { jobName, location, status } = req.query;

    // Build filters dynamically
    const filters = {};
    if (jobName) filters.jobName = { $regex: jobName, $options: "i" }; // Case-insensitive regex for jobName
    if (location) filters.location = { $regex: location, $options: "i" }; // Case-insensitive regex for location
    if (status) filters.jobStatus = status; // Exact match for job status

    // Fetch jobs based on filters
    const jobs = await Job.find(filters)
      .populate("employer", "companyName")
      .populate("outlet", "outletName location outletImage");

    // Map and format the response to include necessary details
    const formattedJobs = jobs.map((job) => ({
      id: job._id,
      jobName: job.jobName,
      jobIcon: job.jobIcon,
      location: job.location,
      jobStatus: job.jobStatus,
      employer: {
        name: job.employer?.companyName || "N/A",
      },
      outlet: {
        name: job.outlet?.outletName || "N/A",
        location: job.outlet?.location || "N/A",
        outletImage: job.outlet?.outletImage || "/static/defaultOutlet.png",
      },
      shiftsAvailable: job.dates.map((date) => ({
        date: date.date,
        shifts: date.shifts.map((shift) => ({
          startTime: shift.startTime,
          endTime: shift.endTime,
          payRate: shift.payRate,
          totalWage: shift.totalWage,
          vacancy: shift.vacancy,
          standbyVacancy: shift.standbyVacancy,
        })),
      })),
    }));

    // Return success response
    res.status(200).json({
      success: true,
      jobs: formattedJobs,
    });
  } catch (error) {
    console.error("Error in searchJobs:", error);
    res.status(500).json({
      success: false,
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
      .populate('employer', '_id  companyName contractEndDate companyLogo')
      .populate('outlet', '_id outletName location outletImage outletType')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Get application counts for all jobs
    const applicationCounts = await Application.aggregate([
      {
        $group: {
          _id: '$jobId', // Group by jobId
          applicationCount: { $sum: 1 }, // Count applications for each job
        },
      },
    ]);

    // Create a map of application counts for easy lookup
    const applicationCountMap = {};
    applicationCounts.forEach((item) => {
      applicationCountMap[item._id] = item.applicationCount;
    });

    // Format jobs with popularity
    const formattedJobs = jobs.map((job) => {
      const applicationCount = applicationCountMap[job._id] || 0; // Default to 0 if no applications
      const popularity = Math.min(applicationCount * 10, 100); // Scale popularity (max 100%)

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
        const effectiveHours = shift.duration - shift.breakHours; // Deduct break hours from duration
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

      const datesWithShifts = job.dates.map((date) => ({
        date: date.date,
        shifts: date.shifts.map((shift) => ({
          _id: shift._id,
          startTime: shift.startTime,
          duration: shift.duration,
          payRate: shift.payRate,
          totalWage: shift.totalWage,
          breakHours: shift.breakHours,
          vacancy: shift.vacancy,
          standbyVacancy: shift.standbyVacancy,
          filledVacancies: shift.filledVacancies,
          duration: shift.duration,

        })),
      }));

      return {
        _id: job._id,
        jobName: job.jobName,
        subtitle: job.subtitle,
        subtitleIcon: job.subtitleIcon,
        jobIcon: job.jobIcon,
        location: job.location,
        jobStatus: job.jobStatus,
        totalPotentialWages,
        totalVacancies,
        totalPayRate,
        popularity: `${popularity}%`,
        postedDate: job.postedDate,
        employer: job.employer,
        outlet: job.outlet,
        dates: datesWithShifts,
        
      };
    });

    const totalJobs = await Job.countDocuments();

    res.status(200).json({
      success: true,
      totalJobs,
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
    // Fetch the current user
    const user = await User.findById(userId);

    const applied = await Application.findOne({
      jobId: new mongoose.Types.ObjectId(req.params.id),
      userId: new mongoose.Types.ObjectId(userId),
      appliedStatus: 'Applied',
    });

    const job = await Job.findById(req.params.id)
      .populate('employer', '_id  companyName contractEndDate companyLogo')
      .populate('outlet', '_id outletName location outletImage outletType');

    if (!job) return res.status(404).json({ message: 'Job not found' });

    const formattedJob = {
      _id: job._id,
  jobName: job.jobName,
  subtitle: job.subtitle,
  subtitleIcon: job.subtitleIcon,
  jobIcon: job.jobIcon,
  jobStatus: job.jobStatus,
  postedDate: job.postedDate,
  salary: job.dates.reduce((total, date) => {
    return (
      total +
      date.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.totalWage, 0)
    );
  }, 0), // Calculate total salary

  totalPotentialWages: job.dates.reduce((total, date) => {
    return (
      total +
      date.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.totalWage, 0)
    );
  }, 0),
  
  // Calculate total pay rate
   totalPayRate: job.dates.reduce((total, date) => {
    return (
      total +
      date.shifts.reduce((shiftTotal, shift) => {
        const effectiveHours = shift.duration - shift.breakHours; // Deduct break hours from duration
        return shiftTotal + shift.payRate * effectiveHours;
      }, 0)
    );
  }, 0),


  totalVacancies: job.dates.reduce((total, date) => {
    return (
      total +
      date.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.vacancy, 0)
    );
  }, 0),

  applied: applied ? true : false,
  profileCompleted: user?.profileCompleted || false, 
  location: job.location,
  locationCoordinates: job.locationCoordinates,
  requirements: job.requirements,
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
    ouletType: job.outlet.outletType
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

    // Save updated job
    await job.save();

    res.status(200).json({ message: 'Job application successful', application });
  } catch (error) {
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

    const applications = await Application.find({ userId, status: 'Ongoing' })
      .populate('jobId', 'jobName jobIcon location')
      .populate('shiftId');

    const ongoingJobs = applications.map((app) => ({
      applicationId: app._id,
      jobName: app.jobId.jobName,
      jobIcon: app.jobId.jobIcon,
      location: app.jobId.location,
      salary: app.shiftId.totalWage,
      duration: `${app.shiftId.duration} hrs`,
      jobStatus: 'Ongoing',
    }));

    res.status(200).json({ success: true, jobs: ongoingJobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCompletedJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    const applications = await Application.find({ userId, status: 'Completed' })
      .populate('jobId', 'jobName jobIcon location')
      .populate('shiftId');

    const completedJobs = applications.map((app) => ({
      applicationId: app._id,
      jobName: app.jobId.jobName,
      jobIcon: app.jobId.jobIcon,
      location: app.jobId.location,
      salary: app.shiftId.totalWage,
      duration: `${app.shiftId.duration} hrs`,
      jobStatus: 'Completed',
    }));

    res.status(200).json({ success: true, jobs: completedJobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCancelledJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    const applications = await Application.find({ userId, status: 'Cancelled' })
      .populate('jobId', 'jobName jobIcon location')
      .populate('shiftId');

    const cancelledJobs = applications.map((app) => ({
      applicationId: app._id,
      jobName: app.jobId.jobName,
      jobIcon: app.jobId.jobIcon,
      location: app.jobId.location,
      salary: app.shiftId.totalWage,
      duration: `${app.shiftId.duration} hrs`,
      jobStatus: 'Cancelled',
    }));

    res.status(200).json({ success: true, jobs: cancelledJobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};