const express = require('express');
const router = express.Router();

const commonAreaController = require('../../controllers/administration-features/common-area');

const authMiddleware = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')

/* GET users listing. */

router.post(
  "/add-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  commonAreaController.addCommonArea
);
router.post(
  "/update-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  commonAreaController.updateCommonArea
);
router.post(
  "/get-common-area-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  commonAreaController.getCommonAreaList
);
router.post(
  "/delete-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  commonAreaController.deleteCommonArea
);
router.post(
  "/view-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  commonAreaController.getdetailsCommonArea
);
// Export Common Area 
router.post(
  "/export-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  commonAreaController.exportCommonArea
);

/**IMPORT COMMON AREA DATA */
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
      cb(null, 'CommonAreaData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-common-area-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  commonAreaController.importCommonAreaData
);

/**GET ALL LIST COMMON AREA BY FLOOR ID */
router.get(
  "/get-common-area-all-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  commonAreaController.getCommonAreaAllList
);

module.exports = router;
