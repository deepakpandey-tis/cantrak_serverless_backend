const knexReader = require('../../db/knex-reader');

const getLocationSubLocationPlantLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let { companyId, locationId} = req.body;

        let sqlStr, sqlSelectPlantCurrentLocations;

        //  not final harvest || (final harvest && not entire lot)
        sqlSelectPlantCurrentLocations = `WITH plant_current_locations AS
        (
        SELECT pl2."locationId", pl2."subLocationId", pl.id, pl."lotNo", pl.name "plantLotName", pl."plantedOn", pl."specieId", pl."strainId"  
        , coalesce(hpl."isFinalHarvest", false) "isFinalHarvest", coalesce(hpl."plantsCount", 0) "harvestedPlantsCount"
        , count(p."isActive") "plantsCount", sum(p."isWaste"::int) "wastePlants"
        FROM plant_lots pl, plants p, plant_locations pl2
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId" AND hpl."isFinalHarvest" AND hpl."isFinalHarvest"
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId" 
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false) AND NOT coalesce(hpl."isEntireLot" , false)))
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        group by pl2."locationId", pl2."subLocationId", pl.id, pl."lotNo", pl."plantedOn", pl."specieId", pl."strainId"
        , coalesce(hpl."isFinalHarvest", false), coalesce(hpl."plantsCount", 0)
        `;
        // WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId} AND NOT pl."isFinalHarvest"
        if(locationId){
            sqlSelectPlantCurrentLocations += ` AND pl2."locationId" = ${locationId}`;
        }
        sqlSelectPlantCurrentLocations += `)`;
        sqlSelectPlantCurrentLocations += `, plant_current_locations_sum AS
        (SELECT "locationId", "subLocationId", id, "lotNo", "plantLotName", "plantedOn", "specieId", "strainId"
        , "plantsCount", "wastePlants", "isFinalHarvest", sum("harvestedPlantsCount") "harvestedPlantsCount"
        FROM plant_current_locations pcl
        GROUP BY "locationId", "subLocationId", id, "lotNo", "plantLotName", "plantedOn", "specieId", "strainId", "plantsCount", "wastePlants", "isFinalHarvest"
        )
        `;
        // AND pl2."locationId" IN (75,12,34,62,22,74,67,26)

        // sql to get location, sub locations[{sub-location, plantLots[{}]}]
        sqlStr = sqlSelectPlantCurrentLocations + ` SELECT l.*,
        (SELECT json_agg(row_to_json(sl1.*)) "subLocations"
        FROM (SELECT sl.*, (SELECT json_agg(row_to_json(pl1.*)) "plantLots" FROM (
            select pcls.*
            , s2."name" "specieName", s."name" "strainName"
            FROM plant_current_locations_sum pcls, species s2 , strains s WHERE pcls."locationId" = l.id AND pcls."locationId" = sl."locationId" AND pcls."subLocationId" = sl.id AND pcls."specieId" = s2.id AND pcls."strainId" = s.id
            order by sl."name" , pcls."lotNo"
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

        // console.log('getLocationSubLocationPlantLots: ', sqlStr);
        
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
