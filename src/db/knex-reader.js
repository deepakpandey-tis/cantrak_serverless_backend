
// https://stackoverflow.com/questions/39168501/pg-promise-returns-integers-as-strings/57210469#57210469
// const pg = require('pg');

// pg.types.setTypeParser(pg.types.builtins.INT8, (value) => {
//     return parseInt(value);
// });

// pg.types.setTypeParser(pg.types.builtins.FLOAT8, (value) => {
//     return parseFloat(value);
// });

// pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => {
//     return parseFloat(value);
// });

function getReadOnlyDbHost() {
    let DB_HOST = process.env.DB_HOST_READ_ONLY;
    if (!DB_HOST || DB_HOST === '') {
        console.log("Read Replica Not Available, Going to use default host.")
        DB_HOST = process.env.DB_HOST;
    }

    return DB_HOST;
}


function getReadOnlyDbPort() {
    let DB_PORT = process.env.DB_PORT_READ_ONLY;
    if (!DB_PORT || DB_PORT === '') {
        console.log("Read Replica Not Available, Going to use default port.")
        DB_PORT = process.env.DB_PORT;
    }

    return DB_PORT;
}


module.exports = require('knex')({
    client: 'pg',
    connection: {
        host: getReadOnlyDbHost(),
        port: getReadOnlyDbPort(),
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    },
    debug: process.env.NODE_ENV === 'local' ? true : false,
    pool: {
        min: 1,
        max: 20,
        
        // create operations are cancelled after this many milliseconds
        // if a resource cannot be acquired
        createTimeoutMillis: 5000,
        
        // acquire promises are rejected after this many milliseconds
        // if a resource cannot be acquired
        acquireTimeoutMillis: 25000,

        // free resouces are destroyed after this many milliseconds
        idleTimeoutMillis: 30000,

        // how often to check for idle resources to destroy
        reapIntervalMillis: 1000,

        // how long to idle after failed create before trying again
        createRetryIntervalMillis: 300,

        // If true, when a create fails, the first pending acquire is
        // rejected with the error. If this is false (the default) then
        // create is retried until acquireTimeoutMillis milliseconds has
        // passed.
        propagateCreateError: false, // <- default is true, set to false
        
        afterCreate: async (conn, done) => {

            await conn.query(`select 1 as "one";`);
            await conn.query(`select 2 as "two";`);

            await conn.query('SET timezone="Asia/Bangkok";');

            if (process.env.NODE_ENV === 'local') {
                const oldConnections = await conn.query(`WITH inactive_connections AS (
                        SELECT
                            pid,
                            rank() over (partition by client_addr order by backend_start ASC) as rank
                        FROM 
                            pg_stat_activity
                        WHERE
                            pid <> pg_backend_pid( )
                        AND
                            application_name !~ '()(?:psql)|(?:pgAdmin.+)|(?:DBeaver.+)'
                        AND
                            datname = current_database() 
                        AND
                            state in ('idle', 'idle in transaction', 'idle in transaction (aborted)', 'disabled') 
                        AND
                            current_timestamp - state_change > interval '2 seconds' 
                    )
                    select pg_terminate_backend(pid) from inactive_connections where rank > 1;`);
                console.log('[Knex][Init][Pool] After Create, Closed Old Connections', oldConnections.rows);
            }
            done(null, conn);
        }
    }
});

