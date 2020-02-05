const { Router } = require("express")
const path = require("path");


const router = Router()
const authMiddleware = require('../../middlewares/auth')
const propertyUnitController = require('../../controllers/administration-features/property-unit')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')

router.post('/add-property-unit',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.addPropertyUnit)

router.post('/update-property-unit',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.updatePropertyUnit)

router.post('/view-property-unit',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.viewPropertyUnit)

router.post('/delete-property-unit',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.deletePropertyUnit)

router.post('/get-unit-by-floor',
  authMiddleware.isAuthenticated,
  //roleMiddleware.parseUserPermission,
  //resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.getPropertyUnitListByFloor)

router.post('/get-property-unit-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.getPropertyUnitList)

//PROPERTY UNIT LIST DROPDOWN
router.get('/get-propert-unit-all-list',
  propertyUnitController.getPropertyUnitAllList)
//  Export Property Unit Data

router.get('/export-property-unit',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.exportPropertyUnit)

// PROPERTY UNIT DETAILS
router.post('/get-property-unit-details',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.getPropertyUnitDetails)

router.post("/check-house-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.checkHouseId);


/**IMPORT property unit DATA */
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
      cb(null, 'propertyUnitData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-property-unit-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  propertyUnitController.importPropertyUnitData
);

/*GET ALL PROPERTY UNIT LIST FOR DROP DOWN */
router.get("/get-all-property-unit",
  authMiddleware.isAuthenticated,
  //roleMiddleware.parseUserPermission,
  //resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.getAllPropertyUnit);

router.post('/toggle-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  propertyUnitController.toggleStatus);

module.exports = router

