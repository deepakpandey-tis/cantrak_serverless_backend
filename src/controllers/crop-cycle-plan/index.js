const getCropCyclePlanList = require('./get-crop-cycle-plan-list');
const getCropCyclePlans = require('./get-crop-cycle-plans');
const getCropCyclePlan = require('./get-crop-cycle-plan');
const addCropCyclePlan = require('./add-crop-cycle-plan');
const updateCropCyclePlan = require('./update-crop-cycle-plan');
const updateCropCyclePlanPlantDetail = require('./update-crop-cycle-plan-plant-detail');
const getCropCycleCalendarDetail = require('./get-crop-cycle-calendar-detail');

const getCompanies = require('./masters/get-companies');
const getLocations = require('./masters/get-locations');
const getSubLocations = require('./masters/get-sub-locations');
const getSpecies = require('./masters/get-species');
const getSpeciesHavingGrowthStages = require('./masters/get-species-having-growth-stages');
const getStrains = require('./masters/get-strains');
const getGrowthStages = require('./masters/get-growth-stages');

const getPlantLots = require('./plants/get-plant-lots');
const getPlantLotGrowthStages = require('./plants/get-plant-lot-growth-stages');

module.exports = {
    getCropCyclePlanList,
    getCropCyclePlans,
    getCropCyclePlan,
    addCropCyclePlan,
    updateCropCyclePlan,
    updateCropCyclePlanPlantDetail,
    getCropCycleCalendarDetail,

    getCompanies,
    getLocations,
    getSubLocations,
    getSpeciesHavingGrowthStages,
    getSpecies,
    getStrains,
    getGrowthStages,

    getPlantLots,
    getPlantLotGrowthStages,
};
