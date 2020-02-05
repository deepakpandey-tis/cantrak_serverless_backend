const { Router } = require("express")
const path = require("path");

const router = Router()
const authMiddleware = require('../../middlewares/auth')

const buildingPhaseController = require('../../controllers/administration-features/building-phase')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')

router.post('/add-building-phase',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  buildingPhaseController.addBuildingPhase)

router.post('/update-building-phase',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  buildingPhaseController.updateBuildingPhase)

router.post('/view-building-phase',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  buildingPhaseController.viewBuildingPhase)

router.post('/delete-building-phase',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  buildingPhaseController.deleteBuildingPhase)

router.post('/get-building-phase-by-project-id',
  authMiddleware.isAuthenticated,
  buildingPhaseController.getBuildingPhaseListByProjectId)

router.post('/get-building-phase-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  buildingPhaseController.getBuildingPhaseList)
// Export Building Phase
router.get('/export-building-phase',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  buildingPhaseController.exportBuildingPhase)

router.get('/get-buildings-phases-all-list',
  authMiddleware.isAuthenticated,
  buildingPhaseController.getBuildingPhaseAllList)



/**IMPORT Building DATA */
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
      cb(null, 'buildingPhaseData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-building-data",
  // upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  buildingPhaseController.importBuildingData
);



module.exports = router