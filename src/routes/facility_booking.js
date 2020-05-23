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

/*GET BOOKING CANCELLED LIST */
router.post('/get-booking-cancelled-list',authMiddleware.isAuthenticated,facilityBookingController.getBookingCancelledList)

router.post('/get-facility-listing', authMiddleware.isAuthenticated, facilityBookingController.getFacilityListing)

router.post('/get-unit-by-building',authMiddleware.isAuthenticated,facilityBookingController.getUnitByBuilding)

router.post('/get-tenant-by-unit', authMiddleware.isAuthenticated,facilityBookingController.getTenantByUnit)

/* GET FACILITY AVAILABLE SEATS */
router.post('/get-facility-available-seats', authMiddleware.isAuthenticated, facilityBookingController.getFacilityAvailableSeats);

/* GET FACILITY BOOKED DETAILS FOR CONFIRMATION SCREEN */
router.post('/get-facility-booked-details',authMiddleware.isAuthenticated,facilityBookingController.getFacilityBookedDetails)

router.get('/get-facility-dropdown-list', authMiddleware.isAuthenticated, facilityBookingController.getFacilityDropDownList)

router.post('/get-facility-by-project',authMiddleware.isAuthenticated,facilityBookingController.getFacilityByProject)

module.exports = router;