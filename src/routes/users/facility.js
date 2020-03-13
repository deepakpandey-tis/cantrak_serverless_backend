const Router = require('express').Router;
const authMiddleware = require('../../middlewares/auth')
//require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role');
//require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
//require('../../middlewares/resourceAccessMiddleware')
const facilityBookingController = require('../../controllers/users/facility')
const router = Router()

/* USER FACILITY LIST */
router.post('/get-user-facility-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.getUserFacilityList);

/* FACILITY DETAILS */
router.post('/user-facility-details', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.userFacilityDetails);

/* YOUR  FACILITY BOOKING LIST */
router.post('/your-facility-booking-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.yourFacilityBookingList);


/*FACILITY BOOK NOW */
router.post('/facility-book-now', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.facilityBookNow);


module.exports = router;