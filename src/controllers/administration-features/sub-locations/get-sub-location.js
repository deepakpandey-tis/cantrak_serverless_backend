const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getSubLocation = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            id: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT sl.*, l."name" "locationName"`;
        sqlFrom = ` FROM sub_locations sl, locations l `;
        sqlWhere = ` WHERE sl."orgId" = ${orgId} AND sl.id = ${payload.id} AND sl."locationId" = l.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Sub Location detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][sub-locations][getSubLocation] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getSubLocation;
