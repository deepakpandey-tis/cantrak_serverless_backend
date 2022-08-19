const getUserActivities = require('./get-user-activities');
const getUserActivityList = require('./get-user-activity-list');

const getCompanies = require('./masters/get-companies');
const getUsers = require('./masters/get-users');

const getEntityTypes = require('./masters/get-entity-types');
const getEntityActions = require('./masters/get-entity-actions');

module.exports = {
    getUserActivities,
    getUserActivityList,

    getCompanies,
    getUsers,
    getEntityTypes,
    getEntityActions,
};
