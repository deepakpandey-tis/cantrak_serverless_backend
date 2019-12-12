const express = require('express');
const router = express.Router();

const propertySetupController = require('../../controllers/administration-features/property-setup');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-incident-type', authMiddleware.isAuthenticated,  propertySetupController.incidentTypeAdd);

router.post('/update-incident-type', authMiddleware.isAuthenticated,  propertySetupController.incidentTypeUpdate);

router.post('/delete-incident-type', authMiddleware.isAuthenticated,  propertySetupController.incidentTypeDelete);

router.get('/incident-list', authMiddleware.isAuthenticated,  propertySetupController.incidentList);

module.exports = router;
 