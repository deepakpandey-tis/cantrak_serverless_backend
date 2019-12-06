const {Router} = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleController = require('../controllers/role')

router.get('/',authMiddleware.isSuperAdmin, roleController.test)
router.post('/assign-role-resources',authMiddleware.isAdmin,roleController.assignRoleToResources)
router.post('/role-setup',authMiddleware.isAuthenticated,roleController.roleSetup);
router.post('/role-details',authMiddleware.isAuthenticated,roleController.roleDetails)
router.get('/get-org-role-list',authMiddleware.isAuthenticated,roleController.getOrgRoleList)
router.post('/update-role-details',authMiddleware.isAuthenticated,roleController.getUpdateRoleDetails)
router.post('/update-org-role',authMiddleware.isAuthenticated,roleController.updateOrgRole)
router.post('/delete-org-role',authMiddleware.isAuthenticated,roleController.deleteOrgRole)
router.get('/get-org-role-all-list',authMiddleware.isAuthenticated,roleController.getOrgRoleAllList)


module.exports = router