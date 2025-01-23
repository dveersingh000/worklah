const express = require('express');
const { getWithdrawals, createWithdrawal } = require('../controllers/withdrawalController');
const router = express.Router();

router.get('/', getWithdrawals);
router.post('/', createWithdrawal);

module.exports = router;
