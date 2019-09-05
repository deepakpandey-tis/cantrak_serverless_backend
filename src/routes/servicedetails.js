const express = require('express');
const router = express.Router();

const serviceDetailsController = require('../controllers/servicedetails');

const authMiddleware = require('../middlewares/auth');


/* GET users listing. */

router.post('/get-general-details', authMiddleware.isAuthenticated, serviceDetailsController.getGeneralDetails);
router.get('/get-location-tags', authMiddleware.isAuthenticated, serviceDetailsController.getLocationTags);
router.get('/get-service-type', authMiddleware.isAuthenticated, serviceDetailsController.getServiceType);


module.exports = router;
