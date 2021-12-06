const { Router } = require("express");
const authMiddleware = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");
const serviceOrderController = require("../controllers/service-order");

const router = Router();

router.post(
  "/add-service-order",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.addServiceOrder
);
router.post(
  "/get-service-orders-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getServiceOrderList
);
router.post(
  "/get-service-order-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getServiceOrderDetails
);
router.post(
  "/update-service-order",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.updateServiceOrder
);
router.post(
  "/add-service-order-part",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.addServiceOrderPart
);
router.post(
  "/add-service-order-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.addServiceOrderAsset
);
router.post(
  "/delete-service-order-part",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.deleteServiceOrderPart
);
router.post(
  "/delete-service-order-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.deleteServiceOrderAsset
);
router.post(
  "/get-service-order-assigned-assets",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getServiceOrderAssignedAssets
);
// Service order Export Data
router.post(
  "/export-service-order",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.exportServiceOrder
);

router.get(
  "/get-new-service-order-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getNewServiceOrderId
);
router.post(
  "/add-service-appointment",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.addServiceAppointment
);
router.post(
  "/get-service-appointments",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getServiceAppointmentList
);
router.post(
  "/get-service-appointment-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getServiceAppointmentDetails
);
router.post(
  "/update-service-order-notes",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.updateServiceOrderNotes
);
router.post(
  "/get-service-order-notes-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getServiceOrderNoteList
);
router.post(
  "/delete-service-order-remark",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.deleteServiceOrderRemark
);

router.post(
  "/get-service-order-due-date",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getServiceOrderDueDate
);

router.post(
  "/update-appointment-status",
  authMiddleware.isAuthenticated,
  serviceOrderController.updateAppointmentStatus
);

router.post(
  "/get-service-order-for-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getServiceOrderForReport
);

router.get(
  "/get-satisfaction-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getSatisfactionList
);

router.get(
  "/get-service-order-report",
  authMiddleware.isAuthenticated,
  serviceOrderController.getServiceOrderReport
);
router.post(
  "/get-problem-category-report",
  authMiddleware.isAuthenticated,
  serviceOrderController.getProblemCategoryReport
);

router.post(
  "/get-so-cost-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceOrderController.getSoCostReport
);

module.exports = router;
