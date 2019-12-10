const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
// const resourceAcessMiddleware = require('../../middlewares/resourceAccessMiddleware')
const assetCategoryController = require('../../controllers/administration-features/asset-category')

router.post('/add-asset-category', authMiddleware.isAuthenticated, assetCategoryController.addAssetCategory)
router.post('/update-asset-category', authMiddleware.isAuthenticated, assetCategoryController.updateAssetCategory)
router.post('/view-asset-category', authMiddleware.isAuthenticated, assetCategoryController.viewAssetCategory)
router.post('/delete-asset-category', authMiddleware.isAuthenticated, assetCategoryController.deleteAssetCategory)
/// Export Asset Category Data 
router.get('/export-asset-category', authMiddleware.isAuthenticated, assetCategoryController.exportAssetCategory)

router.get('/get-asset-category-list',authMiddleware.isAuthenticated,assetCategoryController.getAssetCategoryList)

module.exports = router