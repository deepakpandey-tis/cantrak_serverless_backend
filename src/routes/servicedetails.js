const express = require('express');
const router = express.Router();

const serviceRequestController = require('../controllers/servicerequest');

const authMiddleware = require('../middlewares/auth');


/* GET users listing. */

router.post('/get-general-details', authMiddleware.isAuthenticated, serviceRequestController.getGeneralDetails);

router.post('/add-service-problems', authMiddleware.isAuthenticated, serviceRequestController.addServiceProblems);

router.post('/update-service-request', authMiddleware.isAuthenticated, serviceRequestController.updateServiceRequest);

router.post('/upload-images', authMiddleware.isAuthenticated, serviceRequestController.updateImages);

router.get('/upload-image-url', authMiddleware.isAuthenticated, serviceRequestController.getImageUploadUrl);


module.exports = router;
