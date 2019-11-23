const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const buildingPhaseController = require('../../controllers/administration-features/building-phase')

router.post('/add-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.addBuildingPhase)
router.post('/update-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.updateBuildingPhase)
router.post('/view-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.viewBuildingPhase)
router.post('/delete-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.deleteBuildingPhase)
router.get('/get-building-phase-list', authMiddleware.isAuthenticated, buildingPhaseController.getBuildingPhaseList)
// Export Building Phase
router.get('/export-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.exportBuildingPhase)
router.get('/get-buildings-phases-all-list', authMiddleware.isAuthenticated, buildingPhaseController.getBuildingPhaseAllList)



module.exports = router