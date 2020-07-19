const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');

const notificationController = require('../controllers/notification');


/* Teams Routers Function. */

router.get('/get-unread-count', authMiddleware.isAuthenticated, notificationController.getUnreadNotificationCount);

router.get('/get-unread-notification', authMiddleware.isAuthenticated, notificationController.getUnreadNotifications);

router.get('/clear-all', authMiddleware.isAuthenticated, notificationController.clearAllNotifications);

router.post('/mark-clicked', authMiddleware.isAuthenticated, notificationController.markAsClicked);


module.exports = router;
