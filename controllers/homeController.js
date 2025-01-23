const User = require('../models/User');
const Job = require('../models/Job');
const Notification = require('../models/Notification'); 
// const EWallet = require('../models/EWallet');

// Fetches user details
exports.getUserInfo = async (req, res) => {
  try {
    const userId = req.user.id; 
    const user = await User.findById(userId).select('fullName profilePicture');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      fullName: user.fullName,
      profilePicture: user.profilePicture || 'http://localhost:3000/static/images/image.png',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Job search by keywords and location
exports.searchJobs = async (req, res) => {
  try {
    const { keywords, location } = req.query;
    const jobs = await Job.find({
      title: { $regex: keywords, $options: 'i' },
      location: { $regex: location, $options: 'i' }
    });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// Provides job details
exports.getJobDetails = async (req, res) => {
  try {
    const job = await Job.findById(req.query.job_id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// Check shift availability for a job
exports.getShiftAvailability = async (req, res) => {
  try {
    const job = await Job.findById(req.query.job_id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.status(200).json({ shifts: job.shifts });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// Apply for a job
exports.applyForJob = async (req, res) => {
  try {
    const { job_id, user_id } = req.body;
    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.applicants.push(user_id);
    await job.save();

    res.status(200).json({ message: 'Application submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// Fetch user notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.query.user_id });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// Fetch available dates for navigation
exports.getDates = (req, res) => {
  try {
    const dates = [
      'Sat 4', 'Sun 5', 'Mon 6', 'Tue 7', 'Wed 8'
    ];
    res.status(200).json(dates);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// Get user's e-wallet balance
// exports.getEWalletBalance = async (req, res) => {
//   try {
//     const wallet = await EWallet.findOne({ userId: req.query.user_id });
//     if (!wallet) return res.status(404).json({ error: 'E-wallet not found' });

//     res.status(200).json({ balance: wallet.balance });
//   } catch (error) {
//     res.status(500).json({ error: 'Server Error' });
//   }
// };

// Manage user's applied jobs
exports.getJobManagement = async (req, res) => {
  try {
    const jobs = await Job.find({ applicants: req.query.user_id });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

