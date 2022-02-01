const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const supplierController = require('../../controllers/administration-features/suppliers');


router.post('/get-supplier-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.getSupplierList
);

router.get('/get-suppliers',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.getSuppliers
);

router.post('/get-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.getSupplier
);

router.post('/add-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.addSupplier
);

router.post('/update-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.updateSupplier
);

router.post('/delete-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.deleteSupplier
);

router.get('/get-supplier-types',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.getSupplierTypes
);

/* 
router.get('/export-suppliers',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.exportSuppliers
);

// Import Suppliers
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
      cb(null, 'SuppliersData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-suppliers",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  supplierController.importSuppliers
);
 */

module.exports = router;
