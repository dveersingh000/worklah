const Profile = require("../models/Profile");
const User = require("../models/User");
const Application = require("../models/Application");
const Job = require("../models/Job");
const mongoose = require("mongoose");

// Complete profile dynamically
exports.completeProfile = async (req, res) => {
  try {
    const {
      userId,
      dob,
      gender,
      postalCode,
      nricNumber,
      finNumber,
      studentIdNumber,
      schoolName,
      plocExpiryDate,
    } = req.body;

    const user = await User.findById(userId).populate("profileId");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Fetch or create a new profile
    let profile = user.profileId;
    if (!profile) {
      profile = new Profile({ userId });
    }

    // Clear all fields to avoid saving unnecessary data
    profile.nricNumber = undefined;
    profile.nricImages = undefined;
    profile.finNumber = undefined;
    profile.finImages = undefined;
    profile.plocImage = undefined;
    profile.plocExpiryDate = undefined;
    profile.studentIdNumber = undefined;
    profile.schoolName = undefined;
    profile.studentCardImage = undefined;

    // Update common fields
    profile.dob = dob;
    profile.gender = gender;
    profile.postalCode = postalCode;

    // Update fields based on employment status
    switch (user.employmentStatus) {
      case "PR":
        if (!nricNumber) {
          return res.status(400).json({ error: "NRIC Number is required for PR." });
        }
        profile.nricNumber = nricNumber;
        profile.nricImages = {
          front: req.files?.nricFront?.[0]?.path || null,
          back: req.files?.nricBack?.[0]?.path || null,
        };
        break;

      case "LTVP":
        if (!finNumber || !plocExpiryDate) {
          return res.status(400).json({
            error: "FIN Number and PLOC Expiry Date are required for LTVP.",
          });
        }
        profile.finNumber = finNumber;
        profile.finImages = {
          front: req.files?.finFront?.[0]?.path || null,
          back: req.files?.finBack?.[0]?.path || null,
        };
        profile.plocImage = req.files?.plocImage?.[0]?.path || null;
        profile.plocExpiryDate = plocExpiryDate;
        break;

      case "Student":
        if (!studentIdNumber || !schoolName) {
          return res.status(400).json({
            error: "Student ID Number and School Name are required for Students.",
          });
        }
        profile.studentIdNumber = studentIdNumber;
        profile.schoolName = schoolName;
        profile.studentCardImage =
          req.files?.studentCard?.[0]?.path || null;
        break;

      default:
        return res.status(400).json({ error: "Invalid employment status." });
    }

    // Update the selfie/profile picture if uploaded
    if (req.files?.selfie?.[0]?.path) {
      user.profilePicture = req.files.selfie[0].path;
    }

    await profile.save();
    user.profileCompleted = true;

    // Link profile to the user if not already linked
    if (!user.profileId) {
      user.profileId = profile._id;
    }

    await user.save();

    res.status(200).json({
      message: "Profile completed successfully.",
      profile,
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to complete profile.", details: error.message });
  }
};




// Fetch profile

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch the user and populate their profile
    const user = await User.findById(userId).populate("profileId");
    if (!user) return res.status(404).json({ error: "User not found." });

    const profile = user.profileId;

    // If the profile is incomplete, return basic user details
    if (!user.profileCompleted) {
      return res.status(200).json({
        message: "Profile incomplete. Please complete your profile.",
        fullName: user.fullName || null,
        phoneNumber: user.phoneNumber || null,
        email: user.email || null,
        profilePicture: user.profilePicture || "/static/image.png",
      });
    }

    // Fetch wallet details
    // const walletDetails = {
    //   balance: user.eWallet.balance,
    //   // transactions: user.eWallet.transactions.slice(-5), // Recent 5 transactions
    // };
    const walletDetails = user.eWallet;

    // Fetch statistics dynamically
    const totalCompletedJobs = await Application.countDocuments({
      userId: user._id,
      status: "Completed",
    });

    const totalCancelledJobs = await Application.countDocuments({
      userId: user._id,
      status: "Cancelled",
    });

    const totalHoursWorked = await Application.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: "Completed",
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      { $unwind: "$jobDetails" },
      { $unwind: "$jobDetails.dates" }, // Flatten dates array
      { $unwind: "$jobDetails.dates.shifts" }, // Flatten shifts array
      {
        $group: {
          _id: null,
          totalHours: { $sum: "$jobDetails.dates.shifts.duration" },
        },
      },
    ]);

    res.status(200).json({
      profile,
      profilePicture: user.profilePicture || "/static/image.png",
      wallet: walletDetails,
      stats: {
        totalCompletedJobs: totalCompletedJobs || 0,
        totalCancelledJobs: totalCancelledJobs || 0,
        totalHoursWorked: totalHoursWorked[0]?.totalHours || 0,
      },
      employmentStatus: user.employmentStatus,
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile.", details: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const user = await User.findById(userId).populate('profileId');
    if (!user) return res.status(404).json({ error: "User not found." });

    let profile = user.profileId;
    if (!profile) {
      profile = new Profile({ userId });
    }

    // Update common fields
    if (updates.dob) profile.dob = updates.dob;
    if (updates.gender) profile.gender = updates.gender;
    // if (updates.postalCode) profile.postalCode = updates.postalCode;

    // Update fields based on employment status
    switch (user.employmentStatus) {
      case 'PR':
        if (updates.nricNumber) profile.nricNumber = updates.nricNumber;
        if (req.files?.nricFront?.[0]?.path || req.files?.nricBack?.[0]?.path) {
          profile.nricImages = {
            front: req.files?.nricFront?.[0]?.path || profile.nricImages?.front || null,
            back: req.files?.nricBack?.[0]?.path || profile.nricImages?.back || null,
          };
        }
        break;
      case 'LTVP':
        if (updates.finNumber) profile.finNumber = updates.finNumber;
        if (req.files?.finFront?.[0]?.path || req.files?.finBack?.[0]?.path) {
          profile.finImages = {
            front: req.files?.finFront?.[0]?.path || profile.finImages?.front || null,
            back: req.files?.finBack?.[0]?.path || profile.finImages?.back || null,
          };
        }
        if (req.files?.plocImage?.[0]?.path) profile.plocImage = req.files.plocImage[0].path;
        if (updates.plocExpiryDate) profile.plocExpiryDate = updates.plocExpiryDate;
        break;
      case 'Student':
        if (updates.studentIdNumber) profile.studentIdNumber = updates.studentIdNumber;
        if (updates.schoolName) profile.schoolName = updates.schoolName;
        if (req.files?.studentCard?.[0]?.path) profile.studentCardImage = req.files.studentCard[0].path;
        break;
    }

    // Update the selfie/profile picture if uploaded
    if (req.files?.selfie?.[0]?.path) {
      user.profilePicture = req.files.selfie[0].path;
    }

    await profile.save();
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      profile,
      profilePicture: user.profilePicture,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile.", details: err.message });
  }
};


exports.getProfileStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Count total completed jobs
    const totalCompletedJobs = await Application.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: "Completed",
    });

    // Count total cancelled jobs
    const totalCancelledJobs = await Application.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: "Cancelled",
    });

    // Aggregate total hours worked from completed jobs
    const totalHoursWorked = await Application.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: "Completed",
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      { $unwind: "$jobDetails" }, // Unwind the job details
      { $unwind: "$jobDetails.dates" }, // Unwind dates array
      { $unwind: "$jobDetails.dates.shifts" }, // Unwind shifts array
      {
        $group: {
          _id: null,
          totalHours: { $sum: "$jobDetails.dates.shifts.duration" }, // Sum up shift durations
        },
      },
    ]);

    // Placeholder for no-show jobs, implement logic if needed
    const noShowJobs = 0;

    res.status(200).json({
      totalCompletedJobs: totalCompletedJobs || 0,
      totalCancelledJobs: totalCancelledJobs || 0,
      noShowJobs,
      totalHoursWorked: totalHoursWorked[0]?.totalHours || 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile stats.", details: err.message });
  }
};


exports.getWalletDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({
      eWallet: {
        balance: user.eWallet.balance,
        transactions: user.eWallet.transactions,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch wallet details.", details: err.message });
  }
};

exports.cashOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (amount > user.eWallet.balance) {
      return res.status(400).json({ error: "Insufficient balance." });
    }

    user.eWallet.balance -= amount;

    // Record the transaction
    user.eWallet.transactions.push({
      type: "Debit",
      amount,
      description: "Cash out",
    });

    await user.save();

    res.status(200).json({ message: "Cash out successful.", balance: user.eWallet.balance });
  } catch (err) {
    res.status(500).json({ error: "Failed to process cash out.", details: err.message });
  }
};

exports.addCreditToWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, description } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.eWallet.balance += amount;

    // Record the transaction
    user.eWallet.transactions.push({
      type: "Credit",
      amount,
      description: description || "Credit added",
    });

    await user.save();

    res.status(200).json({ message: "Credit added successfully.", balance: user.eWallet.balance });
  } catch (err) {
    res.status(500).json({ error: "Failed to add credit.", details: err.message });
  }
};
