const { Router } = require("express")
const authMiddleware = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const router = Router()

const partsController = require(
    '../controllers/parts'
)

// router.gdet('/get-parts', authMiddleware.isAuthenticated, partsController.getParts)
router.post(
  "/get-parts",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.getParts
);
router.post(
  "/add-parts",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.addParts
);
router.post(
  "/update-part-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.updatePartDetails
);
router.post(
  "/get-part-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.getPartDetails
);
router.post(
  "/add-part-stock",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.addPartStock
);
router.get(
  "/search-part",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.searchParts
);
// router.post(
//   "/export-part",
//   authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isPartAccessible,
//   partsController.exportPart
// );
router.get(
  "/part-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.partList
);
router.get(
  "/part-code-exist",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.partCodeExist
);
router.get(
  "/get-part-detail-by-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.getPartDetailById
);
router.get(
  "/check-order-work-id/:id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.checkOrderWorkId
);
router.post(
  "/part-requisition-log-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.partRequisitionLogList
);
//FOR DROP DOWN ADJUST TYPE LIST
router.get(
  "/adjust-type-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.adjustTypeList
);

// var storage = multer.diskStorage({
// 	destination: './src/uploads',
// 	filename: function ( req, file, cb ) {
//         let ext = path.extname(file.originalname)
//         time = Date.now();
// 		cb( null, 'part-details'+time+path.extname(file.originalname));
// 	}
// });
// var upload = multer( { storage: storage } );
// router.post('/import-part-details',upload.single('file'),authMiddleware.isAuthenticated,partsController.importPartDetails)
router.post(
  "/delete-part",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.deletePart
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
        cb( null, 'partData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );

router.post(
  "/import-part-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.importPartData
);

router.get(
  "/export-part-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.exportPartData
);

module.exports = router;