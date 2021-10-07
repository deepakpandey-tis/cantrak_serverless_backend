const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const workPlanController = require('../controllers/work-plans');


router.post('/get-work-plan-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getWorkPlanList
);

/* router.get('/get-work-plans',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getWorkPlans
);
 */
router.post('/get-work-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getWorkPlan
);

router.post('/add-work-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.addWorkPlan
);

router.post('/update-work-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.updateWorkPlan
);

router.post('/delete-work-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.deleteWorkPlan
);

router.post('/add-work-plan-schedule',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.addWorkPlanSchedule
);

router.post('/get-work-order',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getWorkOrder
);

router.post('/get-work-plan-work-order-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.getWorkPlanWorkOrderList
);

router.post('/update-work-order-date',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.updateWorkOrderDate
);

router.post('/cancel-work-order',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.cancelWorkOrder
);

router.post('/update-work-order-tasks-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  workPlanController.updateWorkOrderTasksStatus
);

module.exports = router;
