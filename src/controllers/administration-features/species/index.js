const getSpecieList = require('./get-specie-list');
const getSpecies = require('./get-species');
const getSpecie = require('./get-specie');
const addSpecie = require('./add-specie');
const updateSpecie = require('./update-specie');
const deleteSpecie = require('./delete-specie');
const exportSpecies = require('./export-species');
const importSpecies = require('./import-species');

module.exports = {
    getSpecieList,
    getSpecies,
    addSpecie,
    getSpecie,
    updateSpecie,
    deleteSpecie,
    exportSpecies,
    importSpecies,
};
