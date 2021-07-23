const { Router } = require("express");

const router = Router();
const authMiddleware = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");
const pmController = require("../controllers/preventive-maintenance");

router.post(
  "/get-feedbacks-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.viewFeedbacksReport
);
router.post(
  "/get-pm-asset-list-by-filter",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getPmAssetListByFilter
);
router.post(
  "/pm-post-feedback-for-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.postFeedbackWithImages
);
router.post(
  "/get-pm-feedback-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getFeedbackList
);
router.post(
  "/get-task-list-bypmid",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getTaskListByPmId
);

router.post(
  "/get-asset-list-of-pm",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getAssetListOfPm
);
router.post(
  "/get-asset-list-with-completed-pm",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getAssetListWithCompletedPm
);

router.post(
  "/get-asset-id-by-asset-serial-or-barcode",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getAssetIdByAssetSerialOrBarcode
);

// Update asset Pm Endate
router.post(
  "/update-asset-pm-endDate",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.updateAssetPm
);

// Get Pm Report
router.post(
  "/get-pm-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getPmReport
);
router.post(
  "/save-pm-template",
  authMiddleware.isAuthenticated,
  authMiddleware.isAuthenticated,
  pmController.savePMTemplate
);
router.post(
  "/search-pm-template",
  authMiddleware.isAuthenticated,
  authMiddleware.isAuthenticated,
  pmController.searchPMTemplate
);
router.post(
  "/search-pm-by-name",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getPmByName
);

router.post(
  "/pm-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.pmReport
);
router.post(
  "/pm-history-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.pmHistoryReport
);

router.post(
  "/pm-plan-action-schedule-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.pmScheduleReport
);

router.get("/pm-status-clone", pmController.pmStatusClone);

router.post(
  "/get-pm-work-order-chart-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getPmWorkorderChart
)

router.post(
  "/get-work-order-pie-chart-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getWorkOrderForPieChart
)

router.post(
  "/get-pm-dashboard-card-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getPmDashboardCardData
)

router.get(
  '/get-project-list-for-pm',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getProjectList
)

router.post(
  '/get-workorder-chart-data-for-assigned-user',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getWorkOrderToAssignedTechnicianForBarChart
)

router.get(
  '/company-lists-for-pm',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getCompanyList

)

router.post(
  '/get-work-done-chart-data',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getWorkDoneChartDataForPMReport
)

router.post(
  '/get-pm-work-report-chart-data',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  pmController.getPMWorkReportChartData
)

module.exports = router;
