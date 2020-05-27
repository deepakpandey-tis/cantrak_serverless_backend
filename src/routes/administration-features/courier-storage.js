const { Router } = require("express");

const router = Router();

const authMiddleware = require("../../middlewares/auth");
const courierStorageController = require("../../controllers/administration-features/courier-storage");
router.post(
  "/add-courier",
  authMiddleware.isAuthenticated,
  courierStorageController.addCourier
);
router.post(
  "/get-courier-list",
  authMiddleware.isAuthenticated,
  courierStorageController.getCourierList
);
router.post(
  "get-courier-detail",
  authMiddleware.isAuthenticated,
  courierStorageController.getCourierDetailById
);

module.exports = router;
