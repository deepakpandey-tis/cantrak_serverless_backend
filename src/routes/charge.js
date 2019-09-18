const { Router } = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
const chargeController = require("../controllers/charge")


router.post('/add-charge', authMiddleware.isAuthenticated, chargeController.addCharge)
router.post('/add-service-order-fix-charge', authMiddleware.isAuthenticated, chargeController.addServiceOrderFixCharge)

module.exports = router;