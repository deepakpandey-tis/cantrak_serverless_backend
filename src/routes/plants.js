const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const plantController = require('../controllers/plants');


router.post('/get-plant-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlantList
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

/* 
router.get('/export-plants',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.exportPlants
);

// Import Plants
let tempraryDirectory = null;
if (process.env.IS_OFFLINE) {
  tempraryDirectory = 'tmp/';
} else {
  tempraryDirectory = '/tmp/';
}
var multer = require('multer');
var storage = multer.diskStorage({
  destination: tempraryDirectory,
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname)
    if (ext == '.csv') {
      time = Date.now();
      cb(null, 'PlantsData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-plants",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.importPlants
);
 */

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

router.post('/get-plant-lot-groups',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  plantController.getPlantLotGroups
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

module.exports = router;
