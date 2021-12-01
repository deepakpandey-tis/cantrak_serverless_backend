const { Router } = require("express")
const authMiddleware = require("../middlewares/auth")
const roleMiddleware = require("../middlewares/role")
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware")
const surveyOrderController = require("../controllers/survey-order")

const router = Router();

router.post('/add-survey-order', authMiddleware.isAuthenticated, surveyOrderController.addSurveyOrder);
router.post('/update-survey-order', authMiddleware.isAuthenticated, surveyOrderController.updateSurveyOrder);

// We can also get survey order by serviceRequestId so we support both at same route
//TODO: REMOVE BELOW API
router.post('/get-survey-orders', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible, surveyOrderController.getSurveyOrderList)

router.post('/get-survey-order-list-new', 
authMiddleware.isAuthenticated, 
roleMiddleware.parseUserPermission, 
resourceAccessMiddleware.isAccessible,
surveyOrderController.getSurveyOrderListNew)

router.post('/get-survey-order-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isAccessible, surveyOrderController.getSurveyOrderDetails)
/// Survey Order Export Data 
router.post('/export-survey-order', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible, surveyOrderController.exportSurveyOrder);
router.post('/update-survey-status', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isAccessible, surveyOrderController.updateSurveyStatus)


module.exports = router;