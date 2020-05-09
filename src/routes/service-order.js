const { Router } = require("express")
const authMiddleware = require("../middlewares/auth")
const roleMiddleware = require("../middlewares/role")
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware")
const serviceOrderController = require("../controllers/service-order")

const router = Router()

router.post("/add-service-order", authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.addServiceOrder)
router.post('/get-service-orders-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.getServiceOrderList)
router.post('/get-service-order-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.getServiceOrderDetails)
router.post('/update-service-order', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.updateServiceOrder)
router.post('/add-service-order-part', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.addServiceOrderPart)
router.post('/add-service-order-asset', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.addServiceOrderAsset)
router.post('/delete-service-order-part', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.deleteServiceOrderPart)
router.post('/delete-service-order-asset', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.deleteServiceOrderAsset)
router.post(
  "/get-service-order-assigned-assets",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  serviceOrderController.getServiceOrderAssignedAssets
);
// Service order Export Data 
router.post('/export-service-order', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.exportServiceOrder)

router.get('/get-new-service-order-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.getNewServiceOrderId)
router.post('/add-service-appointment', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.addServiceAppointment)
router.post('/get-service-appointments', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.getServiceAppointmentList)
router.post('/get-service-appointment-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.getServiceAppointmentDetails)
router.post('/update-service-order-notes', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.updateServiceOrderNotes)
router.post('/get-service-order-notes-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.getServiceOrderNoteList)
router.post('/delete-service-order-remark', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible, serviceOrderController.deleteServiceOrderRemark);

router.post('/get-service-order-due-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isCMAccessible, serviceOrderController.getServiceOrderDueDate)

router.post('/update-appointment-status', authMiddleware.isAuthenticated, serviceOrderController.updateAppointmentStatus)

router.post('/get-service-order-for-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isCMAccessible, serviceOrderController.getServiceOrderForReport)

router.get('/get-satisfaction-list',authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isCMAccessible, serviceOrderController.getSatisfactionList)

router.get('/get-service-order-report',authMiddleware.isAuthenticated, serviceOrderController.getServiceOrderReport)
router.post('/get-problem-category-report',authMiddleware.isAuthenticated, serviceOrderController.getProblemCategoryReport)

module.exports = router;