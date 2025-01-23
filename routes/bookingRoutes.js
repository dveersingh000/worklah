const express = require("express");
const { bookShift } = require("../controllers/bookingController");
const {authMiddleware} = require("../middlewares/auth");

const router = express.Router();

router.post("/book-shift", authMiddleware, bookShift);

module.exports = router;
