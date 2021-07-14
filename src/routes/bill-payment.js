const { Router } = require("express");

const router = Router();
const billPaymentController = require("../controllers/bill-payment");
const authMiddleware = require('../middlewares/auth');
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");
const roleMiddleware = require("../middlewares/role");

router.post('/scbpayment_BillInquiry', authMiddleware.isAuthenticated, billPaymentController.scbPaymentBillInquiry);

router.get('/scbpayment_callback', authMiddleware.isAuthenticated, billPaymentController.scbPaymentCallback);

router.get('/general_db_call', authMiddleware.isAuthenticated, billPaymentController.generalDbCall);

module.exports = router;