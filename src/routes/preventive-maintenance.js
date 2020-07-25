const { Router } = require("express");

const router = Router();
const authMiddleware = require("../middlewares/auth");
const pmController = require("../controllers/preventive-maintenance");

// router.post("/get-pm-task-schedule-list", authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getPMList);
router.post("/get-feedbacks-details", authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.viewFeedbacksReport);
// router.post('/create-pm-task-schedule', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.createPmTaskSchedule)
router.post('/get-pm-asset-list-by-filter', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getPmAssetListByFilter)
// router.post('/assign-team-to-pm-task', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.assignTeamToPmTask)
router.post('/pm-post-feedback-for-asset', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.postFeedbackWithImages)
router.post('/get-pm-feedback-list', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getFeedbackList)
router.post('/get-task-list-bypmid', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getTaskListByPmId)

// router.post('/get-single-asset-pm-schedule-list', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getSingleAssetPmScheduleList)
router.post('/get-asset-list-of-pm', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getAssetListOfPm)
router.post('/get-asset-list-with-completed-pm', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getAssetListWithCompletedPm)
// router.post('/get-pm-by-id', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getPmById)
// router.post('/get-pm-list-by-asset-id', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getPmListByAssetId)
router.post('/get-asset-id-by-asset-serial-or-barcode', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getAssetIdByAssetSerialOrBarcode)
// Update asset Pm Endate
router.post('/update-asset-pm-endDate', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.updateAssetPm)
// Get Pm Report
router.post('/get-pm-report', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getPmReport)
router.post('/save-pm-template', authMiddleware.isAuthenticated, authMiddleware.isAuthenticated, pmController.savePMTemplate)
router.post('/search-pm-template', authMiddleware.isAuthenticated, authMiddleware.isAuthenticated, pmController.searchPMTemplate)
router.post('/search-pm-by-name', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.getPmByName)

router.post('/pm-report', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.pmReport)
router.post('/pm-history-report',authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.pmHistoryReport)

router.post('/pm-plan-action-schedule-report',authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, pmController.pmScheduleReport)

router.get('/pm-status-clone', pmController.pmStatusClone)

module.exports = router
