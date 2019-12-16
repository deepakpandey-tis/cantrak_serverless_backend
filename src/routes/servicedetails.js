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
router.post('/add-priorities', authMiddleware.isAuthenticated, serviceDetailsController.addPriorities);
router.post('/update-priorities', authMiddleware.isAuthenticated, serviceDetailsController.updatePriorities);
router.post('/priorities-details', authMiddleware.isAuthenticated, serviceDetailsController.viewPriorities);
router.post('/add-location-tags', authMiddleware.isAuthenticated, serviceDetailsController.addLocationTag);
router.post('/update-location-tags', authMiddleware.isAuthenticated, serviceDetailsController.updateLocationTag);
router.post('/location-tags-details', authMiddleware.isAuthenticated, serviceDetailsController.viewLocationTag);


router.get('/get-location-tag-names',authMiddleware.isAuthenticated,serviceDetailsController.getLocationTags)
router.get('/export-priority-data',authMiddleware.isAuthenticated,serviceDetailsController.exportPriorityData)

module.exports = router;
