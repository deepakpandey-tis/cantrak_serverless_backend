const addItemFromImportLicense = require('./add-item-from-import-license');
const updateItemFromImportLicense = require('./update-item-from-import-license');
const addItemFromSupplier = require('./add-item-from-supplier');
const updateItemFromSupplier = require('./update-item-from-supplier');
const importItemFromSupplier = require('./import-item-from-supplier');
const getItemFromSupplierList = require('./get-item-from-supplier-list');
const getItemFromSupplier = require('./get-item-from-supplier');
const addWasteMaterial = require('./add-waste-material');
const updateWasteMaterial = require('./update-waste-material');
const importWasteMaterial = require('./import-waste-material');
const getWasteMaterialList = require('./get-waste-material-list');
const getWasteMaterial = require('./get-waste-material');
// const getRawMaterialForPlantList = require('./get-raw-material-for-plant-list');
const getInventoryItemsList = require('./get-inventory-items-list');
const getItemAvailableLotNos = require('./get-item-available-lotnos');
const getItemLotList = require('./get-item-lot-list');
const addAdjustment = require('./add-adjustment');
const getStorageLocationLedger = require('./get-storage-location-ledger');
const getStockLedger = require('./get-stock-ledger');
const getStockSummary = require('./get-stock-summary');
const getItemTxnList = require('./get-item-txn-list');
const getLotItemSummaryList = require('./get-lot-item-summary-list');

const exportItemTxnListToExcel = require('./export-item-txn-list-to-excel');
const getItemTxn = require('./get-item-txn');
const getReceiveWasteFromAdjMinusTxn = require('./get-receive-waste-from-adj-minus-txn');
const getStockStatus = require('./get-stock-status');
const getStorageLocationReceiptRegister = require('./get-storage-location-receipt-register');
const getStorageLocationReceiptRegisterExcel = require('./get-storage-location-receipt-register-excel');
const getStorageLocationIssueRegister = require('./get-storage-location-issue-register');
const getStorageLocationIssueRegisterExcel = require('./get-storage-location-issue-register-excel');
const getStorageLocationAdjustmentRegister = require('./get-storage-location-adjustment-register');

const getCompanies = require('./masters/get-companies');
const getUMs = require('./masters/get-ums');
const getItemCategories = require('./masters/get-item-categories');
const getItems = require('./masters/get-items');
const getSpecies = require('./masters/get-species');
const getStrains = require('./masters/get-strains');
const getSuppliers = require('./masters/get-suppliers');
const getStorageLocations = require('./masters/get-storage-locations');
const getTxnTypes = require('./masters/get-txn-types');
const getTxnSubTypes = require('./masters/get-txn-sub-types');

const getLicenses = require('./licenses/get-licenses');
const getLicenseNars = require('./licenses/get-license-nars');
const getLicenseNarItems = require('./licenses/get-license-nar-items');

module.exports = {
    addItemFromImportLicense,
    updateItemFromImportLicense,
    addItemFromSupplier,
    updateItemFromSupplier,
    importItemFromSupplier,
    getItemFromSupplierList,
    getItemFromSupplier,
    addWasteMaterial,
    updateWasteMaterial,
    importWasteMaterial,
    getWasteMaterialList,
    getWasteMaterial,
    // getRawMaterialForPlantList,
    getInventoryItemsList,
    getItemAvailableLotNos,
    getItemLotList,
    addAdjustment,
    getStorageLocationLedger,
    getStockLedger,
    getStockSummary,
    getItemTxnList,
    getLotItemSummaryList,

    exportItemTxnListToExcel,
    getItemTxn,
    getReceiveWasteFromAdjMinusTxn,
    getStockStatus,
    getStorageLocationReceiptRegister,
    getStorageLocationReceiptRegisterExcel,
    getStorageLocationIssueRegister,
    getStorageLocationIssueRegisterExcel,
    getStorageLocationAdjustmentRegister,

    getCompanies,
    getUMs,
    getItemCategories,
    getItems,
    getSpecies,
    getStrains,
    getSuppliers,
    getStorageLocations,
    getTxnTypes,
    getTxnSubTypes,

    getLicenses,
    getLicenseNars,
    getLicenseNarItems,
};
