const getSupplierList = require('./get-supplier-list');
const getSuppliers = require('./get-suppliers');
const getSupplier = require('./get-supplier');
const addSupplier = require('./add-supplier');
const updateSupplier = require('./update-supplier');
const deleteSupplier = require('./delete-supplier');

module.exports = {
    getSupplierList,
    getSuppliers,
    addSupplier,
    getSupplier,
    updateSupplier,
    deleteSupplier,
};
