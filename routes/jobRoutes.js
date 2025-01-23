const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middlewares/auth');
const {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  applyForJob, 
  getOngoingJobs,
  getCompletedJobs,
  getCancelledJobs,
  cancelApplication,
  searchJobs
} = require('../controllers/jobController');

router.post('/', authMiddleware, createJob);
router.get('/', getAllJobs); 
router.get('/:id', authMiddleware, getJobById); 
router.put('/:id', authMiddleware, updateJob); 
router.delete('/:id',authMiddleware,  deleteJob); 
router.get('/search',  searchJobs);

// Shift Management
router.post('/:jobId/apply',  applyForJob); // Apply for a shift
router.post('/:jobId/cancel', authMiddleware, cancelApplication); // Cancel an application
router.get('/ongoing', getOngoingJobs);
router.get('/completed', getCompletedJobs);
router.get('/cancelled', getCancelledJobs);


module.exports = router;
