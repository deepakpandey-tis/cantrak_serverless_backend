const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const growthStageController = require('../../controllers/administration-features/growth-stages');


router.post('/get-growth-stage-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  growthStageController.getGrowthStageList
);

router.post('/get-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  growthStageController.getGrowthStages
);

router.post('/get-growth-stage',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  growthStageController.getGrowthStage
);

router.post('/add-growth-stage',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  growthStageController.addGrowthStage
);

router.post('/update-growth-stage',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  growthStageController.updateGrowthStage
);

router.post('/delete-growth-stage',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  growthStageController.deleteGrowthStage
);

module.exports = router;
