const Job = require('../models/Job');
const Employer = require('../models/Employer');
const Outlet = require('../models/Outlet');
const Application = require('../models/Application');
const mongoose = require('mongoose');
const moment = require('moment');

// ✅ Fetch all jobs with filters, sorting & pagination
exports.getAllJobs = async (req, res) => {
    try {
      const { page = 1, limit = 10, jobName, employerId, outletId, status, city } = req.query;
  
      const filters = {};
      if (jobName) filters.jobName = { $regex: jobName, $options: "i" };
      if (status) filters.jobStatus = status;
      if (employerId && mongoose.Types.ObjectId.isValid(employerId)) filters.employer = employerId;
      if (outletId && mongoose.Types.ObjectId.isValid(outletId)) filters.outlet = outletId;
      if (city) filters.location = { $regex: city, $options: "i" };
  
      // Fetch jobs with employer and outlet details
      const jobs = await Job.find(filters)
        .populate('employer', 'companyName companyLogo') // Employer Logo
        .populate('outlet', 'outletName location outletImage') // Outlet Logo
        .lean(); // Convert Mongoose documents to plain objects
  
      // Fetch applications to calculate filled vacancies & standby users
      const applicationCounts = await Application.aggregate([
        {
          $group: {
            _id: "$jobId",
            totalApplications: { $sum: 1 },
            standbyApplications: {
              $sum: { $cond: [{ $eq: ["$isStandby", true] }, 1, 0] },
            },
          },
        },
      ]);
  
      const applicationCountMap = {};
      applicationCounts.forEach(app => {
        applicationCountMap[app._id] = {
          totalApplications: app.totalApplications || 0,
          standbyApplications: app.standbyApplications || 0,
        };
      });
  
      // Format jobs response with additional details
      const formattedJobs = jobs.map(job => {
        let totalVacancy = 0;
        let totalStandby = 0;
        let totalShifts = 0;
  
        // Process shift data
        const shiftDetails = job.dates.map(dateObj => ({
          date: moment(dateObj.date).format("DD MMM, YY"), // Format date
          shifts: dateObj.shifts.map(shift => {
            totalShifts += 1;
            totalVacancy += shift.vacancy;
            totalStandby += shift.standbyVacancy;
  
            return {
              shiftId: shift._id,
              startTime: shift.startTime,
              endTime: shift.endTime,
              breakIncluded: `${shift.breakHours} Hrs ${shift.breakType}`,
              vacancy: shift.vacancy,
              duration: shift.duration,
              standbyVacancy: shift.standbyVacancy,
              payRate: `$${shift.payRate}`,
              totalWage: `$${shift.totalWage}`,
            };
          }),
        }));
  
        const applicationStats = applicationCountMap[job._id] || {
          totalApplications: 0,
          standbyApplications: 0,
        };
  
        return {
          _id: job._id,
          jobName: job.jobName,
          employer: {
            name: job.employer.companyName,
            logo: job.employer.companyLogo,
          },
          outlet: {
            name: job.outlet.outletName,
            location: job.outlet.location,
            logo: job.outlet.outletImage,
          },
          numberOfShifts: totalShifts,
          vacancyUsers: `${applicationStats.totalApplications}/${totalVacancy}`,
          standbyUsers: `${applicationStats.standbyApplications}/${totalStandby}`,
          totalWage: `$${job.dates.reduce(
            (acc, date) => acc + date.shifts.reduce((sum, shift) => sum + shift.totalWage, 0),
            0
          )}`,
          jobStatus: job.jobStatus,
          postedDate: moment(job.postedDate).format("DD MMM, YY"),
          shiftDetails, // ✅ Include shift data
        };
      });
  
      // Fetch **Dashboard Metrics**
      const totalActiveJobs = await Job.countDocuments({ jobStatus: 'Active' });
      const totalUpcomingJobs = await Job.countDocuments({ jobStatus: 'Upcoming' });
      const totalCancelledJobs = await Job.countDocuments({ jobStatus: 'Cancelled' });
  
      // Calculate **Average Attendance Rate**
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
  }

// ✅ Fetch a single job by ID (with employer, outlet, shifts)
exports.getJobById = async (req, res) => {
    try {
      const job = await Job.findById(req.params.id)
        .populate("employer", "companyName companyLogo")
        .populate("outlet", "outletName location outletImage")
        .lean();
  
      if (!job) return res.status(404).json({ message: "Job not found" });
  
      // Calculate total vacancy & standby candidates
      let totalVacancyCandidates = 0;
      let totalStandbyCandidates = 0;
  
      const shiftDetails = job.dates.map(date => ({
        date: moment(date.date).format("DD MMM, YY"),
        shifts: date.shifts.map(shift => {
          totalVacancyCandidates += shift.vacancy;
          totalStandbyCandidates += shift.standbyVacancy;
  
          return {
            shiftId: shift._id,
            startTime: shift.startTime,
            endTime: shift.endTime,
            vacancyFilled: `${shift.filledVacancies}/${shift.vacancy}`,
            standbyFilled: `${shift.standbyFilled}/${shift.standbyVacancy}`,
            totalDuration: `${shift.duration} Hrs`,
            rateType: shift.rateType,
            breakIncluded: `${shift.breakHours} Hrs ${shift.breakType}`,
            rate: `$${shift.payRate}/hr`,
            totalWage: `$${shift.totalWage}`,
            jobStatus: job.jobStatus,
          };
        }),
      }));
  
      // Static shift cancellation penalties
      const shiftCancellationPenalties = [
        { condition: "5 Minutes after applying", penalty: "No Penalty" },
        { condition: "< 24 Hours", penalty: "No Penalty" },
        { condition: "> 24 Hours", penalty: "$5 Penalty" },
        { condition: "> 48 Hours", penalty: "$10 Penalty" },
        { condition: "> 72 Hours", penalty: "$15 Penalty" },
        { condition: "No Show - During Shift", penalty: "$50 Penalty" }
      ];
  
      // Construct job response
      const jobDetails = {
        jobId: job._id,
        jobName: job.jobName,
        employer: {
          name: job.employer.companyName,
          logo: job.employer.companyLogo,
        },
        outlet: {
          name: job.outlet.outletName,
          location: job.outlet.location,
          logo: job.outlet.outletImage,
        },
        postedDate: moment(job.postedDate).format("DD MMM, YY"),
        location: job.location,
        jobStatus: job.jobStatus,
        totalVacancyCandidates,
        totalStandbyCandidates,
        shiftDetails,
        jobScope: job.requirements.jobScopeDescription,
        jobRequirements: job.requirements.jobRequirements,
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
  try {
    const { jobName, employerId, outletId, dates, location, requirements, jobStatus } = req.body;

    // Validate employer & outlet
    const employer = await Employer.findById(employerId);
    if (!employer) return res.status(404).json({ message: "Employer not found" });

    const outlet = await Outlet.findById(outletId);
    if (!outlet) return res.status(404).json({ message: "Outlet not found" });

    // Process shifts properly
    const processedDates = dates.map((dateObj) => ({
      date: dateObj.date,
      shifts: dateObj.shifts.map((shift) => ({
        startTime: shift.startTime,
        endTime: shift.endTime,
        vacancy: shift.vacancy,
        standbyVacancy: shift.standbyVacancy,
        filledVacancies: 0,
        standbyFilled: 0,
        duration: shift.duration,
        breakHours: shift.breakHours,
        breakType: shift.breakType,
        payRate: shift.payRate,
        rateType: shift.rateType,
        totalWage: shift.rateType === "Hourly rate" ? shift.payRate * shift.duration : shift.payRate,
      })),
    }));

    const job = new Job({
      jobName,
      employer: employerId,
      outlet: outletId,
      dates: processedDates,
      location,
      requirements,
      jobStatus,
    });

    await job.save();
    res.status(201).json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update a job properly
exports.updateJob = async (req, res) => {
  try {
    const { jobName, employerId, outletId, dates, location, requirements, jobStatus } = req.body;

    // Validate employer and outlet
    const employer = await Employer.findById(employerId);
    if (!employer) return res.status(404).json({ message: "Employer not found" });

    const outlet = await Outlet.findById(outletId);
    if (!outlet) return res.status(404).json({ message: "Outlet not found" });

    // Process shifts correctly
    const processedDates = dates.map((dateObj) => ({
      date: dateObj.date,
      shifts: dateObj.shifts.map((shift) => ({
        startTime: shift.startTime,
        endTime: shift.endTime,
        vacancy: shift.vacancy,
        standbyVacancy: shift.standbyVacancy,
        filledVacancies: shift.filledVacancies || 0,
        standbyFilled: shift.standbyFilled || 0,
        duration: shift.duration,
        breakHours: shift.breakHours,
        breakType: shift.breakType,
        payRate: shift.payRate,
        rateType: shift.rateType,
        totalWage: shift.rateType === "Hourly rate" ? shift.payRate * shift.duration : shift.payRate,
      })),
    }));

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { jobName, employer: employerId, outlet: outletId, dates: processedDates, location, requirements, jobStatus },
      { new: true }
    );

    if (!updatedJob) return res.status(404).json({ message: "Job not found" });

    res.status(200).json({ success: true, updatedJob });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Duplicate Job API
exports.duplicateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const newJob = new Job({
      jobName: `${job.jobName} (Copy)`,
      employer: job.employer,
      outlet: job.outlet,
      dates: job.dates,
      location: job.location,
      requirements: job.requirements,
      jobStatus: "Upcoming",
    });

    await newJob.save();
    res.status(201).json({ success: true, job: newJob });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    res.status(200).json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Cancel Job API
exports.cancelJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { jobStatus: "Cancelled" }, { new: true });

    if (!job) return res.status(404).json({ message: "Job not found" });

    res.status(200).json({ success: true, message: "Job Cancelled", job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Deactivate Job API
exports.deactivateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { jobStatus: "Deactivated" }, { new: true });

    if (!job) return res.status(404).json({ message: "Job not found" });

    res.status(200).json({ success: true, message: "Job Deactivated", job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete Job API
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    res.status(200).json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};