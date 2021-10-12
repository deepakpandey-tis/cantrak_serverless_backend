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

        sqlSelect = `SELECT p.*, pl."companyId", pl."specieId", pl."strainId", pl."supplierId", pl."licenseId", pl."locationId"
        `;
        sqlFrom = ` FROM plants p, plant_lots pl `;
        sqlWhere = ` WHERE p.id = ${payload.id} AND p."orgId" = ${orgId} AND p."plantLotId" = pl.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant detail!"
        });

    } catch (err) {
        console.log("[controllers][plants][getPlant] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlant;
