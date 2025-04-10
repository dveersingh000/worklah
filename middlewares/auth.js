const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/User"); 
const Admin = require("../models/Admin");
dotenv.config();

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ If admin login (role only)
    if (decoded.role === "ADMIN" && !decoded._id && !decoded.id) {
      const adminDoc = await Admin.findOne({ email: "admin@example.com" });
      req.user = {
        email: "admin@example.com",
        fullName: "Admin",
        role: "ADMIN",
        profilePicture: adminDoc?.profilePicture || "/assets/profile.svg"
      };
      return next();
    }

    // ✅ Regular user (app)
    const user = await User.findById(decoded.id || decoded._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized: Token has expired" });
    }
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// ✅ Optional: Add admin-only protection (use in routes)
const adminOnlyMiddleware = (req, res, next) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
};

module.exports = { authMiddleware, adminOnlyMiddleware };
