const { Router } = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
const chargeController = require("../controllers/charge")


router.post('/add-charge', authMiddleware.isAuthenticated, chargeController.addCharge)
router.post('/update-charge', authMiddleware.isAuthenticated, chargeController.updateCharge)
router.post('/delete-charge', authMiddleware.isAuthenticated, chargeController.deleteCharges)
router.get('/get-charges-list', authMiddleware.isAuthenticated, chargeController.getChargesList)
router.post('/add-service-order-fix-charge', authMiddleware.isAuthenticated, chargeController.addServiceOrderFixCharge)
router.post('/add-quotation-fix-charge', authMiddleware.isAuthenticated, chargeController.addQuotationFixCharge)
router.post('/add-service-request-fix-charge', authMiddleware.isAuthenticated, chargeController.addServiceRequestFixCharge)

// Export Charge Data
router.get('/export-charge', authMiddleware.isAuthenticated, chargeController.exportCharge)
router.get('/get-vat-code-list', authMiddleware.isAuthenticated,chargeController.getVatCodeList)
router.get('/get-wht-code-list', authMiddleware.isAuthenticated,chargeController.getWhtCodeList)

module.exports = router;