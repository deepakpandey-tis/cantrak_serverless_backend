const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');
const path = require('path');
const fs = require('fs-extra');
const Parallel = require('async-parallel');

const updateDBFunctions = async () => {  // Mode can be read/ read-write
    try {
        console.log('[helpers][db][updateFunctions]: Function Migration Starting...');

        // Write Logic to get all the functions from functions directory...

        const rootSrcPath = global.appRoot;
        const functionsDirPath = path.join(rootSrcPath, 'db', 'functions');
        console.log('[helpers][db][updateFunctions]: Functions Dir Path:', functionsDirPath);

        let allFunctionsFiles = await fs.readdir(functionsDirPath);

        Parallel.each(allFunctionsFiles, async (functionFile) => {
            let fullFilePath = path.join(functionsDirPath, functionFile);
            let sqlData = await fs.readFile(fullFilePath, 'utf8');
            console.log(`File: ${fullFilePath}: sqlData:`, sqlData);

            // Now Calculate hash of file....
            


        });

        console.log('[helpers][db][updateFunctions]: migrationStatus:', migrationStatus);
        return migrationStatus;
    } catch (err) {
        console.error('[helpers][db][updateFunctions]: Some error during migration:', err);
        throw err;
    }

};


module.exports = updateDBFunctions;