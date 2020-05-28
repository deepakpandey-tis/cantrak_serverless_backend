const { Router } = require("express");

const router = Router();
const authMiddleware = require("../../middlewares/auth");
const storageController = require("../../controllers/administration-features/storage");

router.post(
  "/add-storage",
  authMiddleware.isAuthenticated,
  storageController.addStorage
);
router.post(
  "/get-storage-list",
  authMiddleware.isAuthenticated,
  storageController.getStorageList
);
router.post(
  "/get-storage-details",
  authMiddleware.isAuthenticated,
  storageController.getStorageDetailsById
);
router.post(
  "/update-storage",
  authMiddleware.isAuthenticated,
  storageController.updateStorage
);
router.post(
  "/import-storage-data",
  authMiddleware.isAuthenticated,
  storageController.importStorageData
);
router.get(
  "/export-storage-data",
  authMiddleware.isAuthenticated,
  storageController.exportStorageData
);
router.post("/toggle-storage",
authMiddleware.isAuthenticated,
storageController.toggleStorage
)
module.exports = router;
