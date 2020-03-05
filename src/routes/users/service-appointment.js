const { Router } = require("express")
const authMiddleware = require("../../middlewares/auth")
const userMiddleware = require("../../middlewares/userMiddleware")
const serviceAppointmentController = require("../../controllers/users/service-appointment");

const router = Router();

router.post('/get-service-appointment-list',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceAppointmentController.getServiceAppointmentList);

router.post('/get-service-orders-list',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceAppointmentController.getServiceOrderList);


router.post("/get-service-request-assigned-assets",
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceAppointmentController.getServiceRequestAssignedAssets);

router.post("/get-service-request-assigned-charges",
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceAppointmentController.getServiceRequestAssignedCharges);

router.post("/get-service-request-assigned-parts",
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceAppointmentController.getServiceRequestAssignedParts);

router.post('/get-service-appointment-details',
    authMiddleware.isAuthenticated, userMiddleware.customerInfo,
    serviceAppointmentController.getServiceAppointmentDetails)



module.exports = router;