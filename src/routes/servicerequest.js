const express = require('express');
const router = express.Router();

const serviceRequestController = require('../controllers/servicerequest');

const authMiddleware = require('../middlewares/auth');


/* GET users listing. */

router.post('/add-service-request', authMiddleware.isAuthenticated, serviceRequestController.addServiceRequest);

module.exports = router;
