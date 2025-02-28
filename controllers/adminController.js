const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");

// 🚀 **Get Dashboard Overview**
exports.getDashboardOverview = async (req, res) => {
  try {
    const totalJobsPosted = await Job.countDocuments();
    const activatedUsers = await User.countDocuments({ role: "USER" });
    const verifiedUsers = await User.countDocuments({ profileCompleted: true });
    const pendingVerifications = await User.countDocuments({ profileCompleted: false });
    const pendingPayments = await Payment.countDocuments({ status: "pending" });

    // ✅ Get total paid amount
    const totalAmountPaid = await Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
    ]);

    // ✅ Get total no-show applications
    const noShowCount = await Application.countDocuments({ status: "Cancelled" });

    res.status(200).json({
      totalJobsPosted,
      activatedUsers,
      verifiedUsers,
      pendingVerifications,
      pendingPayments,
      totalAmountPaid: totalAmountPaid[0]?.totalPaid || 0,
      noShowCount,
    });
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    res.status(500).json({ error: "Error fetching dashboard overview" });
  }
};

// 🚀 **Get Job Posting Stats**
exports.getJobPostingStats = async (req, res) => {
  const { month } = req.query;
  try {
    const jobStats = await Job.aggregate([
      { $project: { month: { $month: "$createdAt" } } },
      { $match: { month: parseInt(month, 10) } },
      { $group: { _id: "$month", count: { $sum: 1 } } },
    ]);

    res.status(200).json(jobStats);
  } catch (error) {
    console.error("Error fetching job posting stats:", error);
    res.status(500).json({ error: "Error fetching job posting stats" });
  }
};

// 🚀 **Get Revenue Stats**
exports.getRevenueStats = async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    const revenue = await Payment.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(start_date),
            $lte: new Date(end_date),
          },
        },
      },
      { $group: { _id: { $month: "$createdAt" }, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({ revenue });
  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    res.status(500).json({ error: "Error fetching revenue stats" });
  }
};

// 🚀 **Get Posted Jobs List**
exports.getPostedJobsList = async (req, res) => {
  try {
    const jobs = await Job.find().select("jobName company outlet").populate("company", "companyLegalName").populate("outlet", "outletName");
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching posted jobs list:", error);
    res.status(500).json({ error: "Error fetching posted jobs list" });
  }
};

// 🚀 **Get Application Details**
exports.getApplicationDetails = async (req, res) => {
  const { job_id } = req.query;
  try {
    if (!mongoose.Types.ObjectId.isValid(job_id)) {
      return res.status(400).json({ message: "Invalid Job ID" });
    }

    const applications = await Application.find({ jobId: job_id })
      .populate("userId", "fullName phoneNumber profilePicture")
      .populate("jobId", "jobName company")
      .populate("shiftId", "startTime endTime");

    res.status(200).json(applications);
  } catch (error) {
    console.error("Error fetching application details:", error);
    res.status(500).json({ error: "Error fetching application details" });
  }
};

// 🚀 **Get New Applications**
exports.getNewApplications = async (req, res) => {
  try {
    const applications = await Application.find({ status: "Applied" })
      .populate("userId", "fullName phoneNumber profilePicture")
      .populate("jobId", "jobName company");

    res.status(200).json(applications);
  } catch (error) {
    console.error("Error fetching new applications:", error);
    res.status(500).json({ error: "Error fetching new applications" });
  }
};

// 🚀 **Get Pending Payments**
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: "pending" })
      .populate("userId", "fullName phoneNumber")
      .populate("jobId", "jobName");

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({ error: "Error fetching pending payments" });
  }
};

// 🚀 **Get Verification Status**
exports.getVerificationStatus = async (req, res) => {
  try {
    const users = await User.find({ profileCompleted: false }).select("fullName phoneNumber email profilePicture");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching verification status:", error);
    res.status(500).json({ error: "Error fetching verification status" });
  }
};

// 🚀 **Get No-Show Count**
exports.getNoShowCount = async (req, res) => {
  try {
    const noShowCount = await Application.countDocuments({ status: "Cancelled" });
    res.status(200).json({ noShowCount });
  } catch (error) {
    console.error("Error fetching no-show count:", error);
    res.status(500).json({ error: "Error fetching no-show count" });
  }
};

// 🚀 **Get Registered User Details**
exports.getRegisteredUsers = async (req, res) => {
  const { user_id } = req.query;
  try {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    const user = await User.findById(user_id)
      .select("fullName email phoneNumber profilePicture employmentStatus createdAt")
      .populate("profileId", "dob gender nricNumber finNumber studentIdNumber schoolName");

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user registration details:", error);
    res.status(500).json({ error: "Error fetching user registration details" });
  }
};
