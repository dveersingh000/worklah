const Notification = require('../models/Notification');

// Fetch notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('type message isRead icon createdAt');

    // const totalNotifications = await Notification.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
       notifications,
      // totalNotifications,
      // totalPages: Math.ceil(totalNotifications / limit),
      // currentPage: Number(page),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id; // User from auth middleware

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { read: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//count unread notification
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    res.status(200).json({ unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification', details: error.message });
  }
};

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const { title, message, user } = req.body;

    const notification = new Notification({ title, message, user });
    await notification.save();

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification', details: error.message });
  }
};
