const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const agmController = require("../controllers/agm");

router.post(
  "/save-announcement-notification",
  authMiddleware.isAuthenticated,
  agmController.saveAnnouncementNotifications
);

router.get('/generate-announcement-id', authMiddleware.isAuthenticated, agmController.generateAnnouncementId);

router.post('/save-announcement-as-draft', authMiddleware.isAuthenticated, agmController.saveAnnouncementAsDraft)

router.post('/get-announcement-list', authMiddleware.isAuthenticated, agmController.getAnnouncementList)

router.post('/get-announcement-details', authMiddleware.isAuthenticated, agmController.getAnnouncementDeatails)

router.post('/delete-announcement', authMiddleware.isAuthenticated, agmController.deleteAnnouncementById)

router.post('/resend-announcement-notification', authMiddleware.isAuthenticated, agmController.resendAnnouncementNotification)
module.exports = router;
