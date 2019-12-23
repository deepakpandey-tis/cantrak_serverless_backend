const {Router} = require("express")
const authMiddleware = require("../middlewares/auth")
const surveyOrderController = require("../controllers/survey-order")

const router = Router();

router.post('/add-survey-order', authMiddleware.isAuthenticated, surveyOrderController.addSurveyOrder);
router.post('/update-survey-order', authMiddleware.isAuthenticated,  surveyOrderController.updateSurveyOrder);

// We can also get survey order by serviceRequestId so we support both at same route
router.post('/get-survey-orders', authMiddleware.isAuthenticated,  surveyOrderController.getSurveyOrderList)
router.post('/get-survey-order-details', authMiddleware.isAuthenticated,  surveyOrderController.getSurveyOrderDetails)
router.post('/update-survey-order-notes', authMiddleware.isAuthenticated,  surveyOrderController.updateSurveyOrderNotes)
router.post('/get-survey-order-notes-list', authMiddleware.isAuthenticated,  surveyOrderController.getSurveyOrderNoteList)
router.post('/delete-survey-order-remark', authMiddleware.isAuthenticated,  surveyOrderController.deleteSurveyRemark);
/// Survey Order Export Data 
router.post('/export-survey-order', authMiddleware.isAuthenticated,  surveyOrderController.exportSurveyOrder);

module.exports = router;