const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

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

        sqlSelect = `SELECT p.*, pl."lotNo", pl."plantedOn", pl."plantsCount", pl."companyId", pl."specieId", pl."strainId", pl."supplierId"
        , pl."licenseId", pl."locationId", pl."subLocationId", c."companyName", s.name "strainName", s2.name "specieName", lic.number "licenseNo"
        , l.name "locationName", sl.name "subLocationName"
        `;
        sqlFrom = ` FROM plants p, plant_lots pl, companies c, strains s, species s2, licenses lic, locations l, sub_locations sl `;
        sqlWhere = ` WHERE p.id = ${payload.id} AND p."orgId" = ${orgId} AND p."plantLotId" = pl.id AND pl."companyId" = c.id
        AND pl."strainId" = s.id and pl."specieId" = s2.id AND pl."licenseId" = lic.id AND pl."locationId" = l.id AND pl."subLocationId" = sl.id
        `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant detail!"
        });

    } catch (err) {
        console.log("[controllers][work-plans][plants][getPlant] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlant;
