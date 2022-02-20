const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const locationController = require('../../controllers/administration-features/locations');


router.post('/get-location-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  locationController.getLocationList
);

router.post('/get-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  locationController.getLocations
);

router.post('/get-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  locationController.getLocation
);

router.post('/add-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  locationController.addLocation
);

router.post('/update-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  locationController.updateLocation
);

router.post('/toggle-location-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  locationController.toggleLocationStatus
);

router.post('/delete-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  locationController.deleteLocation
);

module.exports = router;
