const express = require("express");
const router = express.Router();

const parcelManageController = require("../controllers/parcel-management");
const authMiddleware = require("../middlewares/auth");
const parcelManagementController = require("../controllers/parcel-management");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");

router.get(
  "/companylist-having-property-units",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManageController.getCompanyListHavingPropertyUnit
);

router.post(
  "/add-parcel",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManageController.addParcelRequest
);

router.get(
  "/generate-parcel-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManageController.generateParcelId
);

router.post(
  "/generate-pdf-of-parcel-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManageController.generatePdfOfParcelDocument
);

router.get(
  "/get-parcel-slip-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManageController.getParcelSlip
);

router.post(
  "/get-parcel-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManageController.getParcelList
);

router.post(
  "/get-parcel-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManageController.getParcelDetails
);

router.post(
  "/get-pending-parcel-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManageController.getPendingParcelList
);

router.get(
  "/get-tracking-number-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManageController.getTrackingNumberList
);

router.post(
  "/update-parcel-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManageController.updateParcel
);

router.post(
  "/update-parcel-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManagementController.updateParcelDetails
);

router.post(
  "/get-parcel-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManageController.getParcelStatusForCheckOut
);

router.post(
  "/get-qr-code-url",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManageController.getQrCodeImageUrl
);

router.post(
  "/dispatch-outgoing-parcel",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManageController.dispatchOutgoingParcel
);

router.post(
  "/approve-pending-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  parcelManageController.approvePendingStatus
);

router.post(
  "/get-property-units-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManageController.getUnitDetailsByUnitId
);

router.post(
  "/get-building-list-for-parcel",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManagementController.getBuildingPhaseListForParcel
);

router.get(
  "/get-parcel-type",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManagementController.getParcelType
);

router.post(
  "/get-pickeup-parcel",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManagementController.getPickedupParcelList
);

router.get(
  "/get-storage",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isParcelManagementAccessible,
  parcelManagementController.getStorage
)

module.exports = router;
