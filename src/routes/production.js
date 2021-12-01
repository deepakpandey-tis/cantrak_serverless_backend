const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const productionController = require('../controllers/production');


router.post('/add-production',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  productionController.addProduction
);

router.post('/get-production-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  productionController.getProductionList
);

router.post('/get-production-lot-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  productionController.getProductionLotList
);

router.post('/get-production-lot',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  productionController.getProductionLot
);

module.exports = router;
