const express = require("express");
const { uploadProfilePicture, completeProfile, getProfile, updateProfile, getProfileStats, getWalletDetails, cashOut , addCreditToWallet} = require("../controllers/profileController");
const { upload } = require('../middlewares/upload');
const { authMiddleware } = require("../middlewares/auth");
const { uploadGeneral, uploadProfile } = require("../middlewares/upload");

const router = express.Router();

router.get("/", authMiddleware, getProfile);
router.put("/update", authMiddleware, updateProfile);
router.get("/stats", authMiddleware, getProfileStats);

// ✅ Route: Upload Profile Picture (New API)
router.post(
    "/upload-profile-picture",
    authMiddleware,
    uploadProfile.single("profilePicture"),
    uploadProfilePicture
  );

// ✅ Route: Complete Profile with Image Uploads
router.put(
  "/complete-profile",
  authMiddleware,
  uploadGeneral.fields([
    { name: "selfie", maxCount: 1 },
    { name: "nricFront", maxCount: 1 },
    { name: "nricBack", maxCount: 1 },
    { name: "finFront", maxCount: 1 },
    { name: "finBack", maxCount: 1 },
    { name: "plocImage", maxCount: 1 },
    { name: "studentCard", maxCount: 1 },
  ]),
  completeProfile
);

router.get("/wallet", authMiddleware, getWalletDetails);
router.post("/cashout", authMiddleware, cashOut);
router.post("/add-credit", authMiddleware, addCreditToWallet);

module.exports = router;
