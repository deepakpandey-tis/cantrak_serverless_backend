const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const runLatestMigration = async () => {  // Mode can be read/ read-write
    try {
        console.log('[helpers][db][runLatestMigration]: Migration (Forward) Starting...');

        migrationStatus = await knex.migrate.latest();

        console.log('[helpers][db][runLatestMigration]: migrationStatus:', migrationStatus);
        return migrationStatus;
    } catch (err) {
        console.error('[helpers][db][runLatestMigration]: Some error during migration:', err);
        throw err;
    }

};


module.exports = runLatestMigration;