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
            locationId: Joi.string().required(),
            subLocationId: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

/* Growing Location and Sub Growing Location are now shown alown with the Plant Lot Number.
    Therefore plantsCount is shown for PlantLotNo-GrowingLoation-SubGrowingLocation

        sqlSelect = `SELECT pl.*, c."companyName", s.name "strainName", s2.name "specieName", lic.number "licenseNo", l.name "locationName"`;

        sqlFrom = ` FROM plant_lots pl, companies c, strains s, species s2, locations l, licenses lic`;

        // Allowed more than one harvest of a plant lot pl."harvestPlantLotId" is therefore no longer needed and "isFinalHarvest" added and checked when final / last  harvest is done
        // sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."harvestPlantLotId" is null`;
        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND NOT pl."isFinalHarvest"`;
        sqlWhere += ` AND pl."locationId" = l.id AND pl."companyId" = c.id AND pl."strainId" = s.id and pl."specieId" = s2.id AND pl."licenseId" = lic.id`;

        sqlOrderBy  = ` ORDER BY pl."lotNo" desc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
 */

/* Now, Growing Location and Growing Sub Location selected before selecting the Plant Lot Number
        Therefore plantsCount is shown for GrowingLocation-GrowingSubLocation-PlantLotNo

        sqlSelect = `SELECT pl.id, pl."lotNo", pl2."locationId", l."name" "locationName", sl."name" "subLocationName", pl2."subLocationId", count(pl2."subLocationId") "plantsCount"`;
        sqlFrom = ` FROM plant_lots pl, plants p, plant_locations pl2, locations l, sub_locations sl`;
        sqlWhere = ` WHERE pl2."plantId" = p.id AND pl2."orgId" = ${orgId} AND p."plantLotId" = pl.id AND p."isActive" AND pl."companyId" = ${payload.companyId} AND NOT pl."isFinalHarvest"`;
        sqlWhere += ` AND pl2.id = (SELECT id FROM plant_locations ploc WHERE ploc."plantId" = p.id ORDER BY id DESC LIMIT 1)`;  // to get current plant location
        sqlWhere += ` AND pl2."locationId" = l.id AND pl2."subLocationId" = sl.id`;
        sqlGroupBy = ` GROUP BY pl.id, pl."lotNo", pl2."locationId", l."name", pl2."subLocationId", sl."name"`;

        sqlStr = `SELECT pl3."licenseId" , pl3."specieId" , pl3."strainId", plantLotPlants.* FROM plant_lots pl3 , (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + sqlGroupBy;
        sqlStr += `) plantLotPlants WHERE pl3.id = plantLotPlants.id`;
 */

        sqlSelect = `SELECT ploc."locationId", ploc."subLocationId", pl.id, pl."lotNo", count(pl."lotNo") "plantsCount"`;
        sqlFrom = ` FROM plant_lots pl, plants p, plant_locations ploc`;
        sqlWhere = ` WHERE ploc."orgId" = ${orgId} and ploc."locationId" = ${payload.locationId} and ploc."subLocationId" = ${payload.subLocationId} and ploc."plantId" = p.id`;
        sqlWhere += ` and p."isActive" and not p."isWaste" and p."plantLotId" = pl.id and pl."companyId" = ${payload.companyId}`;
        sqlWhere += ` and ploc.id = (select id from plant_locations ploc2 where ploc2."plantId" = ploc."plantId" ORDER BY id DESC LIMIT 1)`;
        sqlGroupBy = ` GROUP BY ploc."locationId", ploc."subLocationId", pl.id, pl."lotNo"`;

        sqlStr = `SELECT pl2."orgId", pl2."companyId", pl2."specieId", s."name" "specieName", pl2."strainId", s2."name" "strainName", pl2."licenseId", locationPlants.*`;
        sqlStr += ` FROM plant_lots pl2, species s, strains s2, (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + sqlGroupBy;
        sqlStr += `) locationPlants WHERE pl2.id = locationPlants.id and pl2."specieId" = s.id and pl2."strainId" = s2.id`;

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
