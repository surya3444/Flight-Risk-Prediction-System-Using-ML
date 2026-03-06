const express = require('express');
const router = express.Router();
const { registerUser, loginUser, sendOtp } = require('../controllers/authController');

// POST /api/auth/send-otp
router.post('/send-otp', sendOtp);

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

module.exports = router;