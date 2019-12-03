const {Router} = require("express");
const pushNotificationController = require('../controllers/push-notification');
const authMiddleware = require('../middlewares/auth');


const router = Router();

router.post('/subscribe', authMiddleware.isAuthenticated, pushNotificationController.subscribeUserForPush)
module.exports = router;