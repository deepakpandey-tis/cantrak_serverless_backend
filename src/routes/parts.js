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
router.get('/part-list', authMiddleware.isAuthenticated, partsController.partList)
router.get('/part-code-exist',authMiddleware.isAuthenticated,partsController.partCodeExist)
router.get('/get-part-detail-by-id',authMiddleware.isAuthenticated,partsController.getPartDetailById)

module.exports = router;