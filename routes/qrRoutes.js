const express = require('express');
const router = express.Router();
const { validateQRCode, clockInOut } = require('../controllers/qrController');
const {authMiddleware} = require('../middlewares/auth');



router.post('/validate', authMiddleware, validateQRCode);
router.post('/clock', authMiddleware, clockInOut);

module.exports = router;
