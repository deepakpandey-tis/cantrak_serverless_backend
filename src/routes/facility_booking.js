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
router.post('/facility-booked-list-by-date',authMiddleware.isAuthenticated,facilityBookingController.getFacilityBookedListbydate)
router.post('/facility-booked-list-report',authMiddleware.isAuthenticated,facilityBookingController.facilityBookedListReport)
router.get('/facility-booked-list-by-name',authMiddleware.isAuthenticated,facilityBookingController.facilityBookedListByFacilityName)
router.post('/facility-booked-list-by-unit',authMiddleware.isAuthenticated,facilityBookingController.facilityBookedListByUnit)
router.get('/facility-booked-list-by-booking-date',authMiddleware.isAuthenticated,facilityBookingController.getFacilityreportByBookingDate)
router.get('/facility-booked-list-by-created-date',authMiddleware.isAuthenticated,facilityBookingController.facilityBookedReportByCreatedDate)
router.post('/facility-booked-cancelled-list',authMiddleware.isAuthenticated,facilityBookingController.getFacilityBookedCancelledList)

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

router.get('/get-tenant-list',authMiddleware.isAuthenticated,facilityBookingController.getTenantList)

/* GET FACILITY AVAILABLE SEATS */
router.post('/get-facility-available-seats', authMiddleware.isAuthenticated, facilityBookingController.getFacilityAvailableSeats);

/* GET FACILITY BOOKED DETAILS FOR CONFIRMATION SCREEN */
router.post('/get-facility-booked-details',authMiddleware.isAuthenticated,facilityBookingController.getFacilityBookedDetails)

router.get('/get-facility-dropdown-list', authMiddleware.isAuthenticated, facilityBookingController.getFacilityDropDownList)

router.post('/get-facility-by-project',authMiddleware.isAuthenticated,facilityBookingController.getFacilityByProject)

router.post('/update-facility-status',authMiddleware.isAuthenticated,facilityBookingController.updateFacilityStatus)

router.post('/cancelled-booking-list-by-date',authMiddleware.isAuthenticated,facilityBookingController.cancelledBookingList)

router.post('/generate-facility-reportId',authMiddleware.isAuthenticated,facilityBookingController.generateReportId)

router.post('/add-facility-report',authMiddleware.isAuthenticated,facilityBookingController.addFacilityReport)

router.post('/update-facility-report',authMiddleware.isAuthenticated,facilityBookingController.updateFacilityReport)

router.post('/get-facility-report-list',authMiddleware.isAuthenticated,facilityBookingController.getFacilityReportList)

router.get('/get-facility-report',authMiddleware.isAuthenticated,facilityBookingController.getFacilityReport)

router.post('/get-facilityList-by-date',authMiddleware.isAuthenticated,facilityBookingController.facilityListingByDate)

router.get('/get-property-unit-list-report',authMiddleware.isAuthenticated,facilityBookingController.getPropertyUnitListForReport)

router.post('/delete-facility-report',authMiddleware.isAuthenticated,facilityBookingController.deleteFacilityManagementReport)

router.post('/get-facility-report-detail',authMiddleware.isAuthenticated,facilityBookingController.getFacilityReportDetailById)

router.post('/get-facility-list-by-project',authMiddleware.isAuthenticated,facilityBookingController.getFacilityListByProject)

router.post('/get-facility-list-by-id',authMiddleware.isAuthenticated,facilityBookingController.getFacilityListByFacilityId)

router.post('/get-unit-list-by-id',authMiddleware.isAuthenticated,facilityBookingController.getUnitListByUnitId)

router.post('/get-unit-and-facility-by-multiple-buildingId',authMiddleware.isAuthenticated,facilityBookingController.getPropertyUnitByMultipleBuilding)

// router.post('/get-facility-by-status',authMiddleware.isAuthenticated,facilityBookingController.facilityListingStatus)

router.post('/get-unit-by-floorId',authMiddleware.isAuthenticated,facilityBookingController.getUnitByFloorId)


module.exports = router;