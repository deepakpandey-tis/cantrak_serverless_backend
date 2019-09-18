const express = require('express');
const router = express.Router();

const quotationController = require('../controllers/quotations');

const authMiddleware = require('../middlewares/auth');


/* GET users listing. */

router.get('/generate-quotations-id', authMiddleware.isAuthenticated, quotationController.generateQuotationId);

router.post('/update-quotations', authMiddleware.isAuthenticated, quotationController.updateQuotations);

router.get('/get-quotation-details', authMiddleware.isAuthenticated, quotationController.getQuotationDetails);

// router.post('/upload-images', authMiddleware.isAuthenticated, serviceRequestController.updateImages);

// router.post('/upload-image-url', authMiddleware.isAuthenticated, serviceRequestController.getImageUploadUrl);
router.post('/add-quotation-part', authMiddleware.isAuthenticated, quotationController.addQuotationPart)
router.post('/add-quotation-asset', authMiddleware.isAuthenticated, quotationController.addQuotationAsset)

module.exports = router;
