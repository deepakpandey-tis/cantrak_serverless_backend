const {Router} = require("express")
const authMiddleware = require("../../middlewares/auth")
const userMiddleware = require("../../middlewares/userMiddleware")
const serviceAppointmentController = require("../../controllers/users/service-appointment");

const router = Router();

router.post('/get-service-appointment-list', authMiddleware.isAuthenticated, userMiddleware.customerInfo,serviceAppointmentController.getServiceAppointmentList)

module.exports = router;