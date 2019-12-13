const express = require('express');
const router = express.Router();

const commonAreaController = require('../../controllers/administration-features/common-area');

const authMiddleware = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');


/* GET users listing. */

router.post(
  "/add-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  commonAreaController.addCommonArea
);
router.post(
  "/update-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  commonAreaController.updateCommonArea
);
router.get(
  "/get-common-area-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  commonAreaController.getCommonAreaList
);
router.post(
  "/delete-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  commonAreaController.deleteCommonArea
);
router.post(
  "/view-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  commonAreaController.getdetailsCommonArea
);
// Export Common Area 
router.get(
  "/export-common-area",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  commonAreaController.exportCommonArea
);


module.exports = router;
 