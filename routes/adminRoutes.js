const express = require('express');
const {
  getDashboardOverview,
  getPostedJobsSummary,
  getAllPostedJobs,
  getRevenueStats,
  getPostedJobsList,
  getApplicationDetails,
  getNewRegistrations,
  getPendingPayments,
  getVerificationStatus,
  getNoShowCount,
  getRegisteredUsers,
} = require('../controllers/adminController');
const { uploadAdminProfile } = require("../middlewares/upload.js"); // your multer config
const { uploadAdminProfileImage, getAdminProfileImage } = require("../controllers/adminController");
const { authMiddleware, adminOnlyMiddleware } = require("../middlewares/auth");

const router = express.Router();

router.use(authMiddleware, adminOnlyMiddleware);
router.post("/profile/upload-image", uploadAdminProfile.single("image"), uploadAdminProfileImage);
router.get("/profile/image", getAdminProfileImage);
router.get('/dashboard/overview', getDashboardOverview);
router.get('/jobs/posted-summary', getPostedJobsSummary);
router.get('/jobs/view-list', getAllPostedJobs);
router.get('/revenue/stats', getRevenueStats);
router.get('/jobs/list', getPostedJobsList);
router.get('/applications/details', getApplicationDetails);
router.get('/users/new-registrations', getNewRegistrations);
router.get('/payments/pending', getPendingPayments);
router.get('/verification/status', getVerificationStatus);
router.get('/attendance/no-show', getNoShowCount);
router.get('/users/registered', getRegisteredUsers);

module.exports = router;
