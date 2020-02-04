const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')
const partCategoryController = require('../../controllers/administration-features/part-category')

router.post('/add-part-category',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partCategoryController.addPartCategory)

router.post('/update-part-category',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partCategoryController.updatePartCategory)

router.post('/part-category-details',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partCategoryController.viewPartCategory)

router.post('/delete-part-category',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partCategoryController.deletePartCategory)
/// Export Asset Category Data 
router.get('/export-part-category',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partCategoryController.exportPartCategory)

router.get('/get-part-category-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partCategoryController.getPartCategoryList)




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
      cb(null, 'partCategoryData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-part-category-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partCategoryController.importPartCategoryData
);

module.exports = router