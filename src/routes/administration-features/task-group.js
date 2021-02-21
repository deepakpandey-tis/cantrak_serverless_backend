const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')
const taskGroupController = require('../../controllers/administration-features/task-group')

// CREATE TASK GROUP TEMPLATE
router.post(
  "/create-task-group-template",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.createTaskGroupTemplate
);

// GET LIST TASK TEMPLATE
router.post(
  "/get-group-template-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getGroupTemplateList
);

// GET GROUP TASK LIST
router.post(
  "/get-group-task-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getGroupTaskList
);

//CREATE PM TASK GROUP SCHEDULE
router.post(
  "/create-pm-taskgroup-schedule",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.createPmTaskgroupSchedule
);

// GET TASK GROUP SCHEDULE LIST
router.post(
  "/get-taskgroup-schedule-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskGroupScheduleList
);

router.post(
  "/get-pm-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getPmList
);


router.post(
  "/create-brand-new-pm",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,

  taskGroupController.createBrandNewPm
);

// GET TASK GROUP ASSET PMS LIST
router.post(
  "/get-task-group-asset-pms-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskGroupAssetPmsList
);
router.post(
  "/get-task-group-asset-pms-list-on-today",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskGroupAssetPmsListOnToday
);

// CREATE TASK TEMPLATE
router.post(
  "/create-task-template",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.createTaskTemplate
);
// GET TASK TEMPLATE LIST
router.post(
  "/get-task-template-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskTemplateList
);

// GET TASK TEMPLATE COMPLETE DATA
router.post(
  "/get-task-template-complete-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskTemplateComplateList
);

// GET TASK GROUP ASSET PM DETAILS
router.post(
  "/get-taskgroup-asset-pm-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskgroupAssetPmDetails
);

// GET PM TASK DETAILS
router.post(
  "/get-pm-task-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getPmTaskDetails
);

router.post(
  "/create-pm-template",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.createPMTemplate
);
router.post(
  "/update-task-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.updateTaskStatus
);
router.post(
  "/send-feedback-for-task",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.sendFeedbackForTask
);
router.post(
  "/edit-work-order",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.editWorkOrder
);
router.post(
  "/get-task-group-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskGroupDetails
);
router.post(
  "/get-task-group-template-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskGroupTemplateList
);
router.post(
  "/update-task-group-template-detail",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.updateTaskGroupDetails
);
router.post(
  "/get-task-feedbacks",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getFeedbacksOfTask
);

router.post(
  "/get-task-group-schedule-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getTaskGroupScheduleDetails
);
router.post(
  "/update-old-task-group-schedule-with-work-orders",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.updateOldTaskGroupScheduleWithWorkOrders
);

router.post(
  '/toggle-pm-template-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.togglePmTemplateStatus
)


router.get(
  "/export-task-group-template-data",
  authMiddleware.isAuthenticated,
  taskGroupController.exportTaskGroupTemplateData
);

router.post('/edit-work-order-date', authMiddleware.isAuthenticated, taskGroupController.editWorkOrderDate)
router.post('/delete-work-order', authMiddleware.isAuthenticated, taskGroupController.deleteWorkOrder)
router.post('/cancel-work-order', authMiddleware.isAuthenticated, taskGroupController.cancelWorkOrder)


router.post('/pm-location-detail', authMiddleware.isAuthenticated, taskGroupController.pmLocationDetail)

router.post('/generate-work-date', authMiddleware.isAuthenticated, taskGroupController.generateWorkDate)

router.get('/pm-schedule-report', authMiddleware.isAuthenticated, taskGroupController.pmScheduleReport)

/*Single task status update */
router.post(
  "/task-perform",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.taskPerform
);

/* All task status update */
router.post(
  "/all-task-perform",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.allTaskPerform
);


router.post(
  "/task-feedback",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.taskFeedback
);

router.post(
  "/get-work-order-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getWorkOrderList
)

router.post(
  "/update-task-status-result",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.updateTaskStatusResult
)

/**Work Order Report */
router.post(
  "/get-work-order-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPMAccessible,
  taskGroupController.getWorkOrderReport
);

router.post('/cancel-pm-plan',authMiddleware.isAuthenticated,
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isPMAccessible,
taskGroupController.cancelPmPlan
);

router.post('/get-team-data-from-workOrderId',authMiddleware.isAuthenticated,
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isPMAccessible,
taskGroupController.getTeamDataByWorkOrderId
)

router.post('/get-additional-user-by-workOrderId',authMiddleware.isAuthenticated,
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isPMAccessible,
taskGroupController.getAdditionalUsersByWorkOrderId
)
router.post('/get-task-name-by-workOrderDate',authMiddleware.isAuthenticated,
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isPMAccessible,
taskGroupController.getTaskNameFromWorkOrderDate
)

router.post('/get-workDate-by-pmId',authMiddleware.isAuthenticated,
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isPMAccessible,
taskGroupController.getWorkOrderDateFromPmId
)

router.post('/get-workOrderList-By-Date',authMiddleware.isAuthenticated,
roleMiddleware.parseUserPermission,
resourceAccessMiddleware.isPMAccessible,
taskGroupController.getWorkOrderListFromDate
)





module.exports = router