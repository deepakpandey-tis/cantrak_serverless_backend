const {Router} = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleController = require('../controllers/role')

router.get('/',authMiddleware.isSuperAdmin, roleController.test)
router.post('/assign-role-resources',authMiddleware.isAdmin,roleController.assignRoleToResources)
router.post('/role-setup',authMiddleware.isAuthenticated,roleController.roleSetup);
router.post('/role-details',authMiddleware.isAuthenticated,roleController.roleDetails)

module.exports = router