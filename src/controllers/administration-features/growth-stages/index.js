const getGrowthStageList = require('./get-growth-stage-list');
const getGrowthStages = require('./get-growth-stages');
const getGrowthStage = require('./get-growth-stage');
const addGrowthStage = require('./add-growth-stage');
const updateGrowthStage = require('./update-growth-stage');
const toggleGrowthStage = require('./toggle-growth-stage');
const deleteGrowthStage = require('./delete-growth-stage');

module.exports = {
    getGrowthStageList,
    getGrowthStages,
    addGrowthStage,
    getGrowthStage,
    updateGrowthStage,
    toggleGrowthStage,
    deleteGrowthStage,
};
