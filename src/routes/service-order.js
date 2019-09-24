const { Router } = require("express")
const authMiddleware = require("../middlewares/auth")
const serviceOrderController = require("../controllers/service-order")

const router = Router()

router.post("/add-service-order", authMiddleware.isAuthenticated, serviceOrderController.addServiceOrder)
router.post('/get-service-orders-list', authMiddleware.isAuthenticated, serviceOrderController.getServiceOrderList)
router.post('/get-service-order-details', authMiddleware.isAuthenticated, serviceOrderController.getServiceOrderDetails)
router.post('/update-service-order', authMiddleware.isAuthenticated, serviceOrderController.updateServiceOrder)
router.post('/add-service-order-part', authMiddleware.isAuthenticated, serviceOrderController.addServiceOrderPart)
router.post('/add-service-order-asset', authMiddleware.isAuthenticated, serviceOrderController.addServiceOrderAsset)
router.post('/delete-service-order-part', authMiddleware.isAuthenticated, serviceOrderController.deleteServiceOrderPart)
router.post('/delete-service-order-asset', authMiddleware.isAuthenticated, serviceOrderController.deleteServiceOrderAsset)
module.exports = router;