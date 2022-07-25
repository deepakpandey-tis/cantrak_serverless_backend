const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getReportsList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT i.*`;
        sqlFrom = ` FROM images i`;
        sqlWhere = ` WHERE i."entityId" = ${payload.id} AND i."entityType" = 'production' AND i."orgId" = ${orgId} ORDER BY i.id desc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows,
            },
            message: "Reports List!"
        });

    } catch (err) {
        console.log("[controllers][production][getReportsList] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getReportsList;