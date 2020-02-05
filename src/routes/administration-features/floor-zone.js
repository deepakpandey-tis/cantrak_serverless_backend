const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const floorZoneController = require('../../controllers/administration-features/floor-zone')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')

router.post('/add-floor-zone',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  floorZoneController.addFloorZone)

router.post('/update-floor-zone',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  floorZoneController.updateFloorZone)

router.post('/view-floor-zone',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  floorZoneController.viewFloorZone)

router.post('/delete-floor-zone',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  floorZoneController.deleteFloorZone)

router.post('/get-floor-zone-list-by-building-id',
  authMiddleware.isAuthenticated,
  floorZoneController.getFloorZoneListByBuildingId)

router.post('/get-floor-zone-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  floorZoneController.getFloorZoneList)
// Export Floor Zone Data
router.get('/export-floor-zone',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  floorZoneController.exportFloorZone)

router.get('/get-floor-zone-all-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  floorZoneController.getFloorZoneAllList)
  
/**IMPORT FLOOR/ZONE DATA */
const path = require('path');
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
      cb(null, 'floorZoneData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post('/import-floor-zone-data', upload.single('file'),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  floorZoneController.importFloorZoneData)


module.exports = router