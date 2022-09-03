const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const plantController = require('../controllers/plants');


router.post('/get-lot-plant-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getLotPlantList
);

router.post('/get-observation-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getObservationList
);

router.post('/get-observations-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getObservationsList
);

router.get('/get-plants',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlants
);

router.post('/get-plant',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlant
);

router.post('/add-plant',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.addPlant
);

router.post('/delete-plant-lot',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.deletePlantLot
);

router.post('/delete-plant',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.deletePlant
);

router.post('/update-planted-date',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.updatePlantedDate
);

router.post('/get-plant-lot-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlantLotList
);

router.post('/get-plant-lot',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlantLot
);

router.post('/get-plant-lots',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlantLots
);

router.post('/get-plant-existig-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlantExistingGrowthStages
);

router.post('/change-growth-stage',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.changeGrowthStage
);

router.post('/check-lot-name-exists',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.checkLotNameExists
);

router.post('/get-plant-lot-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlantLotLocations
);

router.post('/get-plant-lot-sub-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlantLotSubLocations
);

router.post('/get-growth-stage-txn-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getGrowthStageTxnList
);

router.post('/get-growth-stage-txn',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getGrowthStageTxn
);

router.post('/change-location',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.changeLocation
);

router.post('/get-location-txn-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getLocationTxnList
);

router.post('/get-location-txn',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getLocationTxn
);

router.post('/waste-entry',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.wasteEntry
);

router.post('/get-waste-txn-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getWasteTxnList
);

router.post('/get-waste-txn',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getWasteTxn
);

router.post('/generate-pdf-of-plants',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.generatePdfOfPlants
);

router.post('/get-waste-plant-count',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getWastePlantCount
);

router.post('/get-total-plants',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getTotalPlants
);

router.post('/get-plant-lot-unhealthy-plants-count',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlantLotUnhealthyPlantsCount
);

router.post('/get-plant-lot-current-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getPlantLotCurrentGrowthStages
);


router.post('/get-raw-material-for-plant-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getRawMaterialForPlantList
);

router.post('/get-images',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getImages
);


router.get('/get-companies',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getCompanies
);

router.get('/get-container-types',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getContainerTypes
);

router.post('/get-items',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getItems
);

router.post('/get-strains',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getStrains
);

router.post('/get-species',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getSpecies
);

router.post('/get-growth-stages',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getGrowthStages
);

router.post('/get-licenses',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getLicenses
);

router.post('/get-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getLocations
);

router.post('/get-sub-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getSubLocations
);

router.post('/get-storage-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getStorageLocations
);

router.post('/get-location-sublocation-plantlots',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getLocationSubLocationPlantLots
);

router.post('/get-growing-facility-plants-age',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantController.getGrowingFacilityPlantsAge
);

module.exports = router;
