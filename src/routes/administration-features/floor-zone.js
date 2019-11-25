const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const floorZoneController = require('../../controllers/administration-features/floor-zone')

router.post('/add-floor-zone', authMiddleware.isAuthenticated, floorZoneController.addFloorZone)
router.post('/update-floor-zone', authMiddleware.isAuthenticated, floorZoneController.updateFloorZone)
router.post('/view-floor-zone', authMiddleware.isAuthenticated, floorZoneController.viewFloorZone)
router.post('/delete-floor-zone', authMiddleware.isAuthenticated, floorZoneController.deleteFloorZone)
router.post('/get-floor-zone-list-by-building-id', authMiddleware.isAuthenticated, floorZoneController.getFloorZoneListByBuildingId)
router.get('/get-floor-zone-list', authMiddleware.isAuthenticated, floorZoneController.getFloorZoneList)
// Export Floor Zone Data
router.get('/export-floor-zone', authMiddleware.isAuthenticated, floorZoneController.exportFloorZone)
router.get('/get-floor-zone-all-list', authMiddleware.isAuthenticated, floorZoneController.getFloorZoneAllList)


module.exports = router