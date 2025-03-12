const express = require('express');
const { generateOtp, registerUser, resendOtp, validateToken } = require('../controllers/authController');
const { login, getAllUsers, getUserDynamicDetails } = require('../controllers/authController');
const {authMiddleware} = require('../middlewares/auth');

const router = express.Router();

// ✅ Token validation route
router.get("/validate", validateToken);
router.post('/generate-otp', generateOtp);
router.post('/register', registerUser);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/users', authMiddleware,  getAllUsers);
router.get('/users/:id', authMiddleware, getUserDynamicDetails);
// router.get('/', authMiddleware, getUserDynamicDetails);

module.exports = router;
