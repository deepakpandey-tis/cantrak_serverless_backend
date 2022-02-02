const addItemFromImportLicense = require('./add-item-from-import-license');
const updateItemFromImportLicense = require('./update-item-from-import-license');
const addItemFromSupplier = require('./add-item-from-supplier');
const updateItemFromSupplier = require('./update-item-from-supplier');
const importItemFromSupplier = require('./import-item-from-supplier');
const getItemFromSupplierList = require('./get-item-from-supplier-list');
const getItemFromSupplier = require('./get-item-from-supplier');
const addWasteMaterial = require('./add-waste-material');
const importWasteMaterial = require('./import-waste-material');
const getWasteMaterialList = require('./get-waste-material-list');
const getWasteMaterial = require('./get-waste-material');
const getRawMaterialForPlantList = require('./get-raw-material-for-plant-list');
const getInventoryItemsList = require('./get-inventory-items-list');
const getItemAvailableLotNos = require('./get-item-available-lotnos');
const getItemLotList = require('./get-item-lot-list');
const addAdjustment = require('./add-adjustment');
const getStorageLocationLedger = require('./get-storage-location-ledger');
const getStockLedger = require('./get-stock-ledger');
const getStockSummary = require('./get-stock-summary');
const getItemTxnList = require('./get-item-txn-list');
const getItemTxn = require('./get-item-txn');
const getStockStatus = require('./get-stock-status');
const getStorageLocationReceiptRegister = require('./get-storage-location-receipt-register');
const getStorageLocationReceiptRegisterExcel = require('./get-storage-location-receipt-register-excel');
const getStorageLocationIssueRegister = require('./get-storage-location-issue-register');
const getStorageLocationIssueRegisterExcel = require('./get-storage-location-issue-register-excel');

module.exports = {
    addItemFromImportLicense,
    updateItemFromImportLicense,
    addItemFromSupplier,
    updateItemFromSupplier,
    importItemFromSupplier,
    getItemFromSupplierList,
    getItemFromSupplier,
    addWasteMaterial,
    importWasteMaterial,
    getWasteMaterialList,
    getWasteMaterial,
    getRawMaterialForPlantList,
    getInventoryItemsList,
    getItemAvailableLotNos,
    getItemLotList,
    addAdjustment,
    getStorageLocationLedger,
    getStockLedger,
    getStockSummary,
    getItemTxnList,
    getItemTxn,
    getStockStatus,
    getStorageLocationReceiptRegister,
    getStorageLocationReceiptRegisterExcel,
    getStorageLocationIssueRegister,
    getStorageLocationIssueRegisterExcel,
};
