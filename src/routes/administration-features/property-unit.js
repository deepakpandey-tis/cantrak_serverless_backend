const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const propertyUnitController = require('../../controllers/administration-features/property-unit')

router.post('/add-property-unit', authMiddleware.isAuthenticated, propertyUnitController.addPropertyUnit)
router.post('/update-property-unit', authMiddleware.isAuthenticated, propertyUnitController.updatePropertyUnit)
router.post('/view-property-unit', authMiddleware.isAuthenticated, propertyUnitController.viewPropertyUnit)
router.post('/delete-property-unit', authMiddleware.isAuthenticated, propertyUnitController.deletePropertyUnit)
router.post('/get-unit-by-floor', authMiddleware.isAuthenticated, propertyUnitController.getPropertyUnitListByFloor)
router.get('/get-property-unit-list', authMiddleware.isAuthenticated, propertyUnitController.getPropertyUnitList)
//PROPERTY UNIT LIST DROPDOWN
router.get('/get-propert-unit-all-list',propertyUnitController.getPropertyUnitAllList)
 //  Export Property Unit Data
router.get('/export-property-unit', authMiddleware.isAuthenticated, propertyUnitController.exportPropertyUnit)
// PROPERTY UNIT DETAILS
router.post('/get-property-unit-details', authMiddleware.isAuthenticated, propertyUnitController.getPropertyUnitDetails)


module.exports = router