const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middlewares/auth');
const {
  createJob,
  getAllJobs,
  getJobs,
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
  getJobDetails,
  // getOngoingShifts,
  // getCompletedShifts,
  // getCanceledShifts,
  getLinkedBanks,
  addBank,
  getWalletBalance,
  addCashout,
  getTransactions,
  getEmployersList
} = require('../controllers/jobController');


// Shift Management
// router.get('/ongoing',  getOngoingShifts);
// router.get('/completed',  getCompletedShifts);  
// router.get('/canceled',  getCanceledShifts);

router.get('/ongoing', authMiddleware, getOngoingJobs);
router.get('/completed',authMiddleware,  getCompletedJobs);
router.get('/cancelled', authMiddleware, getCancelledJobs);
router.post('/markComplete', authMiddleware, markApplicationCompleted);
router.get('/details/:applicationId', authMiddleware, getJobDetails);

// Bank Management
router.get('/banks', getLinkedBanks);
router.post('/banks', addBank);

// Wallet Management
router.get('/balance', getWalletBalance);
router.post('/cashout', addCashout);
router.get('/transactions', getTransactions);

// Job Management
router.get('/search',  searchJobs);
router.get('/employers',  getEmployersList);
router.post('/', authMiddleware, createJob);
router.get('/', getAllJobs);
router.get('/', authMiddleware, getJobs);
router.get('/:id', authMiddleware, getJobById); 
router.put('/:id', authMiddleware, updateJob); 
router.delete('/:id',authMiddleware,  deleteJob); 

// Shift Management
router.post('/:jobId/apply',  authMiddleware, applyForJob); // Apply for a shift
router.post('/:jobId/cancel', authMiddleware, cancelApplication); // Cancel an application



module.exports = router;
