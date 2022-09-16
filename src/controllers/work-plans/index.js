const getWorkPlanList = require('./get-work-plan-list');
//const getWorkPlans = require('./get-work-plans');
const getWorkPlan = require('./get-work-plan');
const addWorkPlan = require('./add-work-plan');
const updateWorkPlan = require('./update-work-plan');
const deleteWorkPlan = require('./delete-work-plan');
const addWorkPlanSchedule = require('./add-work-plan-schedule');
const getWorkOrder = require('./get-work-order');
const getWorkPlanWorkOrderList = require('./get-work-plan-work-order-list');
const updateWorkOrderDate = require('./update-work-order-date');
const cancelWorkOrder = require('./cancel-work-order');
const updateWorkOrderTasksStatus = require('./update-work-order-tasks-status');
const addWorkOrderTaskRemark = require('./add-work-order-task-remark');
const updateWorkOrderTaskRemark = require('./update-work-order-task-remark');
const getUserTeamWorkOrderList = require('./get-user-team-work-order-list');
const uncancelWorkOrder = require('./uncancel-work-order');

const getCompanies = require('./masters/get-companies');
const getLocations = require('./masters/get-locations');
const getLocationList = require('./masters/get-location-list');
const getSubLocations = require('./masters/get-sub-locations');
const getLocationsSubLocations = require('./masters/get-locations-sub-locations');
const getTeams = require('./masters/get-teams');
const getLocationsSubLocationsPlantLots = require('./masters/get-locations-sub-locations-plant-lots');

const getLotPlantList = require('./plants/get-lot-plant-list');
const getPlant = require('./plants/get-plant');
const getObservationsList = require('./plants/get-observations-list');

module.exports = {
    getWorkPlanList,
//    getWorkPlans,
    addWorkPlan,
    getWorkPlan,
    updateWorkPlan,
    deleteWorkPlan,
    addWorkPlanSchedule,
    getWorkOrder,
    getWorkPlanWorkOrderList,
    updateWorkOrderDate,
    cancelWorkOrder,
    updateWorkOrderTasksStatus,
    addWorkOrderTaskRemark,
    updateWorkOrderTaskRemark,
    getUserTeamWorkOrderList,
    uncancelWorkOrder,

    getCompanies,
    getLocations,
    getLocationList,
    getSubLocations,
    getLocationsSubLocations,
    getTeams,
    getLocationsSubLocationsPlantLots,

    getLotPlantList,
    getPlant,
    getObservationsList,
};
