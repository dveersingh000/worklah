// models/Admin.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  fullName: { type: String, default: "Admin" },
  profilePicture: { type: String, default: "/assets/profile.svg" },
});

module.exports = mongoose.model("Admin", adminSchema);
