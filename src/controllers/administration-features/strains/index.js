const getStrainList = require('./get-strain-list');
const getStrains = require('./get-strains');
const getStrain = require('./get-strain');
const addStrain = require('./add-strain');
const updateStrain = require('./update-strain');
const deleteStrain = require('./delete-strain');

module.exports = {
    getStrainList,
    getStrains,
    addStrain,
    getStrain,
    updateStrain,
    deleteStrain,
};
