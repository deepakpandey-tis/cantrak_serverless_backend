const knexReader = require('../../../db/knex-reader');

const getTxnSubTypes = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT tt.*`;
        sqlFrom = ` FROM txn_types tt`;
        sqlWhere = ` WHERE tt."id" = ${payload.id} AND tt."subId" > 0 AND tt."isActive"`;
        sqlOrderBy = ` ORDER BY tt.id asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Txn Sub Types!"
        });

    } catch (err) {
        console.log("[controllers][inventories][masters][getTxnSubTypes] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getTxnSubTypes;

/**
 */
