const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const execDbProcedure = async (queryData, mode = 'read-write') => {  // Mode can be read/ read-write
    // console.log('[helpers][db][execDbProcedure]: Query Data:', queryData);

    let queryStr = `select exec_db_sql(?)`;
    let ret;
    if(mode == 'read') {
        ret = await knexReader.raw(queryStr, JSON.stringify(queryData));
    } else {
        ret = await knex.raw(queryStr, JSON.stringify(queryData));
    }

    if (!ret || !ret.rows || !ret.rowCount || !ret.rows[0].exec_db_sql) {
        console.error('[helpers][db][execDbProcedure]: Error:', 'Unkown DB Error, Output Syntax Unmatched');
        throw new Error(`Unkown DB Error, Output Syntax Unmatched:  Syntax: ${ret}`);
    }

    let data = ret.rows[0].exec_db_sql;

    if (data.return_status != 'success') {
        console.error('[helpers][db][execDbProcedure]: Error:', (ret.rows[0].exec_db_sql).return_message);
        throw new Error(`DB Error Message: ${(ret.rows[0].exec_db_sql).return_message}`);
    }

    // console.log('[helpers][db][execDbProcedure]: ', data);
    return data;
};


module.exports = execDbProcedure;