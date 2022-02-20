const getSubLocationList = require('./get-sub-location-list');
const getSubLocations = require('./get-sub-locations');
const getSubLocation = require('./get-sub-location');
const addSubLocation = require('./add-sub-location');
const updateSubLocation = require('./update-sub-location');
const toggleSubLocationStatus = require('./toggle-sub-location-status');
const deleteSubLocation = require('./delete-sub-location');

module.exports = {
    getSubLocationList,
    getSubLocations,
    addSubLocation,
    getSubLocation,
    updateSubLocation,
    toggleSubLocationStatus,
    deleteSubLocation,
};
