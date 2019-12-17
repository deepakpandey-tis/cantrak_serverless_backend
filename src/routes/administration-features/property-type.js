const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const propertyTypeController = require('../../controllers/administration-features/property-type')

router.post('/add-property-type', authMiddleware.isAuthenticated, propertyTypeController.addPropertyType)
router.post('/update-property-type', authMiddleware.isAuthenticated, propertyTypeController.updatePropertyType)
router.post('/delete-property-type', authMiddleware.isAuthenticated, propertyTypeController.deletePropertyType)
router.get('/get-property-type-list', authMiddleware.isAuthenticated, propertyTypeController.getPropertyTypeList)
// Export Property Type
router.get('/export-property-type', authMiddleware.isAuthenticated, propertyTypeController.exportPropertyType)
router.post('/view-property-type-details', authMiddleware.isAuthenticated, propertyTypeController.getPropertyDetails)
router.get('/get-all-property-type', authMiddleware.isAuthenticated, propertyTypeController.getAllPropertyTypeList)
//router.get('/export-problem-category-data', authMiddleware.isAuthenticated, propertyTypeController.exportProblemCategoryData)


module.exports = router