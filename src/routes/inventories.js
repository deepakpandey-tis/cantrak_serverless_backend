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

/* router.post('/get-raw-material-for-plant-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getRawMaterialForPlantList
);
 */
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

router.post('/get-lot-item-summary-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getLotItemSummaryList
);

router.post('/get-lot-item-txns',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getLotItemTxns
);

router.post('/export-item-txn-list-to-excel',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.exportItemTxnListToExcel
);

router.post('/get-item-txn',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItemTxn
);

router.post('/get-receive-waste-from-adj-minus-txn',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getReceiveWasteFromAdjMinusTxn
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

router.post('/get-storage-location-adjustment-register',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStorageLocationAdjustmentRegister
);


router.post('/get-licenses',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getLicenses
);

router.post('/get-license-nars',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getLicenseNars
);

router.post('/get-license-nar-items',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getLicenseNarItems
);


router.get('/get-companies',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getCompanies
);

router.get('/get-ums',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getUMs
);

router.get('/get-item-categories',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItemCategories
);

router.post('/get-items',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getItems
);

router.post('/get-species',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getSpecies
);

router.post('/get-strains',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStrains
);

router.get('/get-suppliers',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getSuppliers
);

router.post('/get-storage-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getStorageLocations
);

router.get('/get-txn-types',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getTxnTypes
);

router.post('/get-txn-sub-types',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  inventoriesController.getTxnSubTypes
);

module.exports = router;
