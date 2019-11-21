const express = require('express');
const router = express.Router();

const serviceDetailsController = require('../controllers/servicedetails');

const authMiddleware = require('../middlewares/auth');


/* GET users listing. */

router.post('/get-general-details', authMiddleware.isAuthenticated, serviceDetailsController.getGeneralDetails);
router.get('/get-location-tags', authMiddleware.isAuthenticated, serviceDetailsController.getLocationTags);
router.get('/get-service-type', authMiddleware.isAuthenticated, serviceDetailsController.getServiceType);
router.get('/get-priority-list', authMiddleware.isAuthenticated, serviceDetailsController.getPriorityList);
router.get('/service-request-list', authMiddleware.isAuthenticated, serviceDetailsController.getServiceRequestList);
router.post('/view-service-request', authMiddleware.isAuthenticated, serviceDetailsController.viewServiceRequestDetails);
// Export Location tag Data
router.get('/export-location-tags', authMiddleware.isAuthenticated, serviceDetailsController.exportLocationTags);




module.exports = router;
