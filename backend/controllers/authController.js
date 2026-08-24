const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp'); // Import the new model
const sendEmail = require('../utils/sendEmail');

// 1. NEW: Generate and Send OTP
exports.sendOtp = async (req, res) => {
  const rawEmail = req.body.email;
  if (!rawEmail) return res.status(400).json({ msg: 'An email address is required.' });

  // Stored normalised so the verification lookup cannot miss on case or spacing.
  const email = String(rawEmail).trim().toLowerCase();

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
  const { username, email, password, otp } = req.body;

  if (!username || !email || !password || !otp) {
    return res.status(400).json({ msg: 'Username, email, password and verification code are all required.' });
  }

  // Normalised the same way sendOtp stores it, so a stray space or a capital
  // letter between the two steps cannot look like a wrong code.
  const normalisedEmail = String(email).trim().toLowerCase();
  const normalisedOtp = String(otp).trim();
  const normalisedUsername = String(username).trim();

  try {
    const validOtp = await Otp.findOne({ email: normalisedEmail, otp: normalisedOtp });
    if (!validOtp) {
      return res.status(400).json({
        msg: 'That verification code is not valid, or it has expired. Codes last five minutes — request a new one.',
      });
    }

    // Both unique fields are checked up front. `username` has a unique index
    // but used to be checked nowhere, so a taken username surfaced as a
    // duplicate-key crash — and the frontend reported it as a bad OTP.
    const [emailTaken, usernameTaken] = await Promise.all([
      User.findOne({ email: normalisedEmail }),
      User.findOne({ username: normalisedUsername }),
    ]);

    if (emailTaken) {
      return res.status(400).json({ msg: 'An account already exists with this email address.' });
    }
    if (usernameTaken) {
      return res.status(400).json({ msg: `The username "${normalisedUsername}" is already taken. Choose another.` });
    }

    const salt = await bcrypt.genSalt(10);
    const user = await User.create({
      username: normalisedUsername,
      email: normalisedEmail,
      password: await bcrypt.hash(password, salt),
    });

    // Only consumed once the account actually exists, so a failed save leaves
    // the code usable for a retry.
    await Otp.deleteMany({ email: normalisedEmail });

    // username/email travel in the token so the UI can identify the operator
    // without an extra round trip — and so an incident acknowledgement has a name.
    const payload = { user: { id: user.id, username: user.username, email: user.email } };
    // Signed synchronously: the callback form threw from inside an async
    // callback, where the surrounding try/catch could never catch it.
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });

    return res.json({ token });
  } catch (err) {
    console.error('Registration failed:', err);

    // A unique index can still fire if two registrations race between the
    // check above and the insert.
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'account';
      return res.status(400).json({ msg: `That ${field} is already registered.` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ msg: Object.values(err.errors)[0]?.message || 'Invalid details.' });
    }

    return res.status(500).json({ msg: 'Could not create the account. Please try again.' });
  }
};

// Login existing user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // username/email travel in the token so the UI can identify the operator
    // without an extra round trip — and so an incident acknowledgement has a name.
    const payload = { user: { id: user.id, username: user.username, email: user.email } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });
    return res.json({ token });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ msg: 'Could not sign you in. Please try again.' });
  }
};