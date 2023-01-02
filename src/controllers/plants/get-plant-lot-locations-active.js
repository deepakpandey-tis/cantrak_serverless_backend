const knexReader = require('../../db/knex-reader');

const getPlantLotLocationsActive = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Plant lot active locations (irrespective of whether plants at location are harvested or not)
        sqlSelect = `SELECT DISTINCT pl.id, pl."lotNo", pl2."locationId", l."name" "locationName", pl2."subLocationId", sl."name" "subLocationName"
        `;

        sqlFrom = ` FROM plant_lots pl, plants p, locations l, sub_locations sl, plant_locations pl2
        `;

        sqlWhere = ` WHERE pl.id = ${payload.id} AND pl."orgId" = ${orgId}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND p."isActive" AND NOT p."isWaste" AND pl2."locationId" = l.id and pl2."subLocationId" = sl.id
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        `;

        sqlOrderBy = ` ORDER BY l.name asc, sl.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        //console.log('getPlantLotLocationsActive sql: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Plant Lot Active Locations list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLotLocationsActive] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantLotLocationsActive;

/**
 */
