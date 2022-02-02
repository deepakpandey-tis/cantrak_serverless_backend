const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");
const redisHelper = require('../../helpers/redis');

const getPlantLot = async (req, res) => {
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

        sqlSelect = `SELECT pl.*, c."companyName", s.name "strainName", s2.name "specieName", lic.number "licenseNo", l.name "locationName", sl.name "subLocationName"`;
        sqlFrom = ` FROM plant_lots pl, companies c, strains s, species s2, locations l, sub_locations sl, licenses lic`;
        sqlWhere = ` WHERE pl.id = ${payload.id} AND pl."orgId" = ${orgId} `;
        sqlWhere += ` AND pl."locationId" = l.id AND pl."subLocationId" = sl.id AND pl."companyId" = c.id AND pl."strainId" = s.id and pl."specieId" = s2.id AND pl."licenseId" = lic.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

/*         //  Get plant lot attributes
        sqlSelect = `SELECT pa.*`;
        sqlFrom = ` FROM plant_attributes pa `;
        sqlWhere = ` WHERE pa."orgId" = ${orgId} and pa."plantLotId" = ${payload.id} `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var additionalAttributes = await knexReader.raw(sqlStr); */

        let plantsQrDocDownloadUrl = await redisHelper.getValue(`plant-${selectedRecs.rows[0].id}-lot-${selectedRecs.rows[0].lotNo}-qr-docs-link`);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
                plantsQrDocDownloadUrl: plantsQrDocDownloadUrl
                // additionalAttributes: additionalAttributes.rows
            },
            message: "Plant lot detail!"
        });

    } catch (err) {
        console.log("[controllers][plants][getPlantLot] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLot;
