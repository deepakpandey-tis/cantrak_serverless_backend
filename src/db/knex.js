
module.exports = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    },
    debug: process.env.NODE_ENV === 'local' ? true : false,
    pool: {
        min: 1,
        max: 5,
        afterCreate: async (conn, done) => {
            // await conn.query('SET timezone="UTC";');
            const oldConnections = await conn.query(`WITH inactive_connections AS (
                SELECT
                    pid, usename, client_addr, client_hostname, application_name, usename,
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
                    current_timestamp - state_change > interval '20 seconds' 
            )
            select pg_terminate_backend(pid) from inactive_connections where rank > 1;`);
            done(null, conn);
            console.log('[Knex][Init][Pool] After Create, Closed Old Connections', oldConnections);
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

