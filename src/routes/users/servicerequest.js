const express = require('express');
const router = express.Router();

const serviceRequestController = require('../../controllers/users/servicerequest');

const authMiddleware = require('../../middlewares/auth');
const userMiddleware = require('../../middlewares/userMiddleware');
const path = require('path');

/* GET users listing. */


// GET COMPANY LIST HAVING PROPERTY UNITS
router.get('/company-lists-having-property-units',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getCompanyListHavingPropertyUnits)

router.get('/get-building-phase-all-list-having-property-units',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getBuildingPhaseAllListHavingPropertyUnits
)

router.post('/get-floor-zone-list-by-building-id-having-property-units',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getFloorZoneListByBuildingIdHavingPropertyUnits
)

router.post('/get-unit-by-floor',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getPropertyUnitListByFloor)


router.get('/project-lists-having-property-units',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getProjectListHavingPropertyUnits)

router.post('/post-service-request',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.addServiceRequest);

router.get('/get-category-list',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getIncidentCategories)

router.post('/get-subcategories-by-category',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getSubcategories)

router.post('/add-service-problems',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.addServiceProblems);

// router.post('/update-service-request', authMiddleware.isAuthenticated, serviceRequestController.updateServiceRequest);

router.post('/get-service-request-list',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getServiceRequestList)

// router.post('/upload-images', authMiddleware.isAuthenticated, serviceRequestController.updateImages);

router.post('/upload-image-url',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getImageUploadUrl);

router.post('/delete-image',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.deleteImage)

router.post('/upload-image-by-entity',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.uploadImageByEntity)

router.post('/delete-service-problem',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.deleteServiceProblem)

// router.post('/add-service-request-part', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequestPart)

// router.post('/add-service-request-asset', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequestAsset)

// router.post('/delete-service-request-part', authMiddleware.isAuthenticated, serviceRequestController.deleteServiceRequestPart)
// router.post('/delete-service-request-asset', authMiddleware.isAuthenticated, serviceRequestController.deleteServiceRequestAsset)
// router.post('/export-service-request', authMiddleware.isAuthenticated, serviceRequestController.exportServiceRequest)
// router.post('/get-property-units',authMiddleware.isAuthenticated,serviceRequestController.getPropertyUnits)

// router.post('/get-service-request-report-data', authMiddleware.isAuthenticated,serviceRequestController.getServiceRequestReportData)
// router.post("/get-service-request-assigned-assets",authMiddleware.isAuthenticated,serviceRequestController.getServiceRequestAssignedAssets);

/**GET COMPANY ,PROJECT , BUILDING ,FLOOR BY HOUSE ID */
// router.get('/get-house-details',authMiddleware.isAuthenticated,serviceRequestController.getHouseDetailData)

/*** CREATE SERVICE REQUEST */
router.post('/create-service-request',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.createServiceRequest)

/*GET HOUSE ID BY UNIT NO. */
// router.get('/get-houseid-by-unit-no', authMiddleware.isAuthenticated,serviceRequestController.getHouseIdByUnitNo)
/*GET SERVICE REQUEST DETAILS BY SERVICE REQUEST ID. */
router.get('/get-service-request-detail-by-id',
    authMiddleware.isAuthenticated, serviceRequestController.getServiceRequestDetailById)

/*** UPDATE SERVICE REQUEST */
router.post('/edit-service-request', authMiddleware.isAuthenticated, serviceRequestController.editServiceRequest)

// router.post('/decline-service-request',authMiddleware.isAuthenticated,serviceRequestController.declineServiceRequest)
router.post("/approve-service-request",
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.approveServiceRequest);

router.post('/update-service-request-project-id',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.updateServiceRequestProjectId)

router.get('/get-invoice',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getInvoiceDetails);

router.get('/get-taxes-list',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getTaxesList);

router.post('/get-main-and-additional-users-by-teamid',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getMainAndAdditionalUsersByTeamId)


router.post('/get-assigned-teams-and-users',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getAssignedTeamAndUsers);

router.post('/get-team-by-entity',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getTeamByEntity)

router.get('/get-all-status',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getAllStatus)

/*GET ALL PROPERTY UNIT LIST FOR DROP DOWN */
router.get("/get-all-property-unit",
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getAllPropertyUnit);

/*GET BUILDING LIST ALL FOR USER */
router.get('/get-building-all-list-for-user',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceRequestController.getBuildingAllListForUser)


module.exports = router;
