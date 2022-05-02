const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getPlantLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy, sqlGroupBy;

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            // locationId: Joi.string().required(),
            // subLocationId: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT pl.id, pl."lotNo", pl."plantedOn", pl."plantsCount", pl."specieId", pl."locationId", pl."subLocationId"`;
        sqlFrom = ` FROM plant_lots pl`;
        sqlWhere = ` WHERE pl."orgId" = ${orgId}`;
        sqlWhere += ` AND pl."companyId" = ${payload.companyId} AND pl."isActive" AND NOT pl."isFinalHarvest"`;
        sqlOrderBy = ` ORDER BY pl."lotNo"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Plant lots!"
        });

    } catch (err) {
        console.log("[controllers][harvest][plants][getPlantLots] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLots;
