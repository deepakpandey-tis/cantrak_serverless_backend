const getTaxList = require('./get-tax-list');
const getTaxes = require('./get-taxes');
const getTax = require('./get-tax');
const addTax = require('./add-tax');
const updateTax = require('./update-tax');
const toggleTax = require('./toggle-tax');
const deleteTax = require('./delete-tax');

module.exports = {
    getTaxList,
    getTaxes,
    addTax,
    getTax,
    updateTax,
    toggleTax,
    deleteTax,
};
