const express = require('express');
const {
  getOverviewMetrics,
  getJobPostedOverTime,
  getRevenueStats,
  getPostedJobs,
  getNewApplications,
  getFilteredMetrics
} = require('../controllers/dashboardController');

const router = express.Router();

router.get('/overview', getOverviewMetrics);
router.get('/job-posted-over-time', getJobPostedOverTime);
router.get('/revenue-stats', getRevenueStats);
router.get('/posted-jobs', getPostedJobs);
router.get('/new-applications', getNewApplications);
router.get('/filtered-metrics', getFilteredMetrics);

module.exports = router;
