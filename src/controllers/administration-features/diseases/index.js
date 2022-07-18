const getDiseaseList = require('./get-disease-list');
const getDiseases = require('./get-diseases');
const getDisease = require('./get-disease');
const addDisease = require('./add-disease');
const updateDisease = require('./update-disease');
const toggleDisease = require('./toggle-disease');
const deleteDisease = require('./delete-disease');

module.exports = {
    getDiseaseList,
    getDiseases,
    addDisease,
    getDisease,
    updateDisease,
    toggleDisease,
    deleteDisease,
};
