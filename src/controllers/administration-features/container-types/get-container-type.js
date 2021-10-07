const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getContainerType = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        sqlSelect = `SELECT ct.*`;
        sqlFrom = ` FROM container_types ct `;
        sqlWhere = ` WHERE ct.id = ${req.query.id} AND ct."orgId" = ${orgId}`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Container Type detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][container-types][getContainerType] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getContainerType;
