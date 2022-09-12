const knexReader = require('../../db/knex-reader');

const getLocationSubLocationPlantLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let { companyId, locationId} = req.body;

        let sqlStr, sqlSelectPlantCurrentLocations;

        sqlSelectPlantCurrentLocations = `WITH plant_current_locations AS
        (
        SELECT pl2."locationId", pl2."subLocationId", pl.id, pl."lotNo", pl."plantedOn" 
        , CASE WHEN p."isActive" THEN 1 ELSE 0 END "activePlant"
        , CASE WHEN p."isWaste" THEN 1 ELSE 0 END "wastePlant"
        FROM plant_lots pl, plants p, plant_locations pl2
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId} AND NOT pl."isFinalHarvest"
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId" 
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        `;
        if(locationId){
            sqlSelectPlantCurrentLocations += ` AND pl2."locationId" = ${locationId}`;
        }
        sqlSelectPlantCurrentLocations += `)`;
        // AND pl2."locationId" IN (75,12,34,62,22,74,67,26)

        // sql to get location, sub locations[{sub-location, plantLots[{}]}]
        sqlStr = sqlSelectPlantCurrentLocations + ` SELECT l.*,
        (SELECT json_agg(row_to_json(sl1.*)) "subLocations"
        FROM (SELECT sl.*, (SELECT json_agg(row_to_json(pl1.*)) "plantLots" FROM (
            select pcl."locationId" , pcl."subLocationId", pcl.id, pcl."lotNo", pcl."plantedOn" ,sum(pcl."activePlant") "plantsCount", sum(pcl."wastePlant") "wastePlants"
            FROM plant_current_locations pcl WHERE pcl."locationId" = l.id AND pcl."locationId" = sl."locationId" AND pcl."subLocationId" = sl.id
            group by pcl."locationId" , sl."name", pcl."subLocationId", pcl.id , pcl."lotNo" , pcl."plantedOn"
            order by sl."name" , pcl."lotNo"
            ) pl1) 
            FROM sub_locations sl WHERE sl."locationId" = l.id order by sl.name) sl1
        )
        FROM locations l 
        WHERE l."orgId" = ${orgId} AND l."companyId" = ${companyId}
        AND l."id" IN (${req.GROWINGLOCATION})
        `;
        if(locationId){
            sqlStr += ` and l."id" = ${locationId}`;
        }

        sqlStr += `order by l."name"
        `;

/* below sql does not take care of location changes
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
 */

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
