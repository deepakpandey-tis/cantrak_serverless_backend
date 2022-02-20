const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const unitOfMeasurementController = require('../../controllers/administration-features/ums');

router.post('/get-um-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  unitOfMeasurementController.getUMList
);

router.get('/get-ums',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  unitOfMeasurementController.getUMs
);

router.get('/get-um',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  unitOfMeasurementController.getUM
);

router.post('/add-um',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  unitOfMeasurementController.addUM
);

router.post('/update-um',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  unitOfMeasurementController.updateUM
);

router.post('/toggle-um',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  unitOfMeasurementController.toggleUM
);

router.post('/delete-um',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  unitOfMeasurementController.deleteUM
);

module.exports = router;
