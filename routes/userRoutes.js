const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
// const { auth } = require("../middlewares/auth");
const {authMiddleware} = require('../middlewares/auth');
const { authenticated } = require('../controllers/userController');

// Routes
router.post("/register", userController.registerUser);
router.get("/", userController.getAllUsers);
router.get("/:email", userController.getUserByEmail);
router.post("/login", userController.loginUser);
// router.get('/authenticated', authMiddleware,  userController.authenticated);
router.get('/authenticated', authMiddleware, authenticated);
router.patch("/:id", userController.updateUser);
router.post("/logout", userController.logoutUser);

module.exports = router;