const express = require("express");
const { generateQRCode, scanQRCode, clockOut } = require("../controllers/qrController");
const { authMiddleware } = require("../middlewares/auth");

const router = express.Router();

router.post("/generate", authMiddleware, generateQRCode);
router.post("/scan", authMiddleware, scanQRCode);
router.post("/clockout", authMiddleware, clockOut);

module.exports = router;
