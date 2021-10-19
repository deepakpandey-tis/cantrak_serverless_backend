const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const plantController = require('../controllers/plants');


router.post('/get-lot-plant-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getLotPlantList
);

router.get('/get-plants',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlants
);

router.post('/get-plant',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlant
);

router.post('/add-plant',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.addPlant
);

router.post('/delete-plant',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.deletePlant
);

router.post('/get-plant-lot-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlantLotList
);

router.post('/get-plant-lot',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlantLot
);

router.post('/get-plant-lots',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlantLots
);

router.post('/get-plant-existig-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlantExistingGrowthStages
);

router.post('/change-growth-stage',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.changeGrowthStage
);

router.post('/check-lot-name-exists',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.checkLotNameExists
);

router.post('/get-plant-lot-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlantLotLocations
);

router.post('/get-growth-stage-txn-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getGrowthStageTxnList
);

router.post('/change-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.changeLocation
);

router.post('/get-location-txn-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getLocationTxnList
);

router.post('/waste-entry',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.wasteEntry
);

router.post('/get-waste-txn-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getWasteTxnList
);

router.post('/get-waste-txn',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getWasteTxn
);

module.exports = router;
