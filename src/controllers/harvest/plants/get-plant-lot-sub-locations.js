const knexReader = require('../../../db/knex-reader');

const getPlantLotSubLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        
        sqlSelect = `SELECT DISTINCT pl."lotNo", ploc."locationId" "locationId", l.name "locationName", ploc."subLocationId" "subLocationId", sl.name "subLocationName"
        `;

        sqlFrom = ` FROM plant_lots pl, plants p, plant_locations ploc, locations l, sub_locations sl
        `;

        sqlWhere = ` WHERE pl.id = ${payload.id} AND pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."locationId" = ${payload.locationId}`;
        sqlWhere += ` AND pl.id = p."plantLotId" AND p.id = ploc."plantId"`;
        sqlWhere += ` AND ploc.id = (SELECT id FROM plant_locations ploc2 WHERE ploc2."plantId" = p.id ORDER BY id DESC limit 1)`;
        sqlWhere += ` AND p."isActive" AND NOT p."isWaste" AND ploc."locationId" = l.id AND ploc."subLocationId" = sl.id`;

        sqlOrderBy = ` ORDER BY l.name asc`;
        //console.log('getPlantLotSubLocations sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Plant Lot Sub Locations list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][harvest][plants][getPlantLotSubLocations] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantLotSubLocations;

/**
 */