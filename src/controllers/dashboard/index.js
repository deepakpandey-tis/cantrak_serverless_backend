const getImportLicenseStatistics = require('./get-import-license-statistics');
const getCultivationLicenseStatistics = require('./get-cultivation-license-statistics');
const getActiveResourceWithSubResource = require('./get-active-resource-with-sub-resource');

const getWastePlantCount = require('./plants/get-waste-plant-count');
const getTotalPlants = require('./plants/get-total-plants');


const getCompanies = require('./masters/get-companies');
const getLocations = require('./masters/get-locations');
const getSubLocations = require('./masters/get-sub-locations');

module.exports = {
    getImportLicenseStatistics,
    getCultivationLicenseStatistics,
    getActiveResourceWithSubResource,
    getWastePlantCount,
    getTotalPlants,

    getCompanies,
    getLocations,
    getSubLocations,
};
