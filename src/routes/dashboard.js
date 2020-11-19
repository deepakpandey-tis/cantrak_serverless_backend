const { Router } = require('express')

const router = Router()
const authMiddleware = require('../middlewares/auth')
const dashboardController = require('../controllers/dashboard')
const roleMiddleware = require('../middlewares/role')

router.get('/top-asset-problem', dashboardController.getTopAssetProblem)

/*GET DASHBOARD CARD DATA */
router.post('/get-card-data', authMiddleware.isAuthenticated,
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

/*GET START DATE END DATE TOTAL SERVICE REQUIEST AND TOTAL SERVICE ORDER */
router.post('/get-start-end-service-request-service-order', authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getServiceRequestServiceOrderBwDates)


router.post('/get-main-data-for-pie-chart',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getMainDataForPieChart)

router.post('/get-service-requests-by-problem-type',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getServiceRequestsByProblemType
)


router.post('/get-pie-chart-for-incident-types',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getPieChartForIncidentTypes
);

router.post('/get-pie-chart-for-all-incident-types',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getPieChartForAllIncidentTypes)

router.get('/get-allow-all-company-list',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getAllowAllCompanyList
);

/*GET SERVICE REQUEST DATA BY PROBLEM TYPE FOR CHART */
router.post('/get-service-request-by-problem-type-chart-data',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getServiceRequestByProblemTypeChartdata
)

/*GET SERVICE REQUEST DATA BY PRIORITY  FOR CHART */
router.post('/get-service-request-by-priority-chart-data',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getServiceRequestByPriorityChartdata
)


/*GET SERVICE REQUEST DATA BY MONTH PRIORITY  FOR CHART */
router.post('/get-service-request-by-month-priority-chart-data',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    dashboardController.getServiceRequestByMonthPriorityChartdata
)


module.exports = router;

