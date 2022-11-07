const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const cropCyclePlanController = require('../controllers/crop-cycle-plan');


router.post('/get-crop-cycle-plan-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getCropCyclePlanList
);

router.post('/get-crop-cycle-plans',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getCropCyclePlans
);

router.post('/get-crop-cycle-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getCropCyclePlan
);

router.post('/add-crop-cycle-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.addCropCyclePlan
);

router.post('/update-crop-cycle-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.updateCropCyclePlan
);

router.post('/delete-crop-cycle-plan',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.deleteCropCyclePlan
);

router.post('/update-crop-cycle-plan-plant-detail',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.updateCropCyclePlanPlantDetail
);

router.post('/get-crop-cycle-calendar-detail',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getCropCycleCalendarDetail
);


router.get('/get-companies',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getCompanies
);

router.post('/get-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getLocations
);

router.post('/get-sub-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getSubLocations
);

router.post('/get-species-having-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getSpeciesHavingGrowthStages
);

router.post('/get-strains-having-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getStrainsHavingGrowthStages
);

router.post('/get-species',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getSpecies
);

router.post('/get-strains',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getStrains
);

router.post('/get-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getGrowthStages
);


router.post('/get-plant-lots',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getPlantLots
);

router.post('/get-plant-lot-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getPlantLotGrowthStages
);

router.post('/get-plant-lot-expected-actual-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  cropCyclePlanController.getPlantLotExpectedActualGrowthStages
);

module.exports = router;
