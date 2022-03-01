const addInvoice = require('./add-invoice');
const getInvoiceList = require('./get-invoice-list');
const getInvoice = require('./get-invoice');

const getCompanies = require('./masters/get-companies');
const getItemCategories = require('./masters/get-item-categories');
const getItems = require('./masters/get-items');
const getStorageLocations = require('./masters/get-storage-locations');

const getCustomers = require('./masters/get-customers');

const getItemAvailableLotNos = require('./inventories/get-item-available-lotnos.js');

const getLicenses = require('./licenses/get-licenses');

module.exports = {
    addInvoice,
    getInvoiceList,
    getInvoice,

    getCompanies,
    getItemCategories,
    getItems,
    getStorageLocations,

    getCustomers,

    getItemAvailableLotNos,

    getLicenses,
};
