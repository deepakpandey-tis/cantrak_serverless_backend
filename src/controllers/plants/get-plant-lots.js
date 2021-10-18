const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        const schema = Joi.object().keys({
            companyId: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT pl.*, c."companyName", s.name "strainName", s2.name "specieName", lic.number "licenseNo", l.name "locationName"`;

        sqlFrom = ` FROM plant_lots pl, companies c, strains s, species s2, locations l, licenses lic`;

        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."harvestPlantLotId" is null`;
        sqlWhere += ` AND pl."locationId" = l.id AND pl."companyId" = c.id AND pl."strainId" = s.id and pl."specieId" = s2.id AND pl."licenseId" = lic.id`;

        sqlOrderBy  = ` ORDER BY pl."lotNo" desc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Plant lots!"
        });

    } catch (err) {
        console.log("[controllers][plants][getPlantLots] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLots;
