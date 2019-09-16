const {Router} = require("express")
const authMiddleware = require("../middlewares/auth")
const serviceOrderController = require("../controllers/service-order")

const router = Router()

router.post("/add-service-order", authMiddleware.isAuthenticated, serviceOrderController.addServiceOrder)
router.get('/get-service-orders-list', authMiddleware.isAuthenticated, serviceOrderController.getServiceOrderList)

module.exports = router;