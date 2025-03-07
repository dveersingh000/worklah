const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: false },
    type: {
      type: String,
      enum: ['Job', 'Payment', 'Message', 'Alert', 'Admin Update'],
      required: true,
    },
    icon: {
      type: String,
      default: '/static/notificationIcon.png',
    },
    title: { type: String, required: true }, 
    message: { type: String, required: false }, 
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
