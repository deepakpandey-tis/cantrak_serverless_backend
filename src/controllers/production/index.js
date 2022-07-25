const addProduction = require('./add-production');
const getProductionList = require('./get-production-list');
const getProductionLotList = require('./get-production-lot-list');
const getProductionLot = require('./get-production-lot');
const getReportsList = require('./get-reports-list');

const getItemAvailableLotNos = require('./inventories/get-item-available-lotnos');

const getCompanies = require('./masters/get-companies');
const getItemCategories = require('./masters/get-item-categories');
const getItems = require('./masters/get-items');
const getStorageLocations = require('./masters/get-storage-locations');
const getProcesses = require('./masters/get-processes');

module.exports = {
    addProduction,
    getProductionList,
    getProductionLotList,
    getProductionLot,
    getReportsList,

    getItemAvailableLotNos,

    getCompanies,
    getItemCategories,
    getItems,
    getStorageLocations,
    getProcesses,
};
