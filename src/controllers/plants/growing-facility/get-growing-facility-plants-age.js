const knexReader = require('../../../db/knex-reader');

const getGrowingFacilityPlantsAge = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let { companyId, userChartPrefrence, growingLocationIds, strainIds } = req.body;

        let sqlStr, sqlPlantsAge, sqlLocationSubLocationPlantLotCount, sqlPlantLots, sqlSubLocationsPlantLots, sqlLocationSubLocationsPlantLots;
        let sqlTotalPlantsLocations, sqlRowToJson;

        let data = [];
        let ndx;

        ndx = 0;
        for(pref of userChartPrefrence){

        sqlPlantsAge = `SELECT pl.id "plantLotId", pl."lotNo" "plantLotNo", p.id "plantId", to_timestamp(p."plantedOn"/1000)::date "startDate"
        , current_date - to_timestamp(p."plantedOn"/1000)::date "ageInDays"
        , ploc."locationId" , ploc."subLocationId"
        FROM plant_lots pl ,plants p, plant_locations ploc 
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = ploc."orgId" AND hpl."companyId" = ploc."companyId" AND hpl."plantLotId" = ploc."plantLotId" AND hpl."locationId" = ploc."locationId" AND hpl."subLocationId" = ploc."subLocationId"
        WHERE pl.id = p."plantLotId" AND pl."isActive" AND not p."isWaste"
        AND pl."companyId" = ${companyId}
        AND current_date - to_timestamp(p."plantedOn"/1000)::date >= ${pref.from} 
        AND current_date - to_timestamp(p."plantedOn"/1000)::date <= ${pref.to}
        AND ploc.id = (SELECT id FROM plant_locations pl2 WHERE pl2."orgId" = p."orgId" AND pl2."plantId" = p.id ORDER BY id desc limit 1)  -- current plant location
        AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false) AND NOT coalesce(hpl."isEntireLot" , false)))
        AND ploc."locationId" IN (${req.GROWINGLOCATION})
        `;
        // WHERE pl.id = p."plantLotId" AND pl."isActive" AND not pl."isFinalHarvest" AND not p."isWaste"
        if(strainIds[0] != 0){
            sqlPlantsAge += ` AND pl."strainId" IN (${strainIds})`
        }
        if(growingLocationIds[0] != 0){
            sqlPlantsAge += ` AND ploc."locationId" IN (${growingLocationIds})`
        }

        sqlLocationSubLocationPlantLotCount = `SELECT pa."locationId", pa."subLocationId", pa."plantLotId", count(pa."plantLotNo") "plantsCount"
        FROM plants_age  pa
        GROUP BY pa."locationId", pa."subLocationId", pa."plantLotId"
        ORDER BY pa."locationId", pa."subLocationId", pa."plantLotId"
        `;

        sqlPlantLots = `SELECT pl4.*, lsp."plantsCount", (SELECT count(p.id)::int FROM plants p WHERE p."plantLotId" = pl4.id AND p."isWaste") "wastePlants", sp."name" "specieName", st."name" "strainName" 
        FROM plant_lots pl4, species sp, strains st 
        WHERE pl4.id = lsp."plantLotId" AND pl4."locationId" = l1.id AND pl4."subLocationId" = sl1.id AND pl4."specieId" = sp.id AND pl4."strainId" = st.id
        `;

        sqlSubLocationsPlantLots = `SELECT sl1.*
        , (SELECT json_agg(row_to_json(pld.*)) "plantLots" FROM (${sqlPlantLots}) pld)
        FROM sub_locations sl1
        WHERE sl1."locationId" = lsp."locationId" AND sl1.id = lsp."subLocationId" AND sl1."locationId"= l1.id ORDER BY sl1.name
        `;

        sqlLocationSubLocationsPlantLots = `SELECT l1.*
        , (SELECT json_agg(row_to_json(sl.*)) "subLocations" FROM (${sqlSubLocationsPlantLots}) sl)
        FROM locationSubLocationPlantLotCount lsp, locations l1 
        WHERE lsp."locationId" = l1.id ORDER BY l1.name
        `;

        sqlTotalPlantsLocations = `SELECT count(*) "totalPlants", '${pref.from}-${pref.to}' "days"
        , (SELECT json_agg(row_to_json(l.*)) "data" FROM (${sqlLocationSubLocationsPlantLots}) l)
        FROM plants_age pa
        `;

        sqlRowToJson = `SELECT json_agg(row_to_json(fnl.*)) "data"
        FROM (${sqlTotalPlantsLocations}) fnl
        `;

        sqlStr = `WITH plants_age AS (${sqlPlantsAge})
        , locationSubLocationPlantLotCount AS (${sqlLocationSubLocationPlantLotCount})
        ${sqlRowToJson}
        `;



/* 
        let sqlStr, sqlGrowthStages, sqlPlantLots, sqlSubLocationsPlantLots, sqlLocationSubLocationsPlantLots, sqlTotalPlantsLocations, sqlRowToJson;
        
        sqlGrowthStages = `SELECT pl.id, pl."lotNo", gs.id "growthStageId", gs."name" "growthStageName", to_timestamp(pgs."startDate"/1000)::date "startDate"
        , current_date - to_timestamp(pgs."startDate"/1000)::date "ageInDays"
        , pl2."locationId", pl2."subLocationId"
        FROM plant_lots pl, plants p, plant_growth_stages pgs, growth_stages gs, plant_locations pl2
        WHERE pl.id = p."plantLotId" AND p.id = pgs."plantId" AND pgs."growthStageId" = gs.id AND pl."isActive" AND not pl."isFinalHarvest"
        AND pl."companyId" = ${companyId} AND not p."isWaste"
        AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId"= p.id ORDER BY id desc limit 1) -- current growth stage
        AND pl2.id = (SELECT id FROM plant_locations pl3 WHERE pl3."plantId" = p.id ORDER BY id desc limit 1) -- current location
        AND current_date - to_timestamp(pgs."startDate"/1000)::date >= ${userChartPrefrence[0].from}
        AND current_date - to_timestamp(pgs."startDate"/1000)::date <= ${userChartPrefrence[0].to}
        `;

        sqlPlantLots = `SELECT DISTINCT pl4.*, (select count(p.id)::int from plants p where p."plantLotId" = pl4.id and p."isWaste") "wastePlants", sp."name" "specieName", st."name" "strainName" 
        FROM plant_lots pl4, species sp, strains st 
        WHERE  pl4.id = pgsd.id AND pl4."locationId" = l1.id AND pl4."subLocationId" = sl1.id AND pl4."specieId" = sp.id AND pl4."strainId" = st.id
        `;

        sqlSubLocationsPlantLots = `SELECT sl1.*
        , (SELECT json_agg(row_to_json(pld.*)) "plantLots" FROM (${sqlPlantLots}) pld)
        FROM sub_locations sl1
        WHERE sl1."locationId" = pgsd."locationId" AND sl1.id = pgsd."subLocationId" AND sl1."locationId"= l1.id ORDER BY sl1.name
        `;

        sqlLocationSubLocationsPlantLots = `
        SELECT l1.*
        , (SELECT json_agg(row_to_json(sl.*)) "subLocations" FROM (${sqlSubLocationsPlantLots}) sl)
        FROM plants_growth_stages_distinct pgsd, locations l1 
        WHERE pgsd."locationId" = l1.id ORDER BY l1.name
        `;
        
        sqlTotalPlantsLocations = `SELECT pgs."growthStageName", COUNT(pgs.id) "totalPlants", '${userChartPrefrence[0].from}-${userChartPrefrence[0].to}' "days"
        , (SELECT json_agg(row_to_json(l.*)) "data" FROM (${sqlLocationSubLocationsPlantLots}) l)
        FROM plants_growth_stages pgs
        GROUP BY pgs."growthStageName"
        `;

        sqlRowToJson = `SELECT json_agg(row_to_json(fnl.*)) "data"
        FROM (${sqlTotalPlantsLocations}) fnl
        `;

        sqlStr = `WITH plants_growth_stages AS (${sqlGrowthStages})
        , plants_growth_stages_distinct AS (SELECT DISTINCT * FROM plants_growth_stages)
        ${sqlRowToJson}
        `;
 */

        console.log('getGrowingFacilityPlantsAge: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

        data[ndx] = selectedRecs.rows[0].data[0];
        ndx++;
            
        }

        const result = {
            data: {
                // list: selectedRecs.rows[0],
                list: data,
                message: "Plants age wise total!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][growing-facility][getGrowingFacilityPlantsAge] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getGrowingFacilityPlantsAge;


        /** sample sql
        WITH plants_age AS (SELECT pl.id "plantLotId", pl."lotNo" "plantLotNo", p.id "plantId", to_timestamp(p."plantedOn"/1000)::date "startDate"
        , current_date - to_timestamp(p."plantedOn"/1000)::date "ageInDays"
        , ploc."locationId" , ploc."subLocationId"
        FROM plant_lots pl ,plants p, plant_locations ploc
        WHERE pl.id = p."plantLotId" AND pl."isActive" AND not pl."isFinalHarvest" AND not p."isWaste"
        AND pl."companyId" = 953
        AND current_date - to_timestamp(p."plantedOn"/1000)::date >= 1
        AND current_date - to_timestamp(p."plantedOn"/1000)::date <= 19
        AND ploc.id = (SELECT id FROM plant_locations pl2 WHERE pl2."plantId" = p.id ORDER BY id desc limit 1)  -- current plant location
         AND ploc."locationId" IN (2,7,3))
        , locationSubLocationPlantLotCount AS (SELECT pa."locationId", pa."subLocationId", pa."plantLotId", count(pa."plantLotNo") "plantsCount"
        FROM plants_age  pa
        GROUP BY pa."locationId", pa."subLocationId", pa."plantLotId"
        ORDER BY pa."locationId", pa."subLocationId", pa."plantLotId"
        )
        SELECT json_agg(row_to_json(fnl.*)) "data"
        FROM (SELECT count(*) "totalPlants", '1-19' "days"
        , (SELECT json_agg(row_to_json(l.*)) "data" FROM (SELECT l1.*
        , (SELECT json_agg(row_to_json(sl.*)) "subLocations" FROM (SELECT sl1.*
        , (SELECT json_agg(row_to_json(pld.*)) "plantLots" FROM (SELECT pl4.*, lsp."plantsCount", (SELECT count(p.id)::int FROM plants p WHERE p."plantLotId" = pl4.id AND p."isWaste") "wastePlants", sp."name" "specieName", st."name" "strainName"
        FROM plant_lots pl4, species sp, strains st
        WHERE pl4.id = lsp."plantLotId" AND pl4."locationId" = l1.id AND pl4."subLocationId" = sl1.id AND pl4."specieId" = sp.id AND pl4."strainId" = st.id
        ) pld)
        FROM sub_locations sl1
        WHERE sl1."locationId" = lsp."locationId" AND sl1.id = lsp."subLocationId" AND sl1."locationId"= l1.id ORDER BY sl1.name
        ) sl)
        FROM locationSubLocationPlantLotCount lsp, locations l1
        WHERE lsp."locationId" = l1.id ORDER BY l1.name
        ) l)
        FROM plants_age pa
        ) fnl 
        */
