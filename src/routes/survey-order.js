const { Router } = require("express")
const authMiddleware = require("../middlewares/auth")
const roleMiddleware = require("../middlewares/role")
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware")
const surveyOrderController = require("../controllers/survey-order")

const router = Router();

router.post('/add-survey-order', authMiddleware.isAuthenticated, surveyOrderController.addSurveyOrder);
router.post('/update-survey-order', authMiddleware.isAuthenticated, surveyOrderController.updateSurveyOrder);

// We can also get survey order by serviceRequestId so we support both at same route
router.post('/get-survey-orders', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.getSurveyOrderList)
router.post('/get-survey-order-details', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.getSurveyOrderDetails)
router.post('/update-remarks-notes', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.updateRemarksNotes)
router.post('/get-remarks-notes-list', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.getRemarksNotesList)
router.post('/delete-remarks-notes', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.deleteRemarksNotes);
/// Survey Order Export Data 
router.post('/export-survey-order', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.exportSurveyOrder);
router.post('/update-survey-status', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible, surveyOrderController.updateSurveyStatus)

module.exports = router;