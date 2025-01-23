const express = require("express");
const { completeProfile, getProfile, updateProfile, getProfileStats } = require("../controllers/profileController");
const { uploadMiddleware } = require('../middlewares/upload');
const { authMiddleware } = require("../middlewares/auth");

const router = express.Router();

router.get("/", authMiddleware, getProfile);
router.put("/update", authMiddleware, updateProfile);
router.get("/stats", authMiddleware, getProfileStats);
// Route for completing profile dynamically
router.post(
    '/complete-profile',
    uploadMiddleware.fields([
        { name: 'selfie', maxCount: 1 },
        { name: 'nricFront', maxCount: 1 },
        { name: 'nricBack', maxCount: 1 },
        { name: 'finFront', maxCount: 1 },
        { name: 'finBack', maxCount: 1 },
        { name: 'plocImage', maxCount: 1 },
        { name: 'studentCard', maxCount: 1 },
    ]),
    completeProfile
);

module.exports = router;
