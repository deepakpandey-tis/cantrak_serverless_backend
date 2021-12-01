const { Router } = require("express");

const router = Router();
const authMiddleware = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");
const workPlanController = require("../controllers/work-plan");

router.post(
  "/get-feedbacks-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.viewFeedbacksReport
);
router.post(
  "/get-pm-asset-list-by-filter",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getPmAssetListByFilter
);
router.post(
  "/pm-post-feedback-for-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.postFeedbackWithImages
);
router.post(
  "/get-pm-feedback-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getFeedbackList
);
router.post(
  "/get-task-list-bypmid",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getTaskListByPmId
);

router.post(
  "/get-asset-list-of-pm",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getAssetListOfPm
);
router.post(
  "/get-asset-list-with-completed-pm",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getAssetListWithCompletedPm
);

router.post(
  "/get-asset-id-by-asset-serial-or-barcode",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getAssetIdByAssetSerialOrBarcode
);

// Update asset Pm Endate
router.post(
  "/update-asset-pm-endDate",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.updateAssetPm
);

// Get Pm Report
router.post(
  "/get-pm-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getPmReport
);
router.post(
  "/save-pm-template",
  authMiddleware.isAuthenticated,
  authMiddleware.isAuthenticated,
  workPlanController.savePMTemplate
);
router.post(
  "/search-pm-template",
  authMiddleware.isAuthenticated,
  authMiddleware.isAuthenticated,
  workPlanController.searchPMTemplate
);
router.post(
  "/search-pm-by-name",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getPmByName
);

router.post(
  "/pm-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.pmReport
);
router.post(
  "/pm-history-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.pmHistoryReport
);

router.post(
  "/pm-plan-action-schedule-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.pmScheduleReport
);

router.get("/pm-status-clone", workPlanController.pmStatusClone);

router.post(
  "/get-pm-work-order-chart-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getPmWorkorderChart
)

router.post(
  "/get-work-order-pie-chart-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getWorkOrderForPieChart
)

router.post(
  "/get-pm-dashboard-card-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getPmDashboardCardData
)

router.get(
  '/get-project-list-for-pm',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getProjectList
)

router.post(
  '/get-workorder-chart-data-for-assigned-user',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getWorkOrderToAssignedTechnicianForBarChart
)

router.get(
  '/company-lists-for-pm',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getCompanyList

)

router.post(
  '/get-work-done-chart-data',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getWorkDoneChartDataForPMReport
)

router.post(
  '/get-pm-work-report-chart-data',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getPMWorkReportChartData
)

router.post(
  '/get-pm-report-based-on-asset-category',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getPmReportBasedOnAssetCategory
)

module.exports = router;
