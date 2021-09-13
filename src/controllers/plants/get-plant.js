const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlant = async (req, res) => {
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

        sqlSelect = `SELECT p2.*, pl.id "plantLocationId", pl."companyId", pl."plantationId", pl."plantationPhaseId", pl."plantationGroupId"`;
        sqlFrom = ` FROM plants p2, plant_locations pl `;
        sqlWhere = ` WHERE p2."orgId" = ${orgId} and p2.id = ${payload.id} `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  Get plant attributes
        sqlSelect = `SELECT pa.*`;
        sqlFrom = ` FROM plant_attributes pa `;
        sqlWhere = ` WHERE pa."orgId" = ${orgId} and pa."plantId" = ${payload.id} `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var additionalAttributes = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
                additionalAttributes: additionalAttributes.rows
            },
            message: "Plant detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][plants][getPlant] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlant;
