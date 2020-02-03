const express = require("express")

const router = express.Router()
const authMiddleware = require('../middlewares/auth')
const sharedController = require("../controllers/shared-listing")
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware')


router.post('/get-asset-list', 
authMiddleware.isAuthenticated, 
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isAssetAccessible,
sharedController.getAssetList
)
router.post(
  "/get-part-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  sharedController.getParts
);

router.post(
  "/get-charges-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  sharedController.getChargesList
);






module.exports = router
