const express = require('express');
const {
  getDashboardOverview,
  getJobPostingStats,
  getRevenueStats,
  getPostedJobsList,
  getApplicationDetails,
  getNewApplications,
  getPendingPayments,
  getVerificationStatus,
  getNoShowCount,
  getRegisteredUsers,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard/overview', getDashboardOverview);
router.get('/jobs/posted-stats', getJobPostingStats);
router.get('/revenue/stats', getRevenueStats);
router.get('/jobs/list', getPostedJobsList);
router.get('/applications/details', getApplicationDetails);
router.get('/applications/new', getNewApplications);
router.get('/payments/pending', getPendingPayments);
router.get('/verification/status', getVerificationStatus);
router.get('/attendance/no-show', getNoShowCount);
router.get('/users/registered', getRegisteredUsers);

module.exports = router;
