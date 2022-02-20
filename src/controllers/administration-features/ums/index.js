const getUMList = require('./get-um-list');
const getUMs = require('./get-ums');
const getUM = require('./get-um');
const addUM = require('./add-um');
const updateUM = require('./update-um');
const toggleUM = require('./toggle-um');
const deleteUM = require('./delete-um');

module.exports = {
    getUMList,
    getUMs,
    addUM,
    getUM,
    updateUM,
    toggleUM,
    deleteUM,
};
