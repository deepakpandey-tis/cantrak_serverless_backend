const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const processController = require('../../controllers/administration-features/processes/index.js');

router.post('/get-process-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  processController.getProcessList
);

router.get('/get-processes',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  processController.getProcesses
);

router.get('/get-process',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  processController.getProcess
);

router.post('/add-process',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  processController.addProcess
);

router.post('/update-process',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  processController.updateProcess
);

router.post('/toggle-process',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  processController.deleteProcess
);

module.exports = router;
