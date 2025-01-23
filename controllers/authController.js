const User = require('../models/User');
const { verifyOTP, sendOTP } = require('../utils/otpUtils');
const { generateToken } = require('../utils/jwtUtils');
const Notification = require('../models/Notification');

exports.getUserDynamicDetails = async (req, res) => {
  try {
    // const userId = req.user.id;
    const userId = req.params.id;

    // Fetch unread notifications count
    const unreadNotifications = await Notification.countDocuments({ user: userId, read: false });

    res.status(200).json({
      unreadNotifications,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  try {
    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP using Twilio
    const isValidOtp = await verifyOTP(phoneNumber, otp);
    if (!isValidOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Generate JWT token
    const token = generateToken({ id: user._id });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        employmentStatus: user.employmentStatus,
        profilePicture: user.profilePicture,
        profileCompleted: user.profileCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Generate OTP
exports.generateOtp = async (req, res) => {
  const { phoneNumber, fullName, email, employmentStatus } = req.body;

  try {
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }
    const user = await User.findOne({ phoneNumber });

    // Flag to indicate whether the user is registered
    const isRegistered = !!user;

    // Send OTP using Twilio
    const otpStatus = await sendOTP(phoneNumber);
    if (otpStatus !== 'pending') {
      return res.status(500).json({ message: 'Failed to send OTP. Try again later.' });
    }

    res.status(200).json({ 
      message: 'OTP sent successfully.',
      isRegistered, 
    });
  } catch (error) {
    console.error('Error generating OTP:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const user = await User.findOne({ phoneNumber });
    // if (!user) {
    //   return res.status(404).json({ message: 'User not found.' });
    // }

    // Send OTP using Twilio
    const otpStatus = await sendOTP(phoneNumber);
    if (otpStatus !== 'pending') {
      return res.status(500).json({ message: 'Failed to resend OTP. Try again later.' });
    }

    res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Register User
exports.registerUser = async (req, res) => {
  const { fullName, phoneNumber, email, employmentStatus, otp } = req.body;
  // console.log(req.body);

  try {
    // Validate required fields
    if (!fullName || !phoneNumber || !email || !employmentStatus || !otp) {
      return res.status(400).json({
        message: 'All fields are required.',
      });
    }
    const ifUserExists = await User.findOne({ phoneNumber });
    if (ifUserExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Verify OTP using Twilio
    const isValidOtp = await verifyOTP(phoneNumber, otp);
    if (!isValidOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = new User({ fullName, phoneNumber, email, employmentStatus });

    await user.save();
    res.status(200).json({ message: 'User registered successfully.'});

  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users
    res.status(200).json({ message: 'Users fetched successfully', users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

