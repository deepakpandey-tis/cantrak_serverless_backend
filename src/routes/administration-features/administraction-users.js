const { Router } = require("express")

const router = Router()
const authMiddleware  = require('../../middlewares/auth')
const roleMiddleware  = require('../../middlewares/role')
const usersController = require('../../controllers/administration-features/administraction-users')

router.post('/add-user-role', authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission, usersController.addUserRole)
router.post('/delete-user-role', authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,usersController.deleteUserRole)
router.get(
  "/get-users-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  usersController.getUsersList
);


module.exports = router