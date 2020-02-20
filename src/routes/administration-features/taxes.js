const express = require('express');
const router = express.Router();
const path = require("path");


const taxesController = require('../../controllers/administration-features/taxes');

const authMiddleware = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')


/* GET users listing. */

router.post('/add-taxes',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isBillingAccessible,
  taxesController.addTaxes);

router.post('/update-taxes',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isBillingAccessible,
  taxesController.updateTaxes);

router.post('/get-taxes-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isBillingAccessible,
  taxesController.getTaxesList);

router.post('/delete-taxes',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isBillingAccessible,
  taxesController.deleteTaxes);

router.post('/get-taxes-details',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isBillingAccessible,
  taxesController.viewTaxDetails);

router.get('/export-tax-data',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isBillingAccessible,
  taxesController.exportTaxeData);

router.get('/get-tax-list-details',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isBillingAccessible,
  taxesController.getTaxesListDetails);




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
      cb(null, 'taxData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-tax-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isBillingAccessible,
  taxesController.importTaxData
);
module.exports = router;
