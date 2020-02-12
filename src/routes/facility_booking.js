const Router = require('express').Router;
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware')
const facilityBookingController = require('../controllers/facility_booking')
const router = Router()

// router.get('/', authMiddleware.isAuthenticated, 
// roleMiddleware.parseUserPermission,
// facilityBookingController.test)

router.post('/add-facility', authMiddleware.isAuthenticated,facilityBookingController.addFacility)

router.post('/facility-details',authMiddleware.isAuthenticated,facilityBookingController.facilityDetails)

module.exports = router;