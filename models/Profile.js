const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  postalCode: { type: String, required: true },
  nricNumber: { type: String},
  nricImages: {
    selfie: { type: String },
    front: { type: String,  },
    back: { type: String, },
  },
  finNumber: { type: String },
  finImages: {
    front: { type: String,  },
    back: { type: String,  },
  },
  plocImage: { type: String,  },
  plocExpiryDate: { type: Date  },
  studentIdNumber: { type: String },
  schoolName: { type: String },
  studentCardImage: { type: String, },
  country: { type: String, required: false },
  city: { type: String, required: false },
  town: { type: String, required: false },
});

module.exports = mongoose.model("Profile", profileSchema);
