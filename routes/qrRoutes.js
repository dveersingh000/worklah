const express = require("express");
const { authMiddleware } = require("../middlewares/auth"); // Ensure authentication middleware is used
const {
  generateQRCode,
  scanQRCode,
  getShifts,
  clockIn,
  clockOut
} = require("../controllers/qrController");

const router = express.Router();

// ✅ Generate QR Code (Admin-side)
router.post("/generate", authMiddleware, generateQRCode);

// ✅ Scan QR Code (Fetch job & shift details)
router.post("/scan", authMiddleware, scanQRCode);

// ✅ Get Shifts (Admin-side)
router.get("/shifts", authMiddleware, getShifts);

// ✅ Manually Clock-In (After scanning QR)
router.post("/clock-in", authMiddleware, clockIn);

// ✅ Manually Clock-Out (After shift ends)
router.post("/clock-out", authMiddleware, clockOut);

module.exports = router;
