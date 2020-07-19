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
  "/check-order-work-id",
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
      cb(null, 'partData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });

router.post(
  "/import-part-data",
  // upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.importPartData
);

router.post(
  "/export-part-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.exportPartData
);

router.post(
  "/get-service-request-assigned-parts",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  partsController.getServiceRequestAssignedParts
);

router.post("/get-service-order-assigned-parts",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  partsController.getServiceOrderAssignedParts)


router.post("/get-quotation-assigned-parts",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  partsController.getQuotationAssignedParts)

router.post('/get-pending-approval-requests-for-parts',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.getPendingApprovalRequestsForParts)

router.post('/approve-part-requisition-request',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.approvePartRequisitionRequest
)

router.post('/edit-part-requisition-request',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.editPartRequisitionRequest
)

router.post('/decline-part-requisition-request',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.declinePartRequisitionRequest
)

router.post('/get-all-part-categories',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.getAllPartCategories
)

router.post('/get-available-parts', authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.getAvailableParts)

router.get(
  "/check-service-order-id/",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.checkServiceOrderId
);

router.post("/delete-quotations-assigned-parts/", authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible, partsController.deleteQuotationAssignedParts
);

router.post('/generate-new-part-id',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.generateNewPartId)

router.post('/stock-report',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.stockReport)


router.get('/get-requisition-report',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.getRequisitionReport)

router.get('/get-building-list-by-partId', authMiddleware.isAuthenticated, partsController.getBuildingListByPartId);

router.post('/stock-summary-report',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.stockSummaryReport)

router.post(
  "/get-pm-assign-parts",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPartAccessible,
  partsController.getPmAssignParts
);

/*PM ASSIGNED PART */

// router.post('/get-pm-assigned-part-list', 
// authMiddleware.isAuthenticated, 
// roleMiddleware.parseUserPermission, 
// resourceAccessMiddleware.isPartAccessible, 
// partsController.getPmAssignedPartList)



module.exports = router;