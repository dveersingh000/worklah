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
  markApplicationCompleted,
  cancelApplication,
  searchJobs,
  // getOngoingShifts,
  // getCompletedShifts,
  // getCanceledShifts,
  getLinkedBanks,
  addBank,
  getWalletBalance,
  addCashout,
  getTransactions
} = require('../controllers/jobController');


// Shift Management
// router.get('/ongoing',  getOngoingShifts);
// router.get('/completed',  getCompletedShifts);  
// router.get('/canceled',  getCanceledShifts);

router.get('/ongoing', authMiddleware, getOngoingJobs);
router.get('/completed',authMiddleware,  getCompletedJobs);
router.get('/cancelled', authMiddleware, getCancelledJobs);
router.post('/markComplete', authMiddleware, markApplicationCompleted);

// Bank Management
router.get('/banks', getLinkedBanks);
router.post('/banks', addBank);

// Wallet Management
router.get('/balance', getWalletBalance);
router.post('/cashout', addCashout);
router.get('/transactions', getTransactions);

// Job Management
router.get('/search',  searchJobs);
router.post('/', authMiddleware, createJob);
router.get('/', getAllJobs);
router.get('/:id', authMiddleware, getJobById); 
router.put('/:id', authMiddleware, updateJob); 
router.delete('/:id',authMiddleware,  deleteJob); 

// Shift Management
router.post('/:jobId/apply',  applyForJob); // Apply for a shift
router.post('/:jobId/cancel', authMiddleware, cancelApplication); // Cancel an application



module.exports = router;
