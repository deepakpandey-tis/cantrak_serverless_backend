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
router.post(
  "/get-service-order-assigned-assets",
  authMiddleware.isAuthenticated,
  serviceOrderController.getServiceOrderAssignedAssets
);
// Service order Export Data 
router.post('/export-service-order', authMiddleware.isAuthenticated, serviceOrderController.exportServiceOrder)

router.get('/get-new-service-order-id',authMiddleware.isAuthenticated,serviceOrderController.getNewServiceOrderId)
router.post('/add-service-appointment', authMiddleware.isAuthenticated, serviceOrderController.addServiceAppointment)
router.post('/get-service-appointments', authMiddleware.isAuthenticated, serviceOrderController.getServiceAppointmentList)
router.post('/get-service-appointment-details', authMiddleware.isAuthenticated, serviceOrderController.getServiceAppointmentDetails)
router.post('/update-service-order-notes', authMiddleware.isAuthenticated, serviceOrderController.updateServiceOrderNotes)
router.post('/get-service-order-notes-list', authMiddleware.isAuthenticated, serviceOrderController.getServiceOrderNoteList)
router.post('/delete-service-order-remark', authMiddleware.isAuthenticated, serviceOrderController.deleteServiceOrderRemark);

module.exports = router;