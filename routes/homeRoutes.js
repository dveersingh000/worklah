// routes/homeRoutes.js
const express = require('express');
const {
  getUserInfo,
  searchJobs,
  getJobDetails,
  getShiftAvailability,
  applyForJob,
  getNotifications,
  getDates,
  getEWalletBalance,
  getJobManagement,
} = require('../controllers/homeController');

const router = express.Router();

router.get('/user/info', getUserInfo);
router.get('/jobs/search', searchJobs);
router.get('/jobs/details', getJobDetails);
router.get('/shifts/availability', getShiftAvailability);
router.post('/jobs/apply', applyForJob);
router.get('/notifications', getNotifications);
router.get('/dates/navigation', getDates);
// router.get('/ewallet/balance', getEWalletBalance);
router.get('/jobs/manage', getJobManagement);

module.exports = router;
