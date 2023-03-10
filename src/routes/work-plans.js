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
  resourceAccessMiddleware.isAccessible,
  workPlanController.getWorkPlanList
);

/* router.get('/get-work-plans',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getWorkPlans
);
 */
router.post('/get-work-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getWorkPlan
);

router.post('/add-work-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.addWorkPlan
);

router.post('/update-work-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.updateWorkPlan
);

router.post('/delete-work-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.deleteWorkPlan
);

router.post('/add-work-plan-schedule',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.addWorkPlanSchedule
);

router.post('/get-work-order',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getWorkOrder
);

router.post('/get-work-plan-work-order-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getWorkPlanWorkOrderList
);

router.post('/update-work-order-date',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.updateWorkOrderDate
);

router.post('/cancel-work-order',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.cancelWorkOrder
);

router.post('/uncancel-work-order',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.uncancelWorkOrder
);

router.post('/update-work-order-tasks-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.updateWorkOrderTasksStatus
);

router.post('/get-user-team-work-order-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getUserTeamWorkOrderList
);


router.get('/get-companies',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getCompanies
);

router.post('/get-location-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getLocationList
);

router.post('/get-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getLocations
);

router.post('/get-sub-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getSubLocations
);

router.post('/get-locations-sub-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getLocationsSubLocations
);

router.post('/add-work-order-task-remark',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.addWorkOrderTaskRemark
);

router.post('/update-work-order-task-remark',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.updateWorkOrderTaskRemark
);

router.post('/get-teams',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getTeams
);

router.post('/get-locations-sub-locations-plant-lots',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getLocationsSubLocationsPlantLots
);

router.post('/get-lot-plant-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getLotPlantList
);

router.post('/get-plant',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getPlant
);

router.post('/get-observations-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  workPlanController.getObservationsList
);

module.exports = router;
