const getStorageLocationList = require('./get-storage-location-list');
const getStorageLocations = require('./get-storage-locations');
const getStorageLocation = require('./get-storage-location');
const addStorageLocation = require('./add-storage-location');
const updateStorageLocation = require('./update-storage-location');
const toggleStorageLocationStatus = require('./toggle-storage-location-status');
const deleteStorageLocation = require('./delete-storage-location');
const importStorageLocations = require('./import-storage-locations');

module.exports = {
    getStorageLocationList,
    getStorageLocations,
    addStorageLocation,
    getStorageLocation,
    updateStorageLocation,
    toggleStorageLocationStatus,
    deleteStorageLocation,
    importStorageLocations,
};
