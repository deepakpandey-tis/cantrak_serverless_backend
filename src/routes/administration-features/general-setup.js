const express = require('express');
const router = express.Router();

const generalSetupController = require('../../controllers/administration-features/general-setup');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-service-type', authMiddleware.isAuthenticated,  generalSetupController.addServiceType);

router.post('/update-service-type', authMiddleware.isAuthenticated,  generalSetupController.updateServiceType);

router.post('/add-location-tags', authMiddleware.isAuthenticated,  generalSetupController.addLocationTags);

router.post('/update-location-tags', authMiddleware.isAuthenticated,  generalSetupController.updateLocationTags);

module.exports = router;
 