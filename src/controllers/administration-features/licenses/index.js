const getLicenseList = require('./get-license-list');
const getLicenses = require('./get-licenses');
const getLicense = require('./get-license');
const addLicense = require('./add-license');
const updateLicense = require('./update-license');
const deleteLicense = require('./delete-license');

module.exports = {
    getLicenseList,
    getLicenses,
    addLicense,
    getLicense,
    updateLicense,
    deleteLicense,
};
