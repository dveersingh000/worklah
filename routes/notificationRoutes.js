const express = require('express');
const {
  getNotifications,
  markAsRead,
  getUnreadCount,
  deleteNotification,
  createNotification,
} = require('../controllers/notificationController');
const {authMiddleware}  = require('../middlewares/auth'); 

const router = express.Router();

router.get('/', authMiddleware, getNotifications); 
router.patch('/:id/read',authMiddleware,  markAsRead); 
router.get('/unread',authMiddleware,  getUnreadCount);
router.delete('/:id',  deleteNotification); 
router.post('/', createNotification); 

module.exports = router;
