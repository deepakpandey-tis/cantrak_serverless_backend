const getPlantList = require('./get-plant-list');
const getPlants = require('./get-plants');
const getPlant = require('./get-plant');
const addPlant = require('./add-plant');
const updatePlant = require('./update-plant');
const deletePlant = require('./delete-plant');
//const exportPlants = require('./export-plants');
//const importPlants = require('./import-plants');

module.exports = {
    getPlantList,
    getPlants,
    addPlant,
    getPlant,
    updatePlant,
    deletePlant,
//    exportPlants,
//    importPlants,
};
