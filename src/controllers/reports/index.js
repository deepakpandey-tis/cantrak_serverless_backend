const getReportList = require('./get-report-list');
const addUserReport = require('./add-user-report');
const deleteUserReport = require('./delete-user-report');

const getCompanies = require('./masters/get-companies');
const getUMs = require('./masters/get-ums');
const getItemCategories = require('./masters/get-item-categories');
const getItems = require('./masters/get-items');
const getStorageLocations = require('./masters/get-storage-locations');

const getStockLedger = require('./inventories/get-stock-ledger');
const getStockSummary = require('./inventories/get-stock-summary');
const getStockStatus = require('./inventories/get-stock-status');

const getStorageLocationReceiptRegister = require('./inventories/get-storage-location-receipt-register');
const getStorageLocationIssueRegister = require('./inventories/get-storage-location-issue-register');
const getStorageLocationAdjustmentRegister = require('./inventories/get-storage-location-adjustment-register');
const getStorageLocationLedger = require('./inventories/get-storage-location-ledger');

module.exports = {
    getReportList,
    addUserReport,
    deleteUserReport,

    getCompanies,
    getUMs,
    getItemCategories,
    getItems,
    getStorageLocations,

    getStockLedger,
    getStockSummary,
    getStockStatus,

    getStorageLocationReceiptRegister,
    getStorageLocationIssueRegister,
    getStorageLocationAdjustmentRegister,
    getStorageLocationLedger,
};
