const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    employmentStatus: { type: String, enum: ["Student", "PR", "LTVP" , "No Working Pass"], required: true },
    profileCompleted: { type: Boolean, default: false },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
    applications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    profilePicture: {
      type: String, 
      default: '/static/image.png',
    },
    role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
    eWallet: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
  });

module.exports = mongoose.model('User', userSchema);
