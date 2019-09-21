const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const propertyUnitController = require('../../controllers/administration-features/property-unit')

router.post('/add-property-unit', authMiddleware.isAuthenticated, propertyUnitController.addPropertyUnit)
router.post('/update-property-unit', authMiddleware.isAuthenticated, propertyUnitController.updatePropertyUnit)
router.post('/view-property-unit', authMiddleware.isAuthenticated, propertyUnitController.viewPropertyUnit)
router.post('/delete-property-unit', authMiddleware.isAuthenticated, propertyUnitController.deletePropertyUnit)
router.get('/get-property-unit-list', authMiddleware.isAuthenticated, propertyUnitController.getPropertyUnitList)

module.exports = router