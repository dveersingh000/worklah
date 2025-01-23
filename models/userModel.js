const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: { type: String },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique:true},
    password:{type: String, required:true},
    workPassStatus: { type: String },
    otp: { type: String },
    otpExpiry: { type: Date },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

// Check if the model already exists before compiling
module.exports = mongoose.models.User || mongoose.model("UserModel", userSchema);
