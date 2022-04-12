const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const subLocationController = require('../../controllers/administration-features/sub-locations');


router.post('/get-sub-location-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  subLocationController.getSubLocationList
);

router.post('/get-sub-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  subLocationController.getSubLocations
);

router.post('/get-sub-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  subLocationController.getSubLocation
);

router.post('/add-sub-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  subLocationController.addSubLocation
);

router.post('/update-sub-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  subLocationController.updateSubLocation
);

router.post('/toggle-sub-location-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  subLocationController.toggleSubLocationStatus
);

router.post('/delete-sub-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  subLocationController.deleteSubLocation
);

router.post('/import-sub-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  subLocationController.importSubLocations
);

module.exports = router;
