const getUserActivities = require('./get-user-activities');
const getUserActivityList = require('./get-user-activity-list');

const getCompanies = require('./masters/get-companies');
const getUsers = require('./masters/get-users');


module.exports = {
    getUserActivities,
    getUserActivityList,

    getCompanies,
    getUsers,
};
