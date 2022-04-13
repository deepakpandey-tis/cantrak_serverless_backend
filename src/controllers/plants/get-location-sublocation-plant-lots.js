const knexReader = require('../../db/knex-reader');

const getLocationSubLocationPlantLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let { companyId, locationId} = req.body;

        let sqlStr;

        sqlStr = `select l.*`;
        sqlStr += `, (select json_agg(row_to_json(sl1.*)) "subLocations"`;
        sqlStr += ` from (`;
        sqlStr += ` select sl.*`;
        sqlStr += `, (select json_agg(row_to_json(pl1.*)) "plantLots" from (select pl.*, (select count(p.id)::int from plants p where p."plantLotId" = pl.id and p."isWaste") "wastePlants", s2."name" "specieName", s."name" "strainName" from plant_lots pl, species s2 , strains s where pl."orgId" = sl."orgId"and pl."companyId" = sl."companyId" and pl."locationId" = sl."locationId" and pl."subLocationId" = sl.id and pl."isActive" and not pl."isFinalHarvest" and pl."specieId" = s2.id and pl."strainId" = s.id) "pl1")`;
        sqlStr += ` from sub_locations sl where sl."locationId" = l.id`;
        sqlStr += `) sl1)`;
        sqlStr += ` from locations l`;
        sqlStr += ` where l."orgId" = ${orgId} and l."companyId" = ${companyId}`;
        if(locationId){
            sqlStr += ` and l."id" = ${locationId}`;
        }

        console.log('getLocationSubLocationPlantLots: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Location - Sub Locations Plant Lots list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getLocationSubLocationPlantLots] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLocationSubLocationPlantLots;

/**
 */
