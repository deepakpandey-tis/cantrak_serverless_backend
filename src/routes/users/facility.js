const Router = require('express').Router;
const authMiddleware = require('../../middlewares/auth')
//require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role');
//require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
//require('../../middlewares/resourceAccessMiddleware')
const facilityBookingController = require('../../controllers/users/facility');
const userMiddleware = require("../../middlewares/userMiddleware");

const router = Router();

router.post('/get-user-incoming-parcels', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
facilityBookingController.getIncomingParcelList);

router.post('/get-user-outgoing-parcels', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
facilityBookingController.getOutgoingParcelList);

router.post('/get-user-picked-up-parcels', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
facilityBookingController.getPickedUpParcelList);

router.post('/get-user-dispatched-parcels', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
facilityBookingController.getDispatchedParcelList);


router.post('/get-user-parcel-details', authMiddleware.isAuthenticated, userMiddleware.customerInfo,facilityBookingController.getParcelDetails);

router.post('/get-parcel-approval-list', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
facilityBookingController.getParcelApprovalList);

router.post('/cancel-parcel', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
facilityBookingController.cancelParcel);

router.post('/approve-parcel', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
facilityBookingController.approveParcel);


/* USER FACILITY LIST */
router.post('/get-user-facility-list', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    facilityBookingController.getUserFacilityList);

/* FACILITY DETAILS */
router.post('/user-facility-details', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    facilityBookingController.userFacilityDetails);

/* YOUR  FACILITY BOOKING LIST */
router.post('/your-facility-booking-list', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    facilityBookingController.yourFacilityBookingList);


/*FACILITY BOOK NOW */
router.post('/facility-book-now', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    facilityBookingController.facilityBookNow);

/* GET FACILITY AVAILABLE SEATS */
router.post('/get-facility-available-seats', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    facilityBookingController.getFacilityAvailableSeats);

router.post('/cancel-booking', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    facilityBookingController.cancelBooking);

router.post('/get-all-units', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    facilityBookingController.getUnitList);

router.post('/get-units-list', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    facilityBookingController.getAllUnitList);

router.post('/checked-in-facility',authMiddleware.isAuthenticated,userMiddleware.customerInfo,
    facilityBookingController.checkInFacility)



module.exports = router;