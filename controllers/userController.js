const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");

const { createToken, setCookie, clearCookie } = require("../utils/auth");
// const crypto = require("crypto");
// const sendSms = require("../utils/sendSms"); 


dotenv.config();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'adminpassword';

// Register a new user
exports.registerUser = async (req, res) => {
    const { fullName, email, password , phoneNumber, employmentStatus, role} = req.body;
    try {
        const ifUserExists = await User.findOne({ email });
        if (ifUserExists) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            fullName,
            email,
            password: hashedPassword,
            phoneNumber,
            employmentStatus,
            role
        });
        await user.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error creating user", error });
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
    }
};

// Get user by email
exports.getUserByEmail = async (req, res) => {
    const { email } = req.params;
    try {
        const user = await User.findOne({ email }).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error });
    }
};

// Login user
exports.loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Admin login
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = createToken({ role: 'ADMIN' });
        setCookie(res, token);
        return res.json({
          token, // ✅ send token to frontend explicitly
          user: {
            email: ADMIN_EMAIL,
            fullName: 'Admin',
            role: 'ADMIN'
          }
        });
      }
  
      // User login
const user = await User.findOne({ email });
const isMatch = user && await bcrypt.compare(password, user.password);

if (!user || !isMatch) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

  
      user.lastLogin = new Date();
      await user.save();
  
      const token = createToken({ _id: user._id, role: user.role });
      setCookie(res, token);
      res.json({
        token, // ✅ send token to frontend explicitly
        user: {
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
  

// Update user
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (name) user.name = name;
        if (email) user.email = email;
        if (password) user.password = await bcrypt.hash(password, 10);
        await user.save();
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Error updating user", error });
    }
};


exports.authenticated = async (req, res) => {
    res.json(req.user);
  };
// exports.generateOtp = async (req, res) => {
//     const { mobile } = req.body;
//     try {
//         const otp = crypto.randomInt(100000, 999999).toString();
//         const hashedOtp = await bcrypt.hash(otp, 10);



//Logout
exports.logoutUser = async (req, res) => {
    try {
      clearCookie(res); // Remove auth cookie
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  };