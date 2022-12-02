const getCustomerList = require('./get-customer-list');
const getCustomers = require('./get-customers');
const getCustomer = require('./get-customer');
const addCustomer = require('./add-customer');
const updateCustomer = require('./update-customer');
const toggleCustomer = require('./toggle-customer');
const deleteCustomer = require('./delete-customer');
const getCustomerTypes = require('./get-customer-types');
const getCountries = require('./get-countries');

module.exports = {
    getCustomerList,
    getCustomers,
    addCustomer,
    getCustomer,
    updateCustomer,
    toggleCustomer,
    deleteCustomer,
    getCustomerTypes,
    getCountries,
};
