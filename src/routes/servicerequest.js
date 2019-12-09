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
			// roleMiddleware.canAccessServiceRequest,
			serviceRequestController.getServiceRequestList)

router.post('/upload-images', authMiddleware.isAuthenticated, serviceRequestController.updateImages);

router.post('/upload-image-url', authMiddleware.isAuthenticated, serviceRequestController.getImageUploadUrl);

router.post('/add-service-request-part', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequestPart)

router.post('/add-service-request-asset', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequestAsset)

router.post('/delete-service-request-part', authMiddleware.isAuthenticated, serviceRequestController.deleteServiceRequestPart)
router.post('/delete-service-request-asset', authMiddleware.isAuthenticated, serviceRequestController.deleteServiceRequestAsset)
router.post('/export-service-request', authMiddleware.isAuthenticated, serviceRequestController.exportServiceRequest)
router.post('/get-property-units',authMiddleware.isAuthenticated,serviceRequestController.getPropertyUnits)

// var multer  = require('multer');
// var storage = multer.diskStorage({
// 	destination: './src/uploads',
// 	filename: function ( req, file, cb ) {
//         time = Date.now();
// 		cb( null, 'service-request-'+time+path.extname(file.originalname));
// 	}
// });
// var upload = multer( { storage: storage } );
// router.post('/import-service-request',upload.single('file'), authMiddleware.isAuthenticated, serviceRequestController.importServiceRequest)

router.post('/get-service-request-report-data', authMiddleware.isAuthenticated,serviceRequestController.getServiceRequestReportData)

module.exports = router;
