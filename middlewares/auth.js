const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/User"); 
dotenv.config();

// Authentication Middleware
// const authMiddleware = async (req, res, next) => {
//   try {
//     const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({ error: "Authentication required." });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     if (decoded.role === "ADMIN") {
//       req.user = { role: "ADMIN", email: "admin@example.com", fullName: "Admin" };
//     } else {
//       const user = await User.findOne({ _id: decoded._id, role: decoded.role });

//       if (!user) {
//         return res.status(404).json({ error: "User not found." });
//       }

//       req.user = { email: user.email, fullName: user.fullName, role: user.role };
//     }

//     next();
//   } catch (error) {
//     return res.status(401).json({ error: "Invalid token or authentication failed." });
//   }
// };

// // Admin-Only Middleware
// const adminOnly = (req, res, next) => {
//   if (req.user.role !== "ADMIN") {
//     return res.status(403).json({ error: "Access denied. Admin only." });
//   }
//   next();
// };

// module.exports = { authMiddleware, adminOnly };


const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; 
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
// 6790e9ed5e4bb2ef37a3c99c
// console.log(token);
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(decoded);
    const user = await User.findById(decoded.id).select("-password");
    // console.log(user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user; 
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized: Token has expired" });
    }

    console.error(error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }

};


module.exports ={authMiddleware};