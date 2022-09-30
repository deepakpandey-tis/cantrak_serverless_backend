const knexReader = require('../../../db/knex-reader');

const getSubLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        //  get location's sub growing location having active plants (plantsCount - wastePlants > 0)
        sqlStr = `WITH plant_lot_current_locations AS
        (
        SELECT pl2."locationId", pl2."subLocationId", pl.id, pl."lotNo"
        , count(p."isActive") "plantsCount", sum(p."isWaste"::int) "wastePlants"
        FROM plant_lots pl, plants p, plant_locations pl2
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId" AND hpl."isFinalHarvest"
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false) AND NOT coalesce(hpl."isEntireLot" , false)))
        AND pl2."locationId" = ${payload.locationId}
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        GROUP BY pl2."locationId", pl2."subLocationId", pl.id, pl."lotNo"
        )
        SELECT DISTINCT sl."locationId", sl.id, sl.name
        FROM plant_lot_current_locations plcl, sub_locations sl
        WHERE plcl."plantsCount" - plcl."wastePlants" > 0 AND plcl."locationId" = sl."locationId" AND plcl."subLocationId" = sl.id
        `;
        // WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND NOT pl."isFinalHarvest"
        
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
