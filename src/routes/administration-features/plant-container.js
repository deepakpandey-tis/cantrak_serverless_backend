const { Router } = require("express")
const path = require("path");


const router = Router()
const authMiddleware = require('../../middlewares/auth')
const plantContainerController = require('../../controllers/administration-features/plant-container')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')

router.post('/add-plant-container',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantContainerController.addPlantContainer)

router.post('/update-plant-container',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantContainerController.updatePlantContainer)

router.post('/view-plant-container',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantContainerController.viewPlantContainer)

router.post('/delete-plant-container',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantContainerController.deletePlantContainer)

router.post('/get-plant-container-list-by-group',
  authMiddleware.isAuthenticated,
  plantContainerController.getPlantContainerListByGroup)

router.post('/get-plant-container-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantContainerController.getPlantContainerList)

router.get('/get-plant-container-all-list',
  plantContainerController.getPlantContainerAllList)

// router.get('get-plant-container-list-report',authMiddleware.isAuthenticated,plantContainerController.getPlantContainerListForReport)
//  Export Property Unit Data

router.get('/export-plant-container',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantContainerController.exportPlantContainer)

router.post('/get-plant-container-detail',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantContainerController.getPlantContainerDetail)

  /* pg888: not required
router.post("/check-house-id",
  authMiddleware.isAuthenticated,
  plantContainerController.checkHouseId);
  */

router.post("/get-building-and-unit",authMiddleware.isAuthenticated,plantContainerController.getUnitAndBuildingByUserId)


/**IMPORT DATA */
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
      cb(null, 'plantContainerData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-plant-container-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  plantContainerController.importPlantContainerData
);

router.get("/get-all-plant-container",
  authMiddleware.isAuthenticated,
  plantContainerController.getAllPlantContainer);

router.post('/toggle-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantContainerController.toggleStatus);

router.post('/get-plant-container-by-multiple-group', authMiddleware.isAuthenticated, plantContainerController.getPlantContainersByMultipleGroup);

router.post('/get-plant-container-common-area-by-group',
  authMiddleware.isAuthenticated,
  plantContainerController.getPlantContainerCommonAreaByGroup)

module.exports = router

