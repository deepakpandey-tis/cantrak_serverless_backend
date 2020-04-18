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



router.post('/cancel-booking', authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,facilityBookingController.cancelBooking)

router.post('/facility-delete',authMiddleware.isAuthenticated,facilityBookingController.deleteFacility)

router.post('/approve-facility',authMiddleware.isAuthenticated,facilityBookingController.approveFacility)

router.post('/get-facility-booked-list',authMiddleware.isAuthenticated,facilityBookingController.getfacilityBookedList)
/*ADD FACILTIY CLOSE DATE */
router.post('/add-facility-close-date',authMiddleware.isAuthenticated,facilityBookingController.addFacilityCloseDate)

router.post('/facility-close-date-list',authMiddleware.isAuthenticated,facilityBookingController.facilityCloseDateList)

router.post('/delete-facility-close-date',authMiddleware.isAuthenticated,facilityBookingController.deleteFacilityCloseDate)

router.post('/update-facility-close-date',authMiddleware.isAuthenticated,facilityBookingController.updateFacilityCloseDate)

router.get('/get-total-approval-required-booking',authMiddleware.isAuthenticated,facilityBookingController.getTotalApprovalRequiredBooking)



module.exports = router;