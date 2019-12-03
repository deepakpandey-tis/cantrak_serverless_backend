const {Router} = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleController = require('../controllers/role')

router.get('/',authMiddleware.isSuperAdmin, roleController.test)

module.exports = router