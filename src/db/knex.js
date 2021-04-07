
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


module.exports = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    },
    debug: process.env.NODE_ENV === 'local' ? true : false,
    pool: {
        min: 0,
        max: 7,
        createTimeoutMillis: 3000,
        acquireTimeoutMillis: 26000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        propagateCreateError: false, // <- default is true, set to false
        afterCreate: async (conn, done) => {
            // await conn.query('SET timezone="UTC";');
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
    },
    migrations: {
        tableName: 'knex_migrations',
        directory: __dirname + '/src/db/migrations',
    },
    seeds: {
        directory: __dirname + '/src/db/seeds'
    }
});

