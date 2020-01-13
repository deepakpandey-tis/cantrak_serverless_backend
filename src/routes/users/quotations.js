const {Router} = require("express")
const authMiddleware = require("../../middlewares/auth")
const userMiddleware = require("../../middlewares/userMiddleware")
const quotationsController = require("../../controllers/users/quotations");

const router = Router();

router.post('/get-quotations-list', authMiddleware.isAuthenticated, userMiddleware.customerInfo,quotationsController.getQuotationsList)

module.exports = router;
