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
};
