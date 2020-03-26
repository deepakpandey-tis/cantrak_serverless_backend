const {Router} = require("express")
const authController = require('../middlewares/auth')
const vendorController = require('../controllers/vendor')
const router = Router()

router.get('/get-vendors', authController.isAuthenticated, vendorController.getVendors)

router.post('/add-vendor', authController.isAuthenticated, vendorController.addVendor);

router.post('/get-vendors-list', authController.isAuthenticated, vendorController.getVendorsList);

router.get('/get-vendors-details', authController.isAuthenticated, vendorController.getVendorsDetails)

router.post('/update-vendor', authController.isAuthenticated, vendorController.updateVendor);

router.get('/get-vendors-data-list', authController.isAuthenticated, vendorController.getVendorsData);

module.exports = router;