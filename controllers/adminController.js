const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Payment = require('../models/Payment');

// Dashboard Overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const totalJobsPosted = await Job.countDocuments();
    const activatedHeroes = await User.find({ isActive: true }).countDocuments();
    const vacancies = await Job.find({ vacancies: { $gt: 0 } }).countDocuments();
    const pendingVerifications = await User.find({ isVerified: false }).countDocuments();
    const pendingPayments = await Payment.find({ status: 'pending' }).countDocuments();
    const totalAmountPaid = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
    ]);
    const noShowCount = await Application.find({ status: 'no-show' }).countDocuments();
    const verifiedHeroes = await User.find({ isVerified: true }).countDocuments();

    res.status(200).json({
      totalJobsPosted,
      activatedHeroes,
      vacancies,
      pendingVerifications,
      pendingPayments,
      totalAmountPaid: totalAmountPaid[0]?.totalPaid || 0,
      noShowCount,
      verifiedHeroes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dashboard overview' });
  }
};

// Job Posting Stats
exports.getJobPostingStats = async (req, res) => {
  const { month } = req.query;
  try {
    const jobStats = await Job.aggregate([
      { $project: { month: { $month: '$createdAt' } } },
      { $match: { month: parseInt(month, 10) } },
      { $group: { _id: '$month', count: { $sum: 1 } } },
    ]);

    res.status(200).json(jobStats);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching job posting stats' });
  }
};

// Revenue Stats
exports.getRevenueStats = async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    const revenue = await Payment.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(start_date),
            $lte: new Date(end_date),
          },
        },
      },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({ revenue });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching revenue stats' });
  }
};

// Posted Jobs List
exports.getPostedJobsList = async (req, res) => {
  try {
    const jobs = await Job.find().select('title applications');
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching posted jobs list' });
  }
};

// Application Details
exports.getApplicationDetails = async (req, res) => {
  const { job_id } = req.query;
  try {
    const applications = await Application.find({ job: job_id });
    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching application details' });
  }
};

// New Applications
exports.getNewApplications = async (req, res) => {
  try {
    const applications = await Application.find({ status: 'new' });
    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching new applications' });
  }
};

// Pending Payments
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'pending' });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching pending payments' });
  }
};

// Verification Status
exports.getVerificationStatus = async (req, res) => {
  try {
    const users = await User.find({ isVerified: false });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching verification status' });
  }
};

// No Show Count
exports.getNoShowCount = async (req, res) => {
  try {
    const noShowCount = await Application.find({ status: 'no-show' }).countDocuments();
    res.status(200).json({ noShowCount });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching no-show count' });
  }
};

// User Registration Details
exports.getRegisteredUsers = async (req, res) => {
  const { user_id } = req.query;
  try {
    const user = await User.findById(user_id);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user registration details' });
  }
};
