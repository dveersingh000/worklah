const express = require("express");
const { createShift, getShiftAvailability, getShiftById, updateShift, deleteShift, getJobShifts, getJobDetails } = require("../controllers/shiftController");
const router = express.Router();
const {authMiddleware} = require("../middlewares/auth");

router.post("/", createShift); 
router.get("/", authMiddleware, getShiftAvailability); 
router.get("/:shiftId", getShiftById);
router.put("/:shiftId", updateShift);
router.delete("/:shiftId", deleteShift);
router.get("/:jobId",authMiddleware, getJobShifts);
router.get('/job/:jobId', getJobDetails);

module.exports = router;






// // routes/shiftRoutes.js
// const express = require('express');
// const {
//   getJobDetails,
//   getAvailableShifts,
//   applyForShift,
//   getPenaltyInfo,
//   processPayment,
//   getTermsAndConditions,
//   getProfileStatus,
//   getShiftBookingStatus,
//   getJobCancellationPolicy,
//   getOngoingShifts,
//   getCompletedShifts,
//   getCanceledShifts
// } = require('../controllers/shiftController');
// const router = express.Router();

// router.get('/details', getJobDetails);
// router.get('/available', getAvailableShifts);
// router.post('/apply', applyForShift);
// router.get('/penalties/info', getPenaltyInfo);
// router.post('/payment', processPayment);
// router.get('/terms-and-conditions', getTermsAndConditions);
// router.get('/profile/status', getProfileStatus);
// router.get('/booking/status', getShiftBookingStatus);
// router.get('/cancellation-policy', getJobCancellationPolicy);
// router.get('/ongoing', getOngoingShifts);
// router.get('/completed', getCompletedShifts);
// router.get('/canceled', getCanceledShifts);

// module.exports = router;
