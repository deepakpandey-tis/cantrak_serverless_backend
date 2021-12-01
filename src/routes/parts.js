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
    resourceAccessMiddleware.isAccessible,
    partsController.getParts
);
router.post(
    "/add-parts",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.addParts
);
router.post(
    "/update-part-details",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.updatePartDetails
);
router.post(
    "/get-part-details",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getPartDetails
);
router.post(
    "/add-part-stock",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.addPartStock
);
router.get(
    "/search-part",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.searchParts
);
// router.post(
//   "/export-part",
//   authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isAccessible,
//   partsController.exportPart
// );
router.get(
    "/part-list",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.partList
);
router.get(
    "/part-code-exist",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.partCodeExist
);
router.get(
    "/get-part-detail-by-id",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getPartDetailById
);
router.get(
    "/check-order-work-id",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.checkOrderWorkId
);
router.post(
    "/part-requisition-log-list",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.partRequisitionLogList
);
//FOR DROP DOWN ADJUST TYPE LIST
router.get(
    "/adjust-type-list",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
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
    resourceAccessMiddleware.isAccessible,
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
    filename: function(req, file, cb) {
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
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.importPartData
);

router.post(
    "/export-part-data",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.exportPartData
);

router.post(
    "/get-service-request-assigned-parts",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getServiceRequestAssignedParts
);

router.post("/get-service-order-assigned-parts",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getServiceOrderAssignedParts)


router.post("/get-quotation-assigned-parts",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getQuotationAssignedParts)

router.post('/get-pending-approval-requests-for-parts',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getPendingApprovalRequestsForParts)

router.post('/approve-part-requisition-request',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.approvePartRequisitionRequest
)

router.post('/edit-part-requisition-request',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.editPartRequisitionRequest
)

router.post('/decline-part-requisition-request',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.declinePartRequisitionRequest
)

router.post('/get-all-part-categories',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getAllPartCategories
)

router.post('/get-available-parts', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getAvailableParts)

router.get(
    "/check-service-order-id/",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.checkServiceOrderId
);

router.post("/delete-quotations-assigned-parts/", authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible, partsController.deleteQuotationAssignedParts
);

router.post('/generate-new-part-id',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.generateNewPartId)

router.post('/stock-report',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.stockReport)


router.get('/get-requisition-report',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getRequisitionReport)

router.get('/get-building-list-by-partId', authMiddleware.isAuthenticated, partsController.getBuildingListByPartId);

router.post('/stock-summary-report',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.stockSummaryReport)

router.post(
    "/get-pm-assign-parts",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.getPmAssignParts
);

router.post(
    "/requested-part-pm",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    partsController.requestedPartForPm
)

router.get(
    "/part-ledger-migration",
    authMiddleware.isAuthenticated,
    partsController.partLedgerMigration
)

router.post(
    "/request-multiple-parts-for-pm",
    authMiddleware.isAuthenticated,
    partsController.requestMultiplePartForPm
)

/*PM ASSIGNED PART */

// router.post('/get-pm-assigned-part-list', 
// authMiddleware.isAuthenticated, 
// roleMiddleware.parseUserPermission, 
// resourceAccessMiddleware.isAccessible, 
// partsController.getPmAssignedPartList)


router.get("/update-avg-price",
    // authMiddleware.isAuthenticated,
    //roleMiddleware.parseUserPermission,
    //resourceAccessMiddleware.isAccessible,
    partsController.updateAvgPrice)



module.exports = router;