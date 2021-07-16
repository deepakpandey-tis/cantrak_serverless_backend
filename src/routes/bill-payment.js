const { Router } = require("express");

const router = Router();
const billPaymentController = require("../controllers/bill-payment");
const authMiddleware = require('../middlewares/auth');
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");
const roleMiddleware = require("../middlewares/role");

router.post('/sc-payment-billInquiry', authMiddleware.isAuthenticated, billPaymentController.scbPaymentBillInquiry);

router.post('/scbpayment_callback', authMiddleware.isAuthenticated, billPaymentController.scbPaymentCallback);

router.post('/general_db_call', authMiddleware.isAuthenticated, billPaymentController.generalDbCall);

router.post('/save-payment-log', authMiddleware.isAuthenticated, billPaymentController.paymentLogSave);

router.post('/get-invoice-history', authMiddleware.isAuthenticated, billPaymentController.getInvoiceHistory);

router.post('/save-image', authMiddleware.isAuthenticated, billPaymentController.saveImage);

router.get('/get-invoice', authMiddleware.isAuthenticated, billPaymentController.getInvoice);

module.exports = router;