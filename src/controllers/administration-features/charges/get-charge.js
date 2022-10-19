const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getCharge = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        sqlSelect = `SELECT c.*, t.code "taxCode", t.percentage "taxPercentage"
        , CASE WHEN c."calculationUnit" = 1 THEN 'By Rate' ELSE 'By Hour' END "calculationUnitName"
        `;
        sqlFrom = ` FROM charges c, taxes t `;
        sqlWhere = ` WHERE c."orgId" = ${orgId} AND c.id = ${req.query.id} AND c."orgId" = t."orgId" AND c."taxId" = t.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Charge detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][charges]][getCharge] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getCharge;
