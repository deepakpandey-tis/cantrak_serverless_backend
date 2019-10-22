const {Router} = require("express")
const authMiddleware = require("../middlewares/auth")
const surveyOrderController = require("../controllers/survey-order")

const router = Router();

router.post('/add-survey-order', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin,surveyOrderController.addSurveyOrder);
router.post('/update-survey-order', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, surveyOrderController.updateSurveyOrder);

// We can also get survey order by serviceRequestId so we support both at same route
router.post('/get-survey-orders', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, surveyOrderController.getSurveyOrderList)
router.post('/get-survey-order-details', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, surveyOrderController.getSurveyOrderDetails)
router.post('/update-survey-order-notes', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, surveyOrderController.updateSurveyOrderNotes)
router.post('/get-survey-order-notes-list', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, surveyOrderController.getSurveyOrderNoteList)
router.post('/delete-survey-order-remark', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, surveyOrderController.deleteSurveyRemark);
/// Survey Order Export Data 
router.post('/export-survey-order', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, surveyOrderController.exportSurveyOrder);

module.exports = router;