const express = require('express');
const router = express.Router();

const serviceRequestController = require('../controllers/servicerequest');

const authMiddleware = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");
const path = require('path');

/* GET users listing. */

router.post('/post-service-request', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible,  serviceRequestController.addServiceRequest);

router.post('/add-service-problems', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible,  serviceRequestController.addServiceProblems);

router.post('/update-service-request', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.updateServiceRequest);

router.post('/get-service-request-list', 
			authMiddleware.isAuthenticated, 
			roleMiddleware.parseUserPermission,
			resourceAccessMiddleware.isCMAccessible, 
			serviceRequestController.getServiceRequestList)

router.post('/upload-images', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.updateImages);

router.post('/upload-image-url', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.getImageUploadUrl);

router.post('/add-service-request-part', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible,  serviceRequestController.addServiceRequestPart)

router.post('/add-service-request-asset', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible,  serviceRequestController.addServiceRequestAsset)

router.post('/delete-service-request-part', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.deleteServiceRequestPart)
router.post('/delete-service-request-asset', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible,  serviceRequestController.deleteServiceRequestAsset)
router.post('/export-service-request', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible,  serviceRequestController.exportServiceRequest)
router.post('/get-property-units', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.getPropertyUnits)

router.post('/get-service-request-report-data', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.getServiceRequestReportData)
router.post("/get-service-request-assigned-assets", authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.getServiceRequestAssignedAssets);

/**GET COMPANY ,PROJECT , BUILDING ,FLOOR BY HOUSE ID */
router.get('/get-house-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.getHouseDetailData)

/*** CREATE SERVICE REQUEST */
router.post('/create-service-request', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.createServiceRequest)

/*GET HOUSE ID BY UNIT NO. */
router.get('/get-houseid-by-unit-no', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.getHouseIdByUnitNo)
/*GET SERVICE REQUEST DETAILS BY SERVICE REQUEST ID. */
router.get('/get-service-request-detail-by-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.getServiceRequestDetailById)

/*** UPDATE SERVICE REQUEST */
router.post('/edit-service-request', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.editServiceRequest)

router.post('/decline-service-request', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.declineServiceRequest)
router.post("/approve-service-request", authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.approveServiceRequest);

router.post('/delete-service-problem', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible,  serviceRequestController.deleteServiceProblem)

router.post('/check-service-request-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
	resourceAccessMiddleware.isCMAccessible, serviceRequestController.checkServiceRequestId)

router.post('/get-service-request-assigned-teams', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isCMAccessible, serviceRequestController.getServiceAssignedTeamAndUsers)
router.post('/update-service-request-project-id',authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,resourceAccessMiddleware.isCMAccessible,serviceRequestController.updateServiceRequestProjectId)

router.post('/get-assigned-assets-by-entity',authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,resourceAccessMiddleware.isAssetAccessible,serviceRequestController.getAssignedAssetsByEntity)

router.post('/get-service-order-id-by-service-request-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isCMAccessible, serviceRequestController.getServiceOrderIdByServiceRequestId)
router.post('/get-service-order-id-by-service-request-id-asset', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAssetAccessible, serviceRequestController.getServiceOrderIdByServiceRequestId)
router.post('/get-service-request-id-by-service-order-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isCMAccessible, serviceRequestController.getServiceRequestIdByServiceOrderId)
router.post('/get-service-request-id-by-service-order-id-asset', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAssetAccessible, serviceRequestController.getServiceRequestIdByServiceOrderId)

router.post('/get-service-request-for-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isCMAccessible, serviceRequestController.getServiceRequestForReport)
module.exports = router;
