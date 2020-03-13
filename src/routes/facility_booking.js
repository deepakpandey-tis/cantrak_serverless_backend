const Router = require('express').Router;
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware')
const facilityBookingController = require('../controllers/facility_booking')
const router = Router()

// router.get('/', authMiddleware.isAuthenticated,
//     roleMiddleware.parseUserPermission,
//     facilityBookingController.test)

router.post('/get-facility-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.facilityListing)

// router.get('/', authMiddleware.isAuthenticated, 
// roleMiddleware.parseUserPermission,
// facilityBookingController.test)

router.post('/add-facility', authMiddleware.isAuthenticated, facilityBookingController.addFacility)

router.post('/facility-details', authMiddleware.isAuthenticated, facilityBookingController.facilityDetails)

router.post('/get-facility-booking-list', authMiddleware.isAuthenticated, facilityBookingController.getFacilityBookingList)
router.get('/generate-facility-id', authMiddleware.isAuthenticated, facilityBookingController.generateFacilityId)

/* USER FACILITY LIST */
router.post('/get-user-facility-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.getUserFacilityList)

/* FACILITY DETAILS */
router.post('/user-facility-details', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.userFacilityDetails)

/* YOUR  FACILITY BOOKING LIST */
router.post('/your-facility-booking-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.yourFacilityBookingList)


module.exports = router;