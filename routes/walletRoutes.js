const express = require('express');
const { getWalletBalance, getTransactionHistory, cashout } = require('../controllers/walletController');
const {authMiddleware} = require('../middlewares/auth');

const router = express.Router();

router.get('/balance', authMiddleware, getWalletBalance);
router.get('/transactions', authMiddleware, getTransactionHistory);
router.post('/cashout', authMiddleware, cashout);

module.exports = router;
