const { Router } = require("express")

const router = Router()
const authMiddleware  = require('../../middlewares/auth')
const usersController = require('../../controllers/administration-features/administraction-users')

router.post('/add-user-role', authMiddleware.isAuthenticated,authMiddleware.isAdmin, usersController.addUserRole)
router.post('/delete-user-role', authMiddleware.isAuthenticated,authMiddleware.isRole,usersController.deleteUserRole)
router.get('/get-users-list', authMiddleware.isAuthenticated, usersController.getUsersList)


module.exports = router