const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const announcementController = require("../controllers/announcement");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");

router.post(
  "/save-announcement-notification",
  authMiddleware.isAuthenticated,
  announcementController.saveAnnouncementNotifications
);

router.get(
  "/generate-announcement-id",
  authMiddleware.isAuthenticated,
  announcementController.generateAnnouncementId
);

router.post(
  "/save-announcement-as-draft",
  authMiddleware.isAuthenticated,
  announcementController.saveAnnouncementAsDraft
);

router.post(
  "/get-announcement-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAnnouncementAccessible,
  announcementController.getAnnouncementList
);

router.post(
  "/get-announcement-details",
  authMiddleware.isAuthenticated,
  announcementController.getAnnouncementDeatails
);

router.post(
  "/delete-announcement",
  authMiddleware.isAuthenticated,
  announcementController.deleteAnnouncementById
);

router.post(
  "/resend-announcement-notification",
  authMiddleware.isAuthenticated,
  announcementController.resendAnnouncementNotification
);
module.exports = router;
