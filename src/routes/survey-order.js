const {Router} = require("express")
const authMiddleware = require("../middlewares/auth")
const roleMiddleware = require("../middlewares/role")
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware")
const surveyOrderController = require("../controllers/survey-order")

const router = Router();

router.post('/add-survey-order', authMiddleware.isAuthenticated, surveyOrderController.addSurveyOrder);
router.post('/update-survey-order', authMiddleware.isAuthenticated,  surveyOrderController.updateSurveyOrder);

// We can also get survey order by serviceRequestId so we support both at same route
router.post('/get-survey-orders', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.getSurveyOrderList)
router.post('/get-survey-order-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible,  surveyOrderController.getSurveyOrderDetails)
router.post('/update-survey-order-notes', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.updateSurveyOrderNotes)
router.post('/get-survey-order-notes-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.getSurveyOrderNoteList)
router.post('/delete-survey-order-remark', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible,  surveyOrderController.deleteSurveyRemark);
/// Survey Order Export Data 
router.post('/export-survey-order', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.exportSurveyOrder);

module.exports = router;