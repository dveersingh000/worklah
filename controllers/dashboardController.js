const Job = require("../models/Job");
const Payment = require("../models/Payment");
const Worker = require("../models/Worker");
const Application = require("../models/Application");
const Shift = require("../models/Shift");
const User = require("../models/User");

exports.getOverviewMetrics = async (req, res) => {
  try {
    // ✅ Count total jobs
    const totalJobs = await Job.countDocuments();

    // ✅ Count activated Hustle Heroes (Users)
    const activatedHeroes = await User.countDocuments({ role: "USER" });

    // ✅ Get total vacancies & vacancies filled
    const vacancies = await Shift.aggregate([
      {
        $group: {
          _id: null,
          totalVacancy: { $sum: "$vacancy" },
          totalVacancyFilled: { $sum: "$vacancyFilled" },
        },
      },
    ]);

    // ✅ Count pending verifications (Users)
    const pendingVerifications = await User.countDocuments({ verificationStatus: "Pending" });

    // ✅ Count pending payments
    const pendingPayments = await Payment.countDocuments({ paymentStatus: "Pending" });

    // ✅ Sum total amount paid (only for completed payments)
    const totalAmountPaid = await Payment.aggregate([
      { $match: { paymentStatus: "Completed" } }, // ✅ Filter only completed payments
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // ✅ Count workers marked as No Show
    const noShows = await Application.countDocuments({ status: "No Show" });

    // ✅ Count verified users (Hustle Heroes)
    const verifiedHeroes = await User.countDocuments({ verificationStatus: "Verified" });

    res.status(200).json({
      totalJobs,
      activatedHeroes,
      vacancies: vacancies[0]?.totalVacancy || 0,
      vacanciesFilled: vacancies[0]?.totalVacancyFilled || 0, // ✅ Added vacancies filled count
      pendingVerifications,
      pendingPayments,
      totalAmountPaid: totalAmountPaid[0]?.total || 0,
      noShows,
      verifiedHeroes,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch overview metrics", details: err.message });
  }
};



  exports.getJobPostedOverTime = async (req, res) => {
    try {
      const jobPostedData = await Job.aggregate([
        {
          $group: {
            _id: { $month: "$date" },
            jobsPosted: { $sum: 1 },
          },
        },
        { $sort: { "_id": 1 } },
      ]);
  
      const formattedData = jobPostedData.map((item) => ({
        month: new Date(0, item._id - 1).toLocaleString('default', { month: 'short' }),
        jobsPosted: item.jobsPosted,
      }));
  
      res.status(200).json(formattedData);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch job posted data', details: err.message });
    }
  };

  exports.getRevenueStats = async (req, res) => {
    try {
      const revenueData = await Payment.aggregate([
        {
          $group: {
            _id: { $month: "$date" },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id": 1 } },
      ]);
  
      const formattedData = revenueData.map((item) => ({
        month: new Date(0, item._id - 1).toLocaleString('default', { month: 'short' }),
        revenue: item.revenue,
      }));
  
      const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  
      res.status(200).json({ totalRevenue, revenueData: formattedData });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch revenue stats', details: err.message });
    }
  };

  exports.getPostedJobs = async (req, res) => {
    try {
      // ✅ Fetch all jobs
      const jobs = await Job.find().select("jobName");
  
      // ✅ Fetch applicant count for each job
      const applications = await Application.aggregate([
        { $group: { _id: "$jobId", applicantCount: { $sum: 1 } } }
      ]);
  
      // ✅ Convert application count to a map
      const applicationMap = {};
      applications.forEach((app) => {
        applicationMap[app._id.toString()] = app.applicantCount;
      });
  
      // ✅ Format jobs response
      const formattedJobs = jobs.map((job) => ({
        title: job.jobName,
        applicants: applicationMap[job._id.toString()] || 0, // Use count if available, else 0
      }));
  
      res.status(200).json(formattedJobs);
    } catch (err) {
      console.error("Error in getPostedJobs:", err);
      res.status(500).json({ error: "Failed to fetch posted jobs", details: err.message });
    }
  };
  
  exports.getNewApplications = async (req, res) => {
    try {
      const applications = await Application.find()
        .limit(5)
        .populate('userId', 'fullName')  // ✅ Correct field for worker
        .populate('jobId', 'jobName');   // ✅ Correct field for job

      const formattedApplications = applications.map((application) => ({
        workerName: application.userId ? application.userId.fullName : "Unknown Worker",
        appliedFor: application.jobId ? application.jobId.jobName : "Unknown Job",
      }));

      res.status(200).json(formattedApplications);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch new applications", details: err.message });
    }
};


exports.getFilteredMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // ✅ Validate dates before using them
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required." });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    // ✅ Check if parsed dates are valid
    if (isNaN(parsedStartDate) || isNaN(parsedEndDate)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    // ✅ Fetch Total Jobs
    const totalJobs = await Job.countDocuments({
      date: { $gte: parsedStartDate, $lte: parsedEndDate },
    });

    // ✅ Fetch Activated Heroes
    const activatedHeroes = await Worker.countDocuments({
      activatedDate: { $gte: parsedStartDate, $lte: parsedEndDate },
    });

    // ✅ Fetch Total Amount Paid
    const totalAmountPaid = await Payment.aggregate([
      { $match: { date: { $gte: parsedStartDate, $lte: parsedEndDate } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      totalJobs,
      activatedHeroes,
      totalAmountPaid: totalAmountPaid[0]?.total || 0, // Handle case where no payments exist
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch filtered metrics", details: err.message });
  }
};

