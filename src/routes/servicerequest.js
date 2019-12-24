const express = require('express');
const router = express.Router();

const serviceRequestController = require('../controllers/servicerequest');

const authMiddleware = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");
const path = require('path');

/* GET users listing. */

router.post('/post-service-request', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequest);

router.post('/add-service-problems', authMiddleware.isAuthenticated, serviceRequestController.addServiceProblems);

router.post('/update-service-request', authMiddleware.isAuthenticated, serviceRequestController.updateServiceRequest);

router.post('/get-service-request-list', 
			authMiddleware.isAuthenticated, 
			roleMiddleware.parseUserPermission,
			resourceAccessMiddleware.isCMAccessible, 
			serviceRequestController.getServiceRequestList)

router.post('/upload-images', authMiddleware.isAuthenticated, serviceRequestController.updateImages);

router.post('/upload-image-url', authMiddleware.isAuthenticated, serviceRequestController.getImageUploadUrl);

router.post('/add-service-request-part', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequestPart)

router.post('/add-service-request-asset', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequestAsset)

router.post('/delete-service-request-part', authMiddleware.isAuthenticated, serviceRequestController.deleteServiceRequestPart)
router.post('/delete-service-request-asset', authMiddleware.isAuthenticated, serviceRequestController.deleteServiceRequestAsset)
router.post('/export-service-request', authMiddleware.isAuthenticated, serviceRequestController.exportServiceRequest)
router.post('/get-property-units',authMiddleware.isAuthenticated,serviceRequestController.getPropertyUnits)

router.post('/get-service-request-report-data', authMiddleware.isAuthenticated,serviceRequestController.getServiceRequestReportData)
router.post("/get-service-request-assigned-assets",authMiddleware.isAuthenticated,serviceRequestController.getServiceRequestAssignedAssets);

/**GET COMPANY ,PROJECT , BUILDING ,FLOOR BY HOUSE ID */
router.get('/get-house-details',authMiddleware.isAuthenticated,serviceRequestController.getHouseDetailData)

/*** CREATE SERVICE REQUEST */
router.post('/create-service-request', authMiddleware.isAuthenticated,serviceRequestController.createServiceRequest)

/*GET HOUSE ID BY UNIT NO. */
router.get('/get-houseid-by-unit-no', authMiddleware.isAuthenticated,serviceRequestController.getHouseIdByUnitNo)
/*GET SERVICE REQUEST DETAILS BY SERVICE REQUEST ID. */
router.get('/get-service-request-detail-by-id', authMiddleware.isAuthenticated,serviceRequestController.getServiceRequestDetailById)

/*** UPDATE SERVICE REQUEST */
router.post('/edit-service-request', authMiddleware.isAuthenticated,serviceRequestController.editServiceRequest)
module.exports = router;
