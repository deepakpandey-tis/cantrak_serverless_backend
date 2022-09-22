const knexReader = require('../../../db/knex-reader');

const getSubLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        //  get location's sub growing location having active plants (plantsCount - wastePlants > 0)
        sqlStr = `WITH plant_current_locations AS
        (
        SELECT pl2."locationId", pl2."subLocationId", pl.id, pl."lotNo"
        , CASE WHEN p."isActive" THEN 1 ELSE 0 END "activePlant", CASE WHEN p."isWaste" THEN 1 ELSE 0 END "wastePlant"
        FROM plant_lots pl, plants p, plant_locations pl2
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND NOT pl."isFinalHarvest"
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND pl2."locationId" = ${payload.locationId}
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        ),
        plant_location_sum AS (select pcl."locationId" , pcl."subLocationId", pcl.id, pcl."lotNo", sum(pcl."activePlant") "plantsCount", sum(pcl."wastePlant") "wastePlants"
        FROM plant_current_locations pcl
        GROUP BY pcl."locationId", pcl."subLocationId", pcl.id , pcl."lotNo")
        SELECT DISTINCT sl."locationId", sl.id, sl.name
        FROM plant_location_sum pls, sub_locations sl
        WHERE pls."plantsCount" - pls."wastePlants" > 0 AND pls."locationId" = sl."locationId" AND pls."subLocationId" = sl.id
        `;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Sub Locations!"
        });
    } catch (err) {
        console.log("[controllers][harvest][masters][getSubLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getSubLocations;

/**
 */
