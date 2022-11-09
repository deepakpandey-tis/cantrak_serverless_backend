const addInvoice = require('./add-invoice');
const updateInvoice = require('./update-invoice');
const getInvoiceList = require('./get-invoice-list');
const getInvoice = require('./get-invoice');
const cancelInvoice = require('./cancel-invoice');
const getCancelInvoiceRemark = require('./get-cancel-invoice-remark');
const getInvoices = require('./get-invoices');
const getInvoicesDetail = require('./get-invoices-detail');
const getInvoicedItems = require('./get-invoiced-items');

const getCompanies = require('./masters/get-companies');
const getItemCategories = require('./masters/get-item-categories');
const getItems = require('./masters/get-items');
const getStorageLocations = require('./masters/get-storage-locations');
const getCharges = require('./masters/get-charges');
const getTaxes = require('./masters/get-taxes');
const getStrains = require('./masters/get-strains');

const getCustomers = require('./masters/get-customers');

const getItemAvailableLotNos = require('./inventories/get-item-available-lotnos.js');

const getLicenses = require('./licenses/get-licenses');

module.exports = {
    addInvoice,
    updateInvoice,
    getInvoiceList,
    getInvoice,
    cancelInvoice,
    getCancelInvoiceRemark,
    getInvoices,
    getInvoicesDetail,
    getInvoicedItems,

    getCompanies,
    getItemCategories,
    getItems,
    getStorageLocations,
    getCharges,
    getTaxes,
    getStrains,

    getCustomers,

    getItemAvailableLotNos,

    getLicenses,
};
