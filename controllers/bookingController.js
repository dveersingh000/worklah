const Booking = require("../models/Booking");
const Shift = require("../models/Shift");
const User = require("../models/User");

exports.bookShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shiftId } = req.body;

    // Check if profile is completed
    const user = await User.findById(userId);
    if (!user.profileCompleted) {
      return res.status(400).json({ error: "Complete your profile before booking a shift." });
    }

    // Check if shift exists
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({ error: "Shift not found." });
    }

    // Create booking
    const booking = new Booking({ userId, shiftId });
    const savedBooking = await booking.save();

    res.status(201).json({ message: "Shift booked successfully.", booking: savedBooking });
  } catch (err) {
    res.status(500).json({ error: "Failed to book shift.", details: err.message });
  }
};
