const express = require("express")

const router = express.Router()
const authMiddleware = require('../middlewares/auth')
const assetController = require("../controllers/asset")
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware')


router.post(
  "/add-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addAsset
);
router.post('/get-asset-list', 
authMiddleware.isAuthenticated, 
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isAssetAccessible,
assetController.getAssetList
)
router.get(
  "/get-all-asset-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAllAssetList
);
router.post(
  "/get-asset-list-by-category",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAssetListByCategory
);
router.post(
  "/get-asset-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAssetDetails
);
router.post(
  "/update-asset-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.updateAssetDetails
);
router.post(
  "/update-asset-location",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.updateAssetLocation
);
router.post(
  "/add-service-order-replace-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addServiceOrderReplaceAsset
);
router.post(
  "/add-service-request-replace-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addServiceRequestReplaceAsset
);
router.post(
  "/add-service-order-relocate-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addServiceOrderRelocateAsset
);
router.post(
  "/add-service-request-relocate-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.addServiceRequestRelocateAsset
);
router.get(
  "/search-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.assetSearch
);
// Export Asset Data 
// router.post(
//   "/export-asset",
//   authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   assetController.exportAsset
// );
router.post(
  "/get-asset-categories",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAssetCategories
);

// TODO: Remove
// Deprecated
router.post(
  "/get-asset-list-by-location",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.getAssetListByLocation
);

router.post('/get-asset-list-by-houseId',authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,assetController.getAssetListByHouseId);


router.get(
  "/export-asset-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  assetController.exportAssetData
);



/**IMPORT COMPANY DATA */
const path       = require('path');
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
        cb( null, 'assetData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-asset-data',upload.single('file'), authMiddleware.isAuthenticated, assetController.importAssetData)

router.post('/get-service-request-relocated-assets',authMiddleware.isAuthenticated,assetController.getServiceRequestRelocatedAssets)

module.exports = router
