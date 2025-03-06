const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["WORKER"], default: "WORKER" }, // Clear worker role
    status: { type: String, enum: ["Activated", "Deactivated"], default: "Activated" }, // ✅ Worker Activation Status
    verificationStatus: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Pending" }, // ✅ Verification status
    workPassStatus: { type: String, enum: ["Valid", "Expired"], default: "Valid" }, // ✅ Tracks work permit validity
    registrationDate: { type: Date, default: Date.now }, // ✅ Worker Registration Date

    // ✅ Performance Metrics
    walletBalance: { type: Number, default: 0 },
    totalCompletedJobs: { type: Number, default: 0 },
    totalCancelledJobs: { type: Number, default: 0 },
    totalHoursWorked: { type: Number, default: 0 },
    noShowCount: { type: Number, default: 0 },
    attendanceRate: { type: Number, default: 100 }, // 100% default, decreases if absent

    // ✅ Ratings & Reviews
    ratings: {
      averageRating: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
    },

    // ✅ Shift & Job Tracking
    jobsWorkedOn: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }], // List of completed jobs
    shifts: [{ 
      shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift" }, 
      attended: { type: Boolean, default: false }, 
      checkInTime: { type: Date },
      checkOutTime: { type: Date },
    }], // ✅ Tracks attended shifts
    outletsWorked: [{ type: mongoose.Schema.Types.ObjectId, ref: "Outlet" }], // Stores all worked outlets

    // ✅ Payment & Transactions
    payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }], 
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }], 
    eWallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" }, 

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", workerSchema);
