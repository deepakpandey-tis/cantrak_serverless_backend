const getLotPlantList = require('./get-lot-plant-list');
const getPlantLot = require('./get-plant-lot');
const getPlantLots = require('./get-plant-lots');
const getPlants = require('./get-plants');
const getPlant = require('./get-plant');
const addPlant = require('./add-plant');
const deletePlantLot = require('./delete-plant-lot');
const deletePlant = require('./delete-plant');
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

const getRawMaterialForPlantList = require('./get-raw-material-for-plant-list');

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

const getObservationsList = require('./get-observations-list');
const getImages = require('./get-images');

module.exports = {
    getLotPlantList,
    getPlantLot,
    getPlantLots,
    getPlants,
    addPlant,
    getPlant,
    deletePlantLot,
    deletePlant,
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

    getRawMaterialForPlantList,

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

    getObservationsList,
    getImages,
};
