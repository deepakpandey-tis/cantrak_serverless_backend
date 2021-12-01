const { Router } = require("express");
const path = require("path");
const router = Router();
const authMiddleware = require("../../middlewares/auth");
const roleMiddleware = require("../../middlewares/role");
const resourceAccessMiddleware = require("../../middlewares/resourceAccessMiddleware");
const parcelTypeController = require("../../controllers/administration-features/parcel-type");

router.post(
  "/add-parcel-type",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  parcelTypeController.addParcelType
);

router.post(
  "/get-parcel-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  parcelTypeController.getParcelTypeList
)

router.post(
  "/get-parcel-type-detail",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  parcelTypeController.getParcelTypeDetail
)

router.post(
  "/update-parcel-type",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  parcelTypeController.updateParcelType
)

router.post(
  "/toggle-parcel-type",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  parcelTypeController.toggleParcelType
)

module.exports = router;
