const express = require("express")

const router = express.Router()
const authMiddleware = require('../middlewares/auth')
const assetController = require("../controllers/asset")

router.post('/add-asset', authMiddleware.isAuthenticated, assetController.addAsset)
router.post('/get-asset-list', authMiddleware.isAuthenticated, assetController.getAssetList)
// router.get('/get-asset-list', authMiddleware.isAuthenticated, assetController.getAssetList)
router.post('/get-asset-details', authMiddleware.isAuthenticated, assetController.getAssetDetails)
router.post('/update-asset-details', authMiddleware.isAuthenticated, assetController.updateAssetDetails)
router.post('/add-service-order-replace-asset', authMiddleware.isAuthenticated, assetController.addServiceOrderReplaceAsset)
router.post('/add-service-request-replace-asset', authMiddleware.isAuthenticated, assetController.addServiceRequestReplaceAsset)
router.post('/add-service-order-relocate-asset', authMiddleware.isAuthenticated, assetController.addServiceOrderRelocateAsset)
router.post('/add-service-request-relocate-asset', authMiddleware.isAuthenticated, assetController.addServiceRequestRelocateAsset)
router.get('/search-asset', authMiddleware.isAuthenticated, assetController.assetSearch)
// Export Asset Data 
router.post('/export-asset', authMiddleware.isAuthenticated, assetController.exportAsset)

module.exports = router