const express = require('express');
const router = express.Router();

const generalSetupController = require('../../controllers/administration-features/general-setup');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-service-type', authMiddleware.isAuthenticated, authMiddleware.isAdmin, generalSetupController.addServiceType);

router.post('/update-service-type', authMiddleware.isAuthenticated, authMiddleware.isAdmin, generalSetupController.updateServiceType);

router.post('/add-location-tags', authMiddleware.isAuthenticated, authMiddleware.isAdmin, generalSetupController.addLocationTags);

router.post('/update-location-tags', authMiddleware.isAuthenticated, authMiddleware.isAdmin, generalSetupController.updateLocationTags);

module.exports = router;
 