const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const propertyUnitTypeController = require('../../controllers/administration-features/property-unit-type')

router.post('/add-property-unit-type', authMiddleware.isAuthenticated, propertyUnitTypeController.addPropertyUnitType)
router.post('/update-property-unit-type', authMiddleware.isAuthenticated, propertyUnitTypeController.updatePropertyUnitType)
router.post('/toggle-property-unit-type', authMiddleware.isAuthenticated, propertyUnitTypeController.togglePropertyUnitType)
router.post('/get-property-unit-type-list', authMiddleware.isAuthenticated, propertyUnitTypeController.getPropertyUnitTypeList)
router.get('/get-all-property-unit-type', authMiddleware.isAuthenticated, propertyUnitTypeController.getAllPropertyUnitTypeList)
router.get('/get-property-unit-type-details', authMiddleware.isAuthenticated, propertyUnitTypeController.getPropertyUnitTypeDetail)

module.exports = router