const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const announcementController = require("../controllers/announcement");

router.post(
  "/save-announcement-notification",
  authMiddleware.isAuthenticated,
  announcementController.saveAnnouncementNotifications
);

router.get('/generate-announcement-id',authMiddleware.isAuthenticated,announcementController.generateAnnouncementId);

router.post('/save-announcement-as-draft',authMiddleware.isAuthenticated,announcementController.saveAnnouncementAsDraft)

module.exports = router;
