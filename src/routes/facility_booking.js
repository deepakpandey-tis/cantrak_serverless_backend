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

router.post('/facility-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.facilityDetails)

router.post('/get-facility-booking-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityBookingList)

router.get('/generate-facility-id', authMiddleware.isAuthenticated, facilityBookingController.generateFacilityId)

/* USER FACILITY LIST */
router.post('/get-user-facility-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isFacilityManagementAccessible,
    facilityBookingController.getUserFacilityList);

/* FACILITY DETAILS */
router.post('/user-facility-details', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isFacilityManagementAccessible,
    facilityBookingController.userFacilityDetails);

/* YOUR  FACILITY BOOKING LIST */
router.post('/your-facility-booking-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isFacilityManagementAccessible,
    facilityBookingController.yourFacilityBookingList);


/*FACILITY BOOK NOW */
router.post('/facility-book-now', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    facilityBookingController.facilityBookNow);



router.post('/cancel-booking', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.cancelBooking)

router.post('/facility-delete', authMiddleware.isAuthenticated, facilityBookingController.deleteFacility)

router.post('/approve-facility', authMiddleware.isAuthenticated, facilityBookingController.approveFacility)

router.post('/get-facility-booked-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getfacilityBookedList)
router.post('/facility-booked-list-by-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityBookedListbydate)
router.post('/facility-booked-list-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.facilityBookedListReport)
router.get('/facility-booked-list-by-name', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.facilityBookedListByFacilityName)
router.post('/facility-booked-list-by-unit', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.facilityBookedListByUnit)
router.get('/facility-booked-list-by-booking-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityreportByBookingDate)
router.get('/facility-booked-list-by-created-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.facilityBookedReportByCreatedDate)
router.post('/facility-booked-cancelled-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityBookedCancelledList)

/*ADD FACILTIY CLOSE DATE */
router.post('/add-facility-close-date', authMiddleware.isAuthenticated, facilityBookingController.addFacilityCloseDate)

router.post('/facility-close-date-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.facilityCloseDateList)

router.post('/delete-facility-close-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.deleteFacilityCloseDate)

router.post('/update-facility-close-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.updateFacilityCloseDate)

router.get('/get-total-approval-required-booking', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.getTotalApprovalRequiredBooking)

/*GET BOOKING CANCELLED LIST */
router.post('/get-booking-cancelled-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getBookingCancelledList)

router.post('/get-facility-listing', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityListing)

router.post('/get-unit-by-building', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getUnitByBuilding)

router.post('/get-tenant-by-unit', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getTenantByUnit)

router.get('/get-tenant-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getTenantList)

/* GET FACILITY AVAILABLE SEATS */
router.post('/get-facility-available-seats', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityAvailableSeats);

/* GET FACILITY BOOKED DETAILS FOR CONFIRMATION SCREEN */
router.post('/get-facility-booked-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityBookedDetails)

router.get('/get-facility-dropdown-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityDropDownList)

router.post('/get-facility-by-project', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityByProject)

router.post('/update-facility-status', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.updateFacilityStatus)

router.post('/cancelled-booking-list-by-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.cancelledBookingList)

router.post('/generate-facility-reportId', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.generateReportId)

router.post('/add-facility-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.addFacilityReport)

router.post('/update-facility-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.updateFacilityReport)

router.post('/get-facility-report-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityReportList)

router.get('/get-facility-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityReport)

router.post('/get-facilityList-by-date', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.facilityListingByDate)

router.get('/get-property-unit-list-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getPropertyUnitListForReport)

router.post('/delete-facility-report', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, facilityBookingController.deleteFacilityManagementReport)

router.post('/get-facility-report-detail', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityReportDetailById)

router.post('/get-facility-list-by-project', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityListByProject)

router.post('/get-facility-list-by-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getFacilityListByFacilityId)

router.post('/get-unit-list-by-id', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getUnitListByUnitId)

router.post('/get-unit-and-facility-by-multiple-buildingId', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getPropertyUnitByMultipleBuilding)

// router.post('/get-facility-by-status',authMiddleware.isAuthenticated,facilityBookingController.facilityListingStatus)

router.post('/get-unit-by-floorId', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isFacilityManagementAccessible, facilityBookingController.getUnitByFloorId)


module.exports = router;