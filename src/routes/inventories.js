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

router.post('/add-item-from-import-license',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.addItemFromImportLicense
);

router.post('/update-item-from-import-license',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.updateItemFromImportLicense
);

router.post('/add-item-from-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.addItemFromSupplier
);

router.post('/update-item-from-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.updateItemFromSupplier
);

router.post('/import-item-from-supplier',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.importItemFromSupplier
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

router.post('/update-waste-material',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.updateWasteMaterial
);

router.post('/import-waste-material',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.importWasteMaterial
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
  resourceAccessMiddleware.isAccessible,
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
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStockSummary
);

router.post('/get-item-txn-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItemTxnList
);

router.post('/get-item-txn',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItemTxn
);

router.post('/get-stock-status',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStockStatus
);

router.post('/get-storage-location-receipt-register',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStorageLocationReceiptRegister
);

router.post('/get-storage-location-receipt-register-excel',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStorageLocationReceiptRegisterExcel
);

router.post('/get-storage-location-issue-register',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStorageLocationIssueRegister
);

router.post('/get-storage-location-issue-register-excel',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStorageLocationIssueRegisterExcel
);

module.exports = router;
