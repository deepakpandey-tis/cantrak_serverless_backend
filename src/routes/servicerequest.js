const express = require("express");
const router = express.Router();

const serviceRequestController = require("../controllers/servicerequest");

const authMiddleware = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");
const path = require("path");

/* GET users listing. */

router.post(
  "/post-service-request",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.addServiceRequest
);

router.post(
  "/add-service-problems",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.addServiceProblems
);

// router.post('/update-service-request', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
// 	resourceAccessMiddleware.isAccessible, serviceRequestController.updateServiceRequest);

router.post(
  "/get-service-request-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceRequestList
);

router.post(
  "/upload-images",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.updateImages
);

router.post(
  "/upload-image-url",
  authMiddleware.isAuthenticated,
  serviceRequestController.getImageUploadUrl
);

router.post(
  "/add-service-request-part",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.addServiceRequestPart
);

router.post(
  "/add-service-request-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.addServiceRequestAsset
);

router.post(
  "/delete-service-request-part",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.deleteServiceRequestPart
);
router.post(
  "/delete-service-request-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.deleteServiceRequestAsset
);
router.post(
  "/export-service-request",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.exportServiceRequest
);
router.post(
  "/get-property-units",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getPropertyUnits
);

router.post(
  "/get-service-request-report-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceRequestReportData
);
router.post(
  "/get-service-request-assigned-assets",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceRequestAssignedAssets
);

/**GET COMPANY ,PROJECT , BUILDING ,FLOOR BY HOUSE ID */
router.get(
  "/get-house-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getHouseDetailData
);

/*** CREATE SERVICE REQUEST */
router.post(
  "/create-service-request",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.createServiceRequest
);

/*GET HOUSE ID BY UNIT NO. */
router.get(
  "/get-houseid-by-unit-no",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getHouseIdByUnitNo
);
/*GET SERVICE REQUEST DETAILS BY SERVICE REQUEST ID. */
router.get(
  "/get-service-request-detail-by-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceRequestDetailById
);

/*** UPDATE SERVICE REQUEST */
router.post(
  "/edit-service-request",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.editServiceRequest
);

router.post(
  "/decline-service-request",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.declineServiceRequest
);
router.post(
  "/approve-service-request",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.approveServiceRequest
);

router.post(
  "/delete-service-problem",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.deleteServiceProblem
);

router.post(
  "/check-service-request-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.checkServiceRequestId
);

router.post(
  "/get-service-request-assigned-teams",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceAssignedTeamAndUsers
);
router.post(
  "/update-service-request-project-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.updateServiceRequestProjectId
);

router.post(
  "/get-assigned-assets-by-entity",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getAssignedAssetsByEntity
);

router.post(
  "/get-service-order-id-by-service-request-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceOrderIdByServiceRequestId
);
router.post(
  "/get-service-order-id-by-service-request-id-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceOrderIdByServiceRequestId
);
router.post(
  "/get-service-request-id-by-service-order-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceRequestIdByServiceOrderId
);
router.post(
  "/get-service-request-id-by-service-order-id-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceRequestIdByServiceOrderId
);

router.post(
  "/get-service-request-for-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getServiceRequestForReport
);

router.get(
  "/get-all-requested-by-list",
  authMiddleware.isAuthenticated,
  serviceRequestController.getAllRequestedByList
);

/*GET SERVICE REQUEST REPORT */
router.get(
  "/get-service-request-report",
  authMiddleware.isAuthenticated,
  serviceRequestController.getServiceRequestReport
);

/*GET GET REPORT BREAK BY STATUS */
router.post(
  "/get-report-by-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getReportByStatus
);

/*GET GET REPORT BREAK BY TEAM */
router.post(
  "/get-report-by-team",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getReportByTeam
);

/*GET GET REPORT BREAK BY SYSTEM */
router.post(
  "/get-report-by-system",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getReportBySystem
);

/*GET GET REPORT BREAK BY TAGS */
router.post(
  "/get-report-by-tag",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getReportByTag
);

/*GET REPORT CM REVENUE REPORT */
router.post(
  "/get-report-cm-revenue",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  serviceRequestController.getReportCmRevenue
);

module.exports = router;
