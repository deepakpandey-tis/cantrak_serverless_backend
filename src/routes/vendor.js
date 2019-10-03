const {Router} = require("express")
const authController = require('../middlewares/auth')
const vendorController = require('../controllers/vendor')
const router = Router()

router.get('/get-vendors', authController.isAuthenticated, vendorController.getVendors)

module.exports = router;