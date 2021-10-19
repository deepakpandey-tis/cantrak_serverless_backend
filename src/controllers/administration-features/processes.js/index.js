const getProcessList = require('./get-process-list');
const getProcesses = require('./get-processes');
const getProcess = require('./get-process');
const addProcess = require('./add-process');
const updateProcess = require('./update-process');
const deleteProcess = require('./delete-process');

module.exports = {
    getProcessList,
    getProcesses,
    addProcess,
    getProcess,
    updateProcess,
    deleteProcess,
};
