const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const storageLocationController = require('../../controllers/administration-features/storage-locations');


router.post('/get-storage-location-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  storageLocationController.getStorageLocationList
);

router.get('/get-storage-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  storageLocationController.getStorageLocations
);

router.post('/get-storage-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  storageLocationController.getStorageLocation
);

router.post('/add-storage-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  storageLocationController.addStorageLocation
);

router.post('/update-storage-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  storageLocationController.updateStorageLocation
);

router.post('/delete-storage-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  storageLocationController.deleteStorageLocation
);

module.exports = router;
