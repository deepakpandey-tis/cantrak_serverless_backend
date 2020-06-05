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
  "/get-courier-detail",
  authMiddleware.isAuthenticated,
  courierStorageController.getCourierDetailById
);
router.post(
  "/update-courier",
  authMiddleware.isAuthenticated,
  courierStorageController.updateCourier
);
router.post(
  "/import-courier-data",
  authMiddleware.isAuthenticated,
  courierStorageController.importCourierData
);
router.get(
  "/export-courier-data",
  authMiddleware.isAuthenticated,
  courierStorageController.exportCourierData
);
router.post(
  "/toggle-courier",
  authMiddleware.isAuthenticated,
  courierStorageController.toggleCourier
);
router.get(
  "/courier-lists",
  authMiddleware.isAuthenticated,
  courierStorageController.getCourierListForParcel
);

module.exports = router;
