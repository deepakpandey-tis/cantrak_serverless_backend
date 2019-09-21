const { Router } = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
const chargeController = require("../controllers/charge")


router.post('/add-charge', authMiddleware.isAuthenticated, chargeController.addCharge)
router.post('/add-service-order-fix-charge', authMiddleware.isAuthenticated, chargeController.addServiceOrderFixCharge)
router.post('/add-quotation-fix-charge', authMiddleware.isAuthenticated, chargeController.addQuotationFixCharge)
router.post('/add-service-request-fix-charge', authMiddleware.isAuthenticated, chargeController.addServiceRequestFixCharge)

module.exports = router;