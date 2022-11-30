const getLotPlantList = require('./get-lot-plant-list');
const getPlantLot = require('./get-plant-lot');
const getPlantLots = require('./get-plant-lots');
const getPlantLotsOfLocationSubLocation = require('./get-plant-lots-of-location-sublocation');
const getPlants = require('./get-plants');
const getPlant = require('./get-plant');
const getPlantHistory = require('./get-plant-history');
const addPlant = require('./add-plant');
const deletePlantLot = require('./delete-plant-lot');
const deletePlant = require('./delete-plant');
const updatePlantedDate = require('./update-planted-date');
const getPlantLotList = require('./get-plant-lot-list');
const getPlantExistingGrowthStages = require('./get-plant-existing-growth-stages');
const changeGrowthStage = require('./change-growth-stage');
const checkLotNameExists = require('./check-lot-name-exists');
const getPlantLotLocations = require('./get-plant-lot-locations');
const getPlantLotSubLocations = require('./get-plant-lot-sub-locations');
const getGrowthStageTxnList = require('./get-growth-stage-txn-list');
const getGrowthStageTxn = require('./get-growth-stage-txn');
const changeLocation = require('./change-location');
const getLocationTxnList = require('./get-location-txn-list');
const getLocationTxn = require('./get-location-txn');
const wasteEntry = require('./waste-entry');
const getWasteTxnList = require('./get-waste-txn-list');
const getWasteTxn = require('./get-waste-txn');
const generatePdfOfPlants = require('./generate-pdf-of-plants');
const getWastePlantCount = require('./get-waste-plant-count');
const getTotalPlants = require('./get-total-plants');
const getPlantLotUnhealthyPlantsCount = require('./get-plant-lot-unhealthy-plants-count');
const getPlantLotsUnhealthyPlantsCount = require('./get-plant-lots-unhealthy-plants-count');
const getPlantLotCurrentGrowthStages = require('./get-plant-lot-current-growth-stages');
const getPlantLotSpecificLocationPlantsCount = require('./get-plant-lot-specific-location-plants-count');
const getPlantGrowthStageHistory = require('./get-plant-growth-stage-history');
const getPlantLocationHistory = require('./get-plant-location-history');
const getPlantLotUnhealthyPlants = require('./get-plant-lot-unhealthy-plants');
const getPlantLotsHavingUnhealthyPlants = require('./get-plant-lots-having-unhealthy-plants');

const getRawMaterialForPlantList = require('./get-raw-material-for-plant-list');
const getLocationSubLocationPlantLots = require('./get-location-sublocation-plant-lots');

const getCompanies = require('./masters/get-companies');
const getContainerTypes = require('./masters/get-container-types');
const getItems = require('./masters/get-items');
const getLicenses = require('./masters/get-licenses');
const getLocations = require('./masters/get-locations');
const getSpecies = require('./masters/get-species');
const getStrains = require('./masters/get-strains');
const getSubLocations = require('./masters/get-sub-locations');
const getGrowthStages = require('./masters/get-growth-stages');
const getStorageLocations = require('./masters/get-storage-locations');
const getLocationsOfActivePlantLots = require('./masters/get-locations-of-active-plant-lots');
const getSubLocationsOfActivePlantLots = require('./masters/get-sub-locations-of-active-plant-lots');

const getObservationList = require('./get-observation-list');
const getObservationsList = require('./get-observations-list');
const getImages = require('./get-images');

const getGrowingFacilityPlantsAge = require('./growing-facility/get-growing-facility-plants-age');

const getHarvestLot = require('./harvest/get-harvest-lot');

module.exports = {
    getLotPlantList,
    getPlantLot,
    getPlantLots,
    getPlantLotsOfLocationSubLocation,
    getPlants,
    addPlant,
    getPlant,
    getPlantHistory,
    deletePlantLot,
    deletePlant,
    updatePlantedDate,
    getPlantLotList,
    getPlantExistingGrowthStages,
    changeGrowthStage,
    checkLotNameExists,
    getPlantLotLocations,
    getPlantLotSubLocations,
    getGrowthStageTxnList,
    getGrowthStageTxn,
    changeLocation,
    getLocationTxnList,
    getLocationTxn,
    wasteEntry,
    getWasteTxnList,
    getWasteTxn,
    generatePdfOfPlants,
    getWastePlantCount,
    getTotalPlants,
    getPlantLotUnhealthyPlantsCount,
    getPlantLotsUnhealthyPlantsCount,
    getPlantLotCurrentGrowthStages,
    getPlantLotSpecificLocationPlantsCount,
    getPlantGrowthStageHistory,
    getPlantLocationHistory,
    getPlantLotUnhealthyPlants,
    getPlantLotsHavingUnhealthyPlants,

    getRawMaterialForPlantList,
    getLocationSubLocationPlantLots,

    getCompanies,
    getContainerTypes,
    getItems,
    getLicenses,
    getLocations,
    getSpecies,
    getStrains,
    getSubLocations,
    getGrowthStages,
    getStorageLocations,
    getLocationsOfActivePlantLots,
    getSubLocationsOfActivePlantLots,

    getObservationList,
    getObservationsList,
    getImages,

    getGrowingFacilityPlantsAge,

    getHarvestLot,
};
