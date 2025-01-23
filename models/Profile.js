const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dob: { type: Date, required: false },
  gender: { type: String, enum: ['Male', 'Female'], required: false },
  postalCode: { type: String, required: false },
  nricNumber: { type: String, required: false },
  nricImages: {
    selfie: { type: String },
    front: { type: String },
    back: { type: String },
  },
  finNumber: { type: String, required: false },
  finImages: {
    front: { type: String },
    back: { type: String },
  },
  plocImage: { type: String, required: false },
  plocExpiryDate: { type: Date, required: false },
  studentIdNumber: { type: String, required: false },
  schoolName: { type: String, required: false },
  studentCardImage: { type: String, required: false },
});

module.exports = mongoose.model("Profile", profileSchema);
