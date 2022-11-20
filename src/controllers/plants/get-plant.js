const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlant = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr;

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

        sqlStr = `SELECT p.*, pl."lotNo", pl.name "plantLotName", pl."plantedOn", pl."companyId", pl."specieId", pl."strainId", pl."supplierId"
        , case when pl2."plantLocationTxnId" is null then pl."plantsCount" else plt."totalPlants" end "plantsCount"
        , pl."licenseId", pl."locationId", pl."subLocationId", c."companyName", s.name "strainName", s2.name "specieName", lic.number "licenseNo"
        , pl2."locationId" , pl2."subLocationId", l.name "locationName" , sl."name" "subLocationName"
        , gs.id "growthStageId", gs."name"
        FROM plant_lots pl , plants p , plant_growth_stages pgs, growth_stages gs, locations l, sub_locations sl
        , companies c, strains s, species s2, licenses lic, plant_locations pl2
        LEFT JOIN plant_location_txns plt on plt.id = pl2."plantLocationTxnId"
        WHERE p.id = ${payload.id} AND p."orgId" = ${orgId} AND pl.id = p."plantLotId" and pgs."plantId" = p.id and pgs."growthStageId" = gs.id
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = p.id and pgs2."growthStageId" = pgs."growthStageId" order by id desc limit 1)
        and pl2."locationId" = l.id
        and pl2."subLocationId" = sl.id and pl2."locationId" = sl."locationId"
        AND pl."companyId" = c.id AND pl."strainId" = s.id and pl."specieId" = s2.id AND pl."licenseId" = lic.id
        ORDER BY pl."lotNo" , gs."listOrder"
        `;

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
