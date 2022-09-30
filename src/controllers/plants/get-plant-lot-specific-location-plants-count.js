const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantLotSpecificLocationPlantsCount = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let { id, locationId, subLocationId} = req.body;

        let sqlStr, sqlSelectPlantCurrentLocations;

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            locationId: Joi.string().required(),
            subLocationId: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlStr = `WITH plant_lot_current_locations AS (
        SELECT pl.id, pl."lotNo", pl2."locationId", pl2."subLocationId"
        , coalesce(hpl."isFinalHarvest", false) "isFinalHarvest",  coalesce(hpl."isEntireLot" , false) "isEntireLot", coalesce(hpl."plantIds", null) "plantIds", coalesce(hpl."plantsCount", 0) "harvestedPlantsCount"
        , count(p."isActive") "plantsCount", sum(p."isWaste"::int) "wastePlants"
        FROM plant_lots pl, plants p, plant_locations pl2
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId" AND hpl."isFinalHarvest" AND hpl."isFinalHarvest"
        WHERE pl.id = ${id} AND pl."orgId" = ${orgId}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false)))
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        AND pl2."locationId" = ${locationId} AND pl2."subLocationId" = ${subLocationId}
        GROUP BY pl.id, pl."lotNo", pl2."locationId", pl2."subLocationId"
        , coalesce(hpl."isFinalHarvest", false),  coalesce(hpl."isEntireLot" , false), coalesce(hpl."plantIds", null), coalesce(hpl."plantsCount", 0)
        ) SELECT * FROM plant_lot_current_locations
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                list: selectedRecs.rows,
            },
            message: "Plant lot specific location plants count!"
        });

/* 
        sqlSelectPlantCurrentLocations = `WITH plant_current_locations AS
        (
        select pl.id "plantLotId", pl2."locationId", pl2."subLocationId", p.id "plantId"
        , case when p."isWaste" then 1 else 0 end "wastePlant"
        FROM plant_lots pl, plants p, plant_locations pl2
        WHERE pl.id = ${id} AND pl."orgId" = ${orgId}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId" 
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        AND pl2."locationId" = ${locationId} AND pl2."subLocationId" = ${subLocationId}
        )
        `;
        // AND pl2."locationId" IN (75,12,34,62,22,74,67,26)

        sqlStr = sqlSelectPlantCurrentLocations + ` SELECT pclc.*
        from (
            select pcl."locationId", pcl."subLocationId", pcl."plantLotId", count(pcl."plantId") "plantsCount", sum("wastePlant") "wastePlants"
            from plant_current_locations pcl
            group by pcl."locationId", pcl."subLocationId", pcl."plantLotId"
            ) pclc
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant lot specific location plants count!"
        });
 */
    } catch (err) {
        console.log("[controllers][plants][getPlantLotSpecificLocationPlantsCount] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLotSpecificLocationPlantsCount;
