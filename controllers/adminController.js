const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");


// controllers/adminController.js
const Admin = require("../models/Admin");

exports.uploadAdminProfileImage = async (req, res) => {
  try {
    const image = req.file?.path;
    if (!image) return res.status(400).json({ error: "No image uploaded" });

    const email = "admin@example.com";

    const admin = await Admin.findOneAndUpdate(
      { email },
      { profilePicture: image },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Profile image uploaded successfully",
      imageUrl: admin.profilePicture,
    });
  } catch (error) {
    console.error("Error uploading admin profile image:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getAdminProfileImage = async (req, res) => {
  try {
    const email = "admin@example.com"; // same static email as upload logic
    const admin = await Admin.findOne({ email });

    if (!admin || !admin.profilePicture) {
      return res.status(404).json({ error: "Profile image not found" });
    }

    return res.status(200).json({
      imageUrl: admin.profilePicture,
    });
  } catch (error) {
    console.error("Error fetching admin profile image:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};



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
exports.getPostedJobsSummary = async (req, res) => {
  try {
    const jobs = await Job.find({})
      .populate("company", "companyLegalName")
      .sort({ createdAt: -1 }) // most recent jobs first
      .limit(4)
      .select("jobName jobIcon company");

    const applications = await Application.aggregate([
      {
        $group: {
          _id: "$jobId",
          applicants: { $sum: 1 },
        },
      },
    ]);

    const applicantMap = {};
    applications.forEach(app => {
      applicantMap[app._id.toString()] = app.applicants;
    });

    const result = jobs.map(job => ({
      _id: job._id,
      jobName: job.jobName,
      jobIcon: job.jobIcon || "/static/jobIcon.png",
      employerName: job.company?.companyLegalName || "N/A",
      applicants: applicantMap[job._id.toString()] || 0,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching posted jobs summary:", error);
    res.status(500).json({ error: "Error fetching posted jobs summary" });
  }
};

exports.getAllPostedJobs = async (req, res) => {
  try {
    const { month } = req.query;

    const matchQuery = {};
    if (month) {
      const start = new Date(new Date().getFullYear(), month - 1, 1);
      const end = new Date(new Date().getFullYear(), month, 0, 23, 59, 59);
      matchQuery.createdAt = { $gte: start, $lte: end };
    }

    const jobs = await Job.find(matchQuery)
      .populate("company", "companyLegalName")
      .sort({ createdAt: -1 })
      .select("jobName jobIcon company createdAt");

    const applications = await Application.aggregate([
      {
        $group: {
          _id: "$jobId",
          applicants: { $sum: 1 },
        },
      },
    ]);

    const applicantMap = {};
    applications.forEach(app => {
      applicantMap[app._id.toString()] = app.applicants;
    });

    const result = jobs.map(job => ({
      _id: job._id,
      jobName: job.jobName,
      jobIcon: job.jobIcon || "/static/jobIcon.png",
      employerName: job.company?.companyLegalName || "N/A",
      applicants: applicantMap[job._id.toString()] || 0,
      createdAt: job.createdAt,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching all posted jobs:", error);
    res.status(500).json({ error: "Error fetching all posted jobs" });
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
exports.getNewRegistrations = async (req, res) => {
  try {
    // You can filter further based on time or specific status if needed
    const newUsers = await User.find({ status: { $in: ["Pending", "Incomplete Profile"] } })
      .select("fullName phoneNumber email profilePicture status createdAt");

    res.status(200).json(newUsers);
  } catch (error) {
    console.error("Error fetching new user registrations:", error);
    res.status(500).json({ error: "Error fetching new user registrations" });
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
