const notificationController = require('../controllers/notification');

const socketRoutes = {
    'get-unread-notifications' : notificationController.getUnreadNotifications
};

module.exports = socketRoutes;