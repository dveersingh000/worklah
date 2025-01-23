const express = require('express');
const { getShiftCancellationDetails, cancelShift } = require('../controllers/cancellationController');
const router = express.Router();

router.get('/:jobId', getShiftCancellationDetails);
router.post('/cancel', cancelShift);

module.exports = router;