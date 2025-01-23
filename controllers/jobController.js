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
    const { jobName, jobIcon, employerId, outletId, dates, location, locationCoordinates, requirements, jobStatus } = req.body;

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
    const jobs = await Job.find({}, 'jobName location jobIcon jobStatus postedDate dates')
      .populate('employer', 'companyName')
      .populate('outlet', 'outletName location outletImage')
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


      const datesWithShifts = job.dates.map((date) => ({
        date: date.date,
        shifts: date.shifts.map((shift) => ({
          startTime: shift.startTime,
          duration: shift.duration,
          payRate: shift.payRate,
          totalWage: shift.totalWage,
          breakHours: shift.breakHours,
        })),
      }));

      return {
        _id: job._id,
        jobName: job.jobName,
        jobIcon: job.jobIcon,
        location: job.location,
        jobStatus: job.jobStatus,
        postedDate: job.postedDate,
        employer: job.employer,
        outlet: job.outlet,
        popularity: `${popularity}%`,
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
    const applied = await Application.findOne({
      jobId: new mongoose.Types.ObjectId(req.params.id),
      userId: new mongoose.Types.ObjectId(userId),
      appliedStatus: 'Applied',
    });

    const job = await Job.findById(req.params.id)
      .populate('employer', 'companyName contractEndDate')
      .populate('outlet', 'outletName location');

    if (!job) return res.status(404).json({ message: 'Job not found' });

    const formattedJob = {
      _id: job._id,
  jobName: job.jobName,
  jobIcon: job.jobIcon,
  jobStatus: job.jobStatus,
  postedDate: job.postedDate,
  salary: job.dates.reduce((total, date) => {
    return (
      total +
      date.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.totalWage, 0)
    );
  }, 0), // Calculate total salary
  applied: applied ? true : false,
  location: job.location,
  locationCoordinates: job.locationCoordinates,
  requirements: job.requirements,
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
  employer: {
    name: job.employer.companyName,
    contractEndDate: job.employer.contractEndDate,
  },
  outlet: {
    name: job.outlet.outletName,
    location: job.outlet.location,
    outletImage: job.outlet.outletImage
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
    const user = await User.findById(userId).populate('profileId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.profileCompleted) {
      return res.status(400).json({ error: 'Profile not completed. Please complete your profile first.' });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Find the specific date
    const jobDate = job.dates.find(d => {
      const storedDate = new Date(d.date).toISOString().split('T')[0]; // Convert to 'YYYY-MM-DD'
      return storedDate === date; // Compare with the provided date
    });

    if (!jobDate) return res.status(404).json({ error: 'Job date not found' });

    // Find the specific shift within the found date
    const shift = jobDate.shifts.find(shift => shift._id.toString() === shiftId);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    // Validate vacancies
    if (!isStandby && shift.filledVacancies < shift.vacancy) {
      shift.filledVacancies += 1; // Increment filled vacancies
    } else if (isStandby && shift.standbyFilled < shift.standbyVacancy) {
      shift.standbyFilled += 1; // Increment standby filled
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
      status: 'Upcoming',
      appliedStatus: 'Applied',
    });
    await application.save();

    // Add the application to the user's applications array
    user.applications.push(application._id);
    await user.save();

    // Save the updated job
    await job.save();

    // Create a notification for the user
    const notification = new Notification({
      userId,
      jobId,
      type: 'Job',
      title: 'Job Application Successful',
      message: `You have successfully applied for the job: ${job.jobName}`,
    });
    await notification.save();

    res.status(200).json({ message: 'Job application successful', application });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply for the job', details: error.message });
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    const { applicationId, reason } = req.body;

    const application = await Application.findByIdAndUpdate(
      applicationId,
      { status: 'Cancelled', appliedStatus: 'Cancelled', reason, cancelledAt: new Date() },
      { new: true }
    );

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const notification = new Notification({
      userId: application.userId,
      jobId: application.jobId,
      type: 'Job',
      title: 'Job Application Cancelled',
      message: `Your application for job ${application.jobId} has been cancelled.`,
    });

    await notification.save();

    res.status(200).json({ message: 'Application cancelled successfully', application });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOngoingJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({ userId, status: 'Applied' })
      .populate('jobId', 'jobName jobIcon location jobStatus')
      .populate('shiftId');

    const ongoingJobs = applications.map((app) => ({
      applicationId: app._id,
      job: app.jobId,
      shift: app.shiftId,
      status: app.status,
    }));

    res.status(200).json(ongoingJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCompletedJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({ userId, status: 'Completed' })
      .populate('jobId', 'jobName jobIcon location jobStatus')
      .populate('shiftId');

    const completedJobs = applications.map((app) => ({
      applicationId: app._id,
      job: app.jobId,
      shift: app.shiftId,
      status: app.status,
    }));

    res.status(200).json(completedJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCancelledJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({ userId, status: 'Cancelled' })
      .populate('jobId', 'jobName jobIcon location jobStatus')
      .populate('shiftId');

    const cancelledJobs = applications.map((app) => ({
      applicationId: app._id,
      job: app.jobId,
      shift: app.shiftId,
      status: app.status,
    }));

    res.status(200).json(cancelledJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};