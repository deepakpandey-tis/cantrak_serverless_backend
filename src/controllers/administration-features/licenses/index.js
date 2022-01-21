const getLicenseList = require('./get-license-list');
const getLicenses = require('./get-licenses');
const getLicense = require('./get-license');
const addLicense = require('./add-license');
const updateLicense = require('./update-license');
const deleteLicense = require('./delete-license');
const getLicenseTypes = require('./get-license-types');
const getLicenseCategories = require('./get-license-categories');

const getLicenseLocationList = require('./get-license-location-list');
const getLicenseLocations = require('./get-license-locations');
const getLicenseLocation = require('./get-license-location');
const addLicenseLocation = require('./add-license-location');
const updateLicenseLocation = require('./update-license-location');
const deleteLicenseLocation = require('./delete-license-location');

const getLicenseObjectiveList = require('./get-license-objective-list');
const getLicenseObjectives = require('./get-license-objectives');
const getLicenseObjective = require('./get-license-objective');
const addLicenseObjective = require('./add-license-objective');
const updateLicenseObjective = require('./update-license-objective');
const deleteLicenseObjective = require('./delete-license-objective');

const getLicenseNarList = require('./get-license-nar-list');
const getLicenseNars = require('./get-license-nars');
const getLicenseNar = require('./get-license-nar');
const addLicenseNar = require('./add-license-nar');
const updateLicenseNar = require('./update-license-nar');
const deleteLicenseNar = require('./delete-license-nar');

module.exports = {
    getLicenseList,
    getLicenses,
    addLicense,
    getLicense,
    updateLicense,
    deleteLicense,
    getLicenseTypes,
    getLicenseCategories,

    getLicenseLocationList,
    getLicenseLocations,
    getLicenseLocation,
    addLicenseLocation,
    updateLicenseLocation,
    deleteLicenseLocation,
    
    getLicenseObjectiveList,
    getLicenseObjectives,
    getLicenseObjective,
    addLicenseObjective,
    updateLicenseObjective,
    deleteLicenseObjective,

    getLicenseNarList,
    getLicenseNars,
    getLicenseNar,
    addLicenseNar,
    updateLicenseNar,
    deleteLicenseNar,
};
