const { Router } = require("express")
const authMiddleware = require('../middlewares/auth');

const router = Router()

const partsController = require(
    '../controllers/parts'
)

// router.gdet('/get-parts', authMiddleware.isAuthenticated, partsController.getParts)
router.post('/get-parts', authMiddleware.isAuthenticated, partsController.getParts)
router.post('/add-parts', authMiddleware.isAuthenticated, partsController.addParts)
router.post('/update-part-details', authMiddleware.isAuthenticated, partsController.updatePartDetails)
router.post('/get-part-details', authMiddleware.isAuthenticated, partsController.getPartDetails)
router.post('/add-part-stock', authMiddleware.isAuthenticated, partsController.addPartStock)
router.get('/search-part', authMiddleware.isAuthenticated, partsController.searchParts)
router.post('/export-part', authMiddleware.isAuthenticated, partsController.exportPart)
module.exports = router;