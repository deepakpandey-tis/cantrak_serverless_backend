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


router.get('/get-location-tag-names', authMiddleware.isAuthenticated, serviceDetailsController.getLocationTags);
router.get('/export-priority-data', authMiddleware.isAuthenticated, serviceDetailsController.exportPriorityData);


/**IMPORT Priority Data */
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
                        cb(null, 'PriorityData-' + time + ext);
                } else {
                        return false
                }
        }
});
var upload = multer({ storage: storage });

// Import Location Tags
let tempraryDirectory1 = null;
if (process.env.IS_OFFLINE) {
        tempraryDirectory1 = 'tmp/';
} else {
        tempraryDirectory1 = '/tmp/';
}
var multer1 = require('multer');
var storage1 = multer1.diskStorage({
        destination: tempraryDirectory1,
        filename: function (req, file, cb) {
                let ext1 = path.extname(file.originalname)
                if (ext1 == '.csv') {
                        time1 = Date.now();
                        cb(null, 'LocationTagData-' + time1 + ext1);
                } else {
                        return false
                }
        }
});
var upload1 = multer({ storage: storage1 });


router.post('/import-priority-data', upload.single("file"), authMiddleware.isAuthenticated, serviceDetailsController.importPrioritiesData);
router.post('/import-location-tag', upload1.single("file"), authMiddleware.isAuthenticated, serviceDetailsController.importLocationTag);


router.get('/get-location-tag-all-list', authMiddleware.isAuthenticated, serviceDetailsController.getLocatioTagAllList);
router.post('/get-service-problems', authMiddleware.isAuthenticated, serviceDetailsController.getServiceProblem);
router.post('/get-service-request-status', authMiddleware.isAuthenticated, serviceDetailsController.getServiceRequestStatus);
router.get('/get-priority-all-list', authMiddleware.isAuthenticated, serviceDetailsController.getPriorityAllList);
router.post('/toggle-priority-status', authMiddleware.isAuthenticated, serviceDetailsController.togglePriorityStatus);
router.post('/toggle-location-tag-status', authMiddleware.isAuthenticated, serviceDetailsController.toggleLocationTagStatus);
router.post('/source-of-request-status', authMiddleware.isAuthenticated, serviceDetailsController.sourceOfRequestStatus);


module.exports = router;
