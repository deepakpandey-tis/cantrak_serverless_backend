const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const licenseController = require('../../controllers/administration-features/licenses');


router.post('/get-license-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.getLicenseList
);

router.get('/get-licenses',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.getLicenses
);

router.post('/get-license',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.getLicense
);

router.post('/add-license',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.addLicense
);

router.post('/update-license',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.updateLicense
);

router.post('/delete-license',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.deleteLicense
);

/* 
router.get('/export-licenses',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.exportLicenses
);

// Import Licenses
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
      cb(null, 'LicensesData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-licenses",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.importLicenses
);
 */

router.get('/get-license-types',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.getLicenseTypes
);

router.get('/get-license-categories',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  licenseController.getLicenseCategories
);

module.exports = router;
