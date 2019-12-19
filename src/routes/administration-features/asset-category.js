const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
// const resourceAcessMiddleware = require('../../middlewares/resourceAccessMiddleware')
const assetCategoryController = require('../../controllers/administration-features/asset-category')

router.post('/add-asset-category', authMiddleware.isAuthenticated, assetCategoryController.addAssetCategory)
router.post('/update-asset-category', authMiddleware.isAuthenticated, assetCategoryController.updateAssetCategory)
router.post('/asset-category-details', authMiddleware.isAuthenticated, assetCategoryController.viewAssetCategory)
router.post('/delete-asset-category', authMiddleware.isAuthenticated, assetCategoryController.deleteAssetCategory)
/// Export Asset Category Data 
router.get('/export-asset-category', authMiddleware.isAuthenticated, assetCategoryController.exportAssetCategory)

router.get('/get-asset-category-list',authMiddleware.isAuthenticated,assetCategoryController.getAssetCategoryList)



/**IMPORT Building DATA */
let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
           tempraryDirectory = 'tmp/';
         } else {
           tempraryDirectory = '/tmp/';  
         }
var multer  = require('multer');
var storage = multer.diskStorage({
	destination: tempraryDirectory,
	filename: function ( req, file, cb ) {
        let ext =  path.extname(file.originalname)
        if(ext=='.csv'){
        time = Date.now();
        cb( null, 'assetCategoryData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post(
  "/import-asset-category-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  assetCategoryController.importAssetCategoryData
);

module.exports = router