const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
// const resourceAcessMiddleware = require('../../middlewares/resourceAccessMiddleware')
const partCategoryController = require('../../controllers/administration-features/part-category')

router.post('/add-part-category', authMiddleware.isAuthenticated, partCategoryController.addPartCategory)
router.post('/update-part-category', authMiddleware.isAuthenticated, partCategoryController.updatePartCategory)
router.post('/part-category-details', authMiddleware.isAuthenticated, partCategoryController.viewPartCategory)
router.post('/delete-part-category', authMiddleware.isAuthenticated, partCategoryController.deletePartCategory)
/// Export Asset Category Data 
router.get('/export-part-category', authMiddleware.isAuthenticated, partCategoryController.exportPartCategory)

router.get('/get-part-category-list',authMiddleware.isAuthenticated,partCategoryController.getPartCategoryList)

module.exports = router