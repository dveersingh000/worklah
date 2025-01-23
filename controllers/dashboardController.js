const Job = require('../models/Job');
const Payment = require('../models/Payment');
const Worker = require('../models/Worker');
const Application = require('../models/Application');
const Shift = require('../models/Shift');

exports.getOverviewMetrics = async (req, res) => {
    try {
      const totalJobs = await Job.countDocuments();
      const activatedHeroes = await Worker.countDocuments({ status: 'Activated' });
      const vacancies = await Shift.aggregate([{ $group: { _id: null, total: { $sum: "$vacancy" } } }]);
      const pendingVerifications = await Worker.countDocuments({ verificationStatus: 'Pending' });
      const pendingPayments = await Payment.countDocuments({ status: 'Pending' });
      const totalAmountPaid = await Payment.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
      const noShows = await Application.countDocuments({ status: 'No Show' });
      const verifiedHeroes = await Worker.countDocuments({ verificationStatus: 'Verified' });
  
      res.status(200).json({
        totalJobs,
        activatedHeroes,
        vacancies: vacancies[0]?.total || 0,
        pendingVerifications,
        pendingPayments,
        totalAmountPaid: totalAmountPaid[0]?.total || 0,
        noShows,
        verifiedHeroes,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch overview metrics', details: err.message });
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
      const jobs = await Job.find().select('jobName applicants').populate('applicants', 'name');
  
      const formattedJobs = jobs.map((job) => ({
        title: job.jobName,
        applicants: job.applicants.length,
      }));
  
      res.status(200).json(formattedJobs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch posted jobs', details: err.message });
    }
  };
  exports.getNewApplications = async (req, res) => {
    try {
      const applications = await Application.find()
        .limit(5)
        .populate('worker', 'name')
        .populate('job', 'jobName');
  
      const formattedApplications = applications.map((application) => ({
        workerName: application.worker.name,
        appliedFor: application.job.jobName,
      }));
  
      res.status(200).json(formattedApplications);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch new applications', details: err.message });
    }
  };

exports.getFilteredMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const totalJobs = await Job.countDocuments({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    const activatedHeroes = await Worker.countDocuments({
      activatedDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    const totalAmountPaid = await Payment.aggregate([
      {
        $match: { date: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      totalJobs,
      activatedHeroes,
      totalAmountPaid: totalAmountPaid[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch filtered metrics', details: err.message });
  }
};
