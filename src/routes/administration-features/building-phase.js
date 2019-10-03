const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const buildingPhaseController = require('../../controllers/administration-features/building-phase')

router.post('/add-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.addBuildingPhase)
router.post('/update-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.updateBuildingPhase)
router.post('/view-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.viewBuildingPhase)
router.post('/delete-building-phase', authMiddleware.isAuthenticated, buildingPhaseController.deleteBuildingPhase)
router.get('/get-building-phase-list', authMiddleware.isAuthenticated, buildingPhaseController.getBuildingPhaseList)

module.exports = router