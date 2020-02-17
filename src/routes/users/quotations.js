const { Router } = require("express")
const authMiddleware = require("../../middlewares/auth")
const userMiddleware = require("../../middlewares/userMiddleware")
const quotationsController = require("../../controllers/users/quotations");

const router = Router();

router.post('/get-quotations-list',
    authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, quotationsController.getQuotationsList)


router.post('/get-quotation-details',
    authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, quotationsController.getQuotationDetails);


router.post("/get-quotation-assigned-parts",
    authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, quotationsController.getQuotationAssignedParts)

router.post("/get-quotation-assigned-charges",
    authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, quotationsController.getQuotationAssignedCharges)

router.post('/get-quotation-invoice',
    authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, quotationsController.getQuotationInvoice);

module.exports = router;
