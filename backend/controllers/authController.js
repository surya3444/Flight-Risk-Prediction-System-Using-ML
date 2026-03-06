const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp'); // Import the new model
const sendEmail = require('../utils/sendEmail');

// 1. NEW: Generate and Send OTP
exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists with this email' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this email to prevent duplicates
    await Otp.deleteMany({ email });

    // Save the new OTP to the database
    const otpRecord = new Otp({ email, otp });
    await otpRecord.save();

    // Send the email
    const emailText = `Welcome to FlightRisk AI! Your verification code is: ${otp}. This code will expire in 5 minutes.`;
    await sendEmail(email, 'Your Verification Code', emailText);

    res.status(200).json({ success: true, msg: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// 2. UPDATED: Verify OTP and Register User
exports.registerUser = async (req, res) => {
  const { username, email, password, otp } = req.body; // Now requires OTP from the frontend

  try {
    // Find the OTP record in the DB
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    // Double check user doesn't exist (just in case)
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create the user
    user = new User({ username, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // Delete the OTP now that it has been used successfully
    await Otp.deleteMany({ email });

    // Generate JWT and log them in
    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


// Login existing user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};