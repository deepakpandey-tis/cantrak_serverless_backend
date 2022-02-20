const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const containerTypeController = require('../../controllers/administration-features/container-types');


router.post('/get-container-type-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  containerTypeController.getContainerTypeList
);

router.get('/get-container-types',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  containerTypeController.getContainerTypes
);

router.get('/get-container-type',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  containerTypeController.getContainerType
);

router.post('/add-container-type',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  containerTypeController.addContainerType
);

router.post('/update-container-type',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  containerTypeController.updateContainerType
);

router.post('/toggle-container-type-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  containerTypeController.toggleContainerTypeStatus
);

router.post('/delete-container-type',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  containerTypeController.deleteContainerType
);

module.exports = router;
