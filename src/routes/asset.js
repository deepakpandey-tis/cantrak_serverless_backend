const express = require("express")

const router = express.Router()
const authMiddleware = require('../middlewares/auth')
const assetController = require("../controllers/asset")

router.post('/add-asset', authMiddleware.isAuthenticated, assetController.addAsset)
router.get('/get-asset-list', authMiddleware.isAuthenticated, assetController.getAssetList)
router.post('/get-asset-details', authMiddleware.isAuthenticated, assetController.getAssetDetails)
router.post('/update-asset-details',authMiddleware.isAuthenticated,assetController.updateAssetDetails)

module.exports = router