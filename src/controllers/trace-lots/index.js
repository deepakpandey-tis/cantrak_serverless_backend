const addTraceLot = require('./add-trace-lot');
const updateTraceLot = require('./update-trace-lot');
const deleteTraceLot = require('./delete-trace-lot');
const gettraceLotList = require('./get-trace-lot-list');
const getTraceQrDetail = require('./get-trace-qr-detail');
const getPublicTraceQrDetail = require('./get-public-trace-qr-detail');
const getProductionLots = require('./get-production-lots');
const getLotOutputItems = require('./get-lot-output-items');

const getCompanies = require('./masters/get-companies');
const getSpecies = require('./masters/get-species');
const getStrains = require('./masters/get-strains');
const getUMs = require('./masters/get-ums');

module.exports = {
    addTraceLot,
    updateTraceLot,
    deleteTraceLot,
    gettraceLotList,
    getTraceQrDetail,
    getPublicTraceQrDetail,
    getProductionLots,
    getLotOutputItems,

    getCompanies,
    getSpecies,
    getStrains,
    getUMs,
};
