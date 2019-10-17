const { Router } = require("express");

const router = Router();
const authMiddleware = require("../middlewares/auth");
const pmController = require("../controllers/preventive-maintenance");

router.post("/get-pm-task-schedule-list",authMiddleware.isAuthenticated,authMiddleware.isAdmin,pmController.getPMList);
router.post("/get-feedbacks-details",authMiddleware.isAuthenticated,authMiddleware.isAdmin,pmController.viewFeedbacksReport);
router.post('/create-pm-task-schedule', authMiddleware.isAuthenticated, authMiddleware.isAdmin, pmController.createPmTaskSchedule)
router.post('/get-pm-asset-list-by-filter', authMiddleware.isAuthenticated, authMiddleware.isAdmin, pmController.getPmAssetListByFilter)
router.post('/assign-team-to-pm-task', authMiddleware.isAuthenticated,authMiddleware.isAdmin, pmController.assignTeamToPmTask)
router.post('/pm-post-feedback-for-asset', authMiddleware.isAuthenticated, authMiddleware.isAdmin, pmController.postFeedbackWithImages)
router.post('/get-pm-feedback-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin,pmController.getFeedbackList)

module.exports = router
