const knexReader = require('../../db/knex-reader');

const getPlantLotLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        
        sqlSelect = `SELECT DISTINCT pl.id, pl."lotNo", pl2."locationId", l."name" "locationName"
        `;

        sqlFrom = ` FROM plant_lots pl, plants p, locations l, plant_locations pl2
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId" AND hpl."isFinalHarvest" AND hpl."isFinalHarvest"
        `;

        sqlWhere = ` WHERE pl.id = ${payload.id} AND pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false) AND NOT coalesce(hpl."isEntireLot" , false)))
        AND p."isActive" AND NOT p."isWaste" AND pl2."locationId" = l.id
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        `;

        sqlOrderBy = ` ORDER BY l.name asc`;
        //console.log('getPlantLotLocations sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Plant Lot Locations list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLotLocations] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantLotLocations;

/**
 */
