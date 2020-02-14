const { Router } = require('express')

const router = Router()
const authMiddleware = require('../middlewares/auth')
const dashboardController = require('../controllers/dashboard')
const roleMiddleware = require('../middlewares/role')

router.get('/top-asset-problem', dashboardController.getTopAssetProblem)

/*GET DASHBOARD CARD DATA */
router.get('/get-card-data', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getDashboardData)

/*GET CURRENT DATE SERVICE APPOINTMENT LIST */
router.post('/get-current-date-service-appointment-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getCurrentDateServiceAppointmentList)


/*GET CURRENT DATE SURVEY APPOINTMENT LIST */
router.post('/get-current-date-survey-appointment-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getCurrentDateSurveyAppointmentList)

/*GET CURRENT DATE SCHEDULE WORK ORDER LIST */
router.post('/get-schedule-work-order-list', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getScheduleWorkOrderList)


module.exports = router;

