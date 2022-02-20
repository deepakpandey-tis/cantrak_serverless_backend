const getLocationList = require('./get-location-list');
const getLocations = require('./get-locations');
const getLocation = require('./get-location');
const addLocation = require('./add-location');
const updateLocation = require('./update-location');
const toggleLocationStatus = require('./toggle-location-status');
const deleteLocation = require('./delete-location');

module.exports = {
    getLocationList,
    getLocations,
    addLocation,
    getLocation,
    updateLocation,
    toggleLocationStatus,
    deleteLocation,
};
