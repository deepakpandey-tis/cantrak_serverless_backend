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

router.post('/add-facility', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.addFacility)

router.post('/facility-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.facilityDetails)

router.post('/get-facility-booking-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityBookingList)

router.get('/generate-facility-id', authMiddleware.isAuthenticated, facilityBookingController.generateFacilityId)

/* USER FACILITY LIST */
router.post('/get-user-facility-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    facilityBookingController.getUserFacilityList);

/* FACILITY DETAILS */
router.post('/user-facility-details', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    facilityBookingController.userFacilityDetails);

/* YOUR  FACILITY BOOKING LIST */
router.post('/your-facility-booking-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible,
    facilityBookingController.yourFacilityBookingList);


/*FACILITY BOOK NOW */
router.post('/facility-book-now', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.facilityBookNow);



router.post('/cancel-booking', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.cancelBooking)

router.post('/facility-delete', authMiddleware.isAuthenticated, facilityBookingController.deleteFacility)

router.post('/approve-facility', authMiddleware.isAuthenticated, facilityBookingController.approveFacility)

router.post('/get-facility-booked-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getfacilityBookedList)
router.post('/facility-booked-list-by-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityBookedListbydate)
router.post('/facility-booked-list-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.facilityBookedListReport)
router.get('/facility-booked-list-by-name', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.facilityBookedListByFacilityName)
router.post('/facility-booked-list-by-unit', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.facilityBookedListByUnit)
router.get('/facility-booked-list-by-booking-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityreportByBookingDate)
router.get('/facility-booked-list-by-created-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.facilityBookedReportByCreatedDate)
router.post('/facility-booked-cancelled-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityBookedCancelledList)

/*ADD FACILTIY CLOSE DATE */
router.post('/add-facility-close-date', authMiddleware.isAuthenticated, facilityBookingController.addFacilityCloseDate)

router.post('/facility-close-date-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.facilityCloseDateList)

router.post('/delete-facility-close-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.deleteFacilityCloseDate)

router.post('/update-facility-close-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.updateFacilityCloseDate)

router.get('/get-total-approval-required-booking', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.getTotalApprovalRequiredBooking)

/*GET BOOKING CANCELLED LIST */
router.post('/get-booking-cancelled-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getBookingCancelledList)

router.post('/get-facility-listing', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityListing)

router.post('/get-unit-by-building', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getUnitByBuilding)

router.post('/get-tenant-by-unit', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getTenantByUnit)

router.get('/get-tenant-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getTenantList)

/* GET FACILITY AVAILABLE SEATS */
router.post('/get-facility-available-seats', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityAvailableSeats);

/* GET FACILITY BOOKED DETAILS FOR CONFIRMATION SCREEN */
router.post('/get-facility-booked-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityBookedDetails)

router.get('/get-facility-dropdown-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityDropDownList)

router.post('/get-facility-by-project', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityByProject)

router.post('/update-facility-status', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.updateFacilityStatus)

router.post('/cancelled-booking-list-by-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.cancelledBookingList)

router.post('/generate-facility-reportId', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.generateReportId)

router.post('/add-facility-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.addFacilityReport)

router.post('/update-facility-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.updateFacilityReport)

router.post('/get-facility-report-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityReportList)

router.get('/get-facility-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityReport)

router.post('/get-facilityList-by-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.facilityListingByDate)

router.get('/get-property-unit-list-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getPropertyUnitListForReport)

router.post('/delete-facility-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.deleteFacilityManagementReport)

router.post('/get-facility-report-detail', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityReportDetailById)

router.post('/get-facility-list-by-project', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityListByProject)

router.post('/get-facility-list-by-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getFacilityListByFacilityId)

router.post('/get-unit-list-by-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getUnitListByUnitId)

router.post('/get-unit-and-facility-by-multiple-buildingId', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getPropertyUnitByMultipleBuilding)

// router.post('/get-facility-by-status',authMiddleware.isAuthenticated,facilityBookingController.facilityListingStatus)

router.post('/get-unit-by-floorId', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, facilityBookingController.getUnitByFloorId)


module.exports = router;