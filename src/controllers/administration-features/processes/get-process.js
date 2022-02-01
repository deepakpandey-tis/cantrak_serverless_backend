const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getProcess = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        sqlSelect = `SELECT p.*`;
        sqlFrom = ` FROM processes p `;
        sqlWhere = ` WHERE p.id = ${req.query.id} AND p."orgId" = ${orgId}`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Process detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][processes]][getProcess] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getProcess;
