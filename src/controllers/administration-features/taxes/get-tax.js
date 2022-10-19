const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getTax = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        sqlSelect = `SELECT t.*`;
        sqlFrom = ` FROM taxes t `;
        sqlWhere = ` WHERE t.id = ${req.query.id} AND t."orgId" = ${orgId}`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Tax detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][taxes]][getTax] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getTax;
