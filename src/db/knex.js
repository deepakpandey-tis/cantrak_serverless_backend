// var pg = require('pg');
// var user = "alcanzar";
// var password = "alcanzar123";
// var database = "tisdatabse";
// // var host = "tisdbinstance.cqqiam9knhtw.us-east-2.rds.amazonaws.com";
// var host = '192.168.1.44';
// var port = "5432";



const knex = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    },
    debug: process.env.NODE_ENV === 'local' ? true : false,
    pool: {
        min: 2,
        max: 100,
        afterCreate: function (conn, done) {
            // in this example we use pg driver's connection API
            conn.query('SET timezone="UTC";', function (err) {
                if (err) {
                    // first query failed, return error and don't try to make next query
                    console.error('DB Connection Failed');
                    done(err, conn);
                } else {
                    console.log('DB Connection Successfull');
                    // conn.query('SELECT set_limit(0.01);', function (err) {
                    //     // if err is not falsy, connection is discarded from pool
                    //     // if connection aquire was triggered by a query the error is passed to query promise
                    //     done(err, conn);
                    // });
                    done(err, conn);
                }
            });
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

//const { attachPaginate } = require('knex-paginate');
//attachPaginate();

//const setupPaginator = require('knex-paginator');
//setupPaginator(knex);
module.exports = knex

