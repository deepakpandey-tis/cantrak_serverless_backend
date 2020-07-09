const { Router } = require("express")

const router = Router()
const authMiddleware = require('../middlewares/auth')
// const dashboardController = require('../controllers/dashboard')
const roleMiddleware = require('../middlewares/role')
const facilityDashboardController = require("../controllers/facility_dashboard")
const { route } = require("./dashboard")

/*GET START DATE END DATE TOTAL FACILITY BOOKINGS */
router.post('/get-start-end-facility-bookings',authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,facilityDashboardController.getFacilityBookingsBwDates)

router.post('/get-facility-dashboard-data',authMiddleware.isAuthenticated,facilityDashboardController.getFacilityDasboardData)

router.post('/get-facility-booking-pie-chart',authMiddleware.isAuthenticated,facilityDashboardController.getPieChartForFacilityBookings)

router.post('/get-total-facility-bookings',authMiddleware.isAuthenticated,facilityDashboardController.getTotalFacilityBookings)

router.post('/get-approved-facility-bookings',authMiddleware.isAuthenticated,facilityDashboardController.getApprovedFacilityBookings)

router.post('/get-cancelled-facility-bookings',authMiddleware.isAuthenticated,facilityDashboardController.getCancelledFacilityBookings)


module.exports = router;