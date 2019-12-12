const express = require("express")

const router = express.Router()
const authMiddleware = require('../middlewares/auth')
const assetController = require("../controllers/asset")
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware')


router.post(
  "/add-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addAsset
);
router.post('/get-asset-list', 
authMiddleware.isAuthenticated, 
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isAssetAccessible,
assetController.getAssetList
)
router.get(
  "/get-all-asset-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAllAssetList
);
router.post(
  "/get-asset-list-by-category",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAssetListByCategory
);
router.post(
  "/get-asset-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAssetDetails
);
router.post(
  "/update-asset-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.updateAssetDetails
);
router.post(
  "/update-asset-location",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.updateAssetLocation
);
router.post(
  "/add-service-order-replace-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addServiceOrderReplaceAsset
);
router.post(
  "/add-service-request-replace-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addServiceRequestReplaceAsset
);
router.post(
  "/add-service-order-relocate-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addServiceOrderRelocateAsset
);
router.post(
  "/add-service-request-relocate-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addServiceRequestRelocateAsset
);
router.get(
  "/search-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.assetSearch
);
// Export Asset Data 
router.post(
  "/export-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.exportAsset
);
router.post(
  "/get-asset-categories",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAssetCategories
);
router.post(
  "/get-asset-list-by-location",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAssetListByLocation
);

module.exports = router
