const express = require('express');
const router = express.Router();

const serviceRequestController = require('../controllers/servicerequest');

const authMiddleware = require('../middlewares/auth');


/* GET users listing. */

router.post('/post-service-request', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequest);

router.post('/add-service-problems', authMiddleware.isAuthenticated, serviceRequestController.addServiceProblems);

router.post('/update-service-request', authMiddleware.isAuthenticated, serviceRequestController.updateServiceRequest);

router.post('/upload-images', authMiddleware.isAuthenticated, serviceRequestController.updateImages);

router.post('/upload-image-url', authMiddleware.isAuthenticated, serviceRequestController.getImageUploadUrl);


module.exports = router;
