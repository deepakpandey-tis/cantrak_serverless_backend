const { Router } = require("express");
const router = Router();
const authMiddleware = require("../../middlewares/auth");
const tenantController = require("../../controllers/superadmin/tenant");
const roleMiddleware = require("../../middlewares/role");


router.post(
    "/get-tenant-list",
    authMiddleware.isAuthenticated,
    tenantController.getTenantList,
)

router.post(
    "/reset-password",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    tenantController.resetPassword
)

router.post(
    "/get-user-list",
    authMiddleware.isAuthenticated,
    tenantController.usersList
)
module.exports = router;