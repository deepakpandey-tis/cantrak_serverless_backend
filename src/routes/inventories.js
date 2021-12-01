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
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItemFromSupplierList
);

router.post('/get-item-from-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItemFromSupplier
);

router.post('/add-item-from-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.addItemFromSupplier
);

router.post('/get-waste-material-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getWasteMaterialList
);

router.post('/get-inventory-items-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getInventoryItemsList
);

router.post('/get-waste-material',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getWasteMaterial
);

router.post('/add-waste-material',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.addWasteMaterial
);

router.post('/get-raw-material-for-plant-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getRawMaterialForPlantList
);

router.post('/get-item-available-lotnos',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItemAvailableLotNos
);

router.post('/get-item-lot-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItemLotList
);

router.post('/add-adjustment',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.addAdjustment
);

router.post('/get-storage-location-ledger',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getStorageLocationLedger
);

router.post('/get-stock-ledger',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStockLedger
);

router.post('/get-stock-summary',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getStockSummary
);

router.post('/get-item-txn-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getItemTxnList
);

router.post('/get-item-txn',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getItemTxn
);

router.post('/get-stock-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  inventoriesController.getStockStatus
);

module.exports = router;
