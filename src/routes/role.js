const {Router} = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleController = require('../controllers/role')

router.get('/',authMiddleware.isSuperAdmin, roleController.test)
router.post('/assign-role-resources',authMiddleware.isAdmin,roleController.assignRoleToResources)

module.exports = router