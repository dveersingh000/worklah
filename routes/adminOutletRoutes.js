const express = require("express");
const { getOutletAttendance } = require("../controllers/adminOutletController");
const { authMiddleware, adminOnlyMiddleware } = require("../middlewares/auth");
const router = express.Router();

router.use(authMiddleware, adminOnlyMiddleware);
router.get("/outlets/:id/attendance", getOutletAttendance); // ✅ Get outlet attendance details

module.exports = router;
