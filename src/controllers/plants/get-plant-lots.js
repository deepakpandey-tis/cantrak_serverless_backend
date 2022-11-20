const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr; //, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

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

/*         sqlSelect = `SELECT pl.*, c."companyName", s.name "strainName", s2.name "specieName", lic.number "licenseNo", l.name "locationName"`;

        sqlFrom = ` FROM plant_lots pl, companies c, strains s, species s2, locations l, licenses lic`;

        // Allowed more than one harvest of a plant lot pl."harvestPlantLotId" is therefore no longer needed and "isFinalHarvest" added and checked when final / last  harvest is done
        // sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."harvestPlantLotId" is null`;
        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND NOT pl."isFinalHarvest"`;
        sqlWhere += ` AND pl."locationId" = l.id AND pl."companyId" = c.id AND pl."strainId" = s.id and pl."specieId" = s2.id AND pl."licenseId" = lic.id`;

        sqlOrderBy  = ` ORDER BY pl."lotNo" desc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
 */
        //  first get current plants current location plant lot status (plantsCount, wastePlants and harvestedPlantsCount)
        //  then filtered out final harvested plantLots and select the distinct plantLots
        sqlStr = `WITH plant_current_locations AS
        (
            SELECT pl.id, pl."lotNo", pl.name, pl."specieId", pl."strainId"
            , coalesce(hpl."isFinalHarvest", false) "isFinalHarvest"
            FROM plant_lots pl, plants p, plant_locations pl2
            LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId" AND hpl."isFinalHarvest" AND hpl."isFinalHarvest"
            WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId}
            AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
            AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
            AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false) AND NOT coalesce(hpl."isEntireLot" , false)))
            AND pl2."locationId" IN (${req.GROWINGLOCATION})
        )
        SELECT distinct pcl.id, pcl."lotNo", pcl.name, pcl."specieId", pcl."strainId" FROM plant_current_locations pcl WHERE NOT "isFinalHarvest" ORDER BY pcl."lotNo" desc
        `;

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
