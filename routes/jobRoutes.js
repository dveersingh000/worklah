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
  // getOngoingJobs,
  // getCompletedJobs,
  // getCancelledJobs,
  cancelApplication,
  searchJobs,
  getOngoingShifts,
  getCompletedShifts,
  getCanceledShifts,
  getLinkedBanks,
  addBank,
  getWalletBalance,
  addCashout,
  getTransactions
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
// router.get('/ongoing', authMiddleware, getOngoingJobs);
// router.get('/completed',authMiddleware,  getCompletedJobs);
// router.get('/cancelled', authMiddleware, getCancelledJobs);

// Shift Management
router.get('/ongoing',  getOngoingShifts);
router.get('/completed',  getCompletedShifts);  
router.get('/canceled',  getCanceledShifts);

router.get('/banks', getLinkedBanks);
router.post('/banks',  addBank);

router.get('/balance',  getWalletBalance);
router.post('/cashout', addCashout);
router.get('/transactions', getTransactions);


module.exports = router;
