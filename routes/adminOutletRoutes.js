const express = require("express");
const { getOutletAttendance } = require("../controllers/adminOutletController");
const router = express.Router();

router.get("/outlets/:id/attendance", getOutletAttendance); // ✅ Get outlet attendance details

module.exports = router;
