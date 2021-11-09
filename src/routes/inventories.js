const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const inventoriesController = require('../controllers/inventories');


router.post('/get-item-from-supplier-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getItemFromSupplierList
);

router.post('/get-item-from-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getItemFromSupplier
);

router.post('/add-item-from-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.addItemFromSupplier
);

router.post('/get-waste-material-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getWasteMaterialList
);

router.post('/get-inventory-items-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getInventoryItemsList
);

router.post('/get-waste-material',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getWasteMaterial
);

router.post('/add-waste-material',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.addWasteMaterial
);

router.post('/get-raw-material-for-plant-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getRawMaterialForPlantList
);

router.post('/get-item-available-lotnos',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getItemAvailableLotNos
);

router.post('/get-item-lot-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getItemLotList
);

router.post('/add-adjustment',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.addAdjustment
);

router.post('/get-stock-ledger',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getStockLedger
);

module.exports = router;
