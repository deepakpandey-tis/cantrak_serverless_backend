const { Router } = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
const dashboardController = require('../controllers/dashboard')
const roleMiddleware = require('../middlewares/role')
const facilityDashboardController = require("../controllers/facility_dashboard")

/*GET START DATE END DATE TOTAL FACILITY BOOKINGS */
router.post('/get-start-end-facility-bookings',authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,facilityDashboardController.getFacilityBookingsBwDates)

router.get('/get-facility-dashboard-data',authMiddleware.isAuthenticated,facilityDashboardController.getFacilityDasboardData)


module.exports = router;