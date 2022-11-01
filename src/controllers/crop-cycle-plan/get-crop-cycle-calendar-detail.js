const knexReader = require('../../db/knex-reader');

const getCropCycleCalendarDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let { companyId, growingLocationIds, year } = req.body;

        let sqlStr, sqlSelect;

        //  get location-wise, sub-location-wise, crop cycle plan in the desc order of crop cylce start date
/*         sqlSelect = `SELECT l."name" "locationName", sl."name" "subLocationName", ccpd."startDate" "expectedStartDate", ccpd."expectedHarvestDate", ccpd."locationId", ccpd."subLocationId" , pl."lotNo" , pl."plantedOn" "startDate", case when pl."isFinalHarvest" then hpl."harvestedOn" else null end "endDate"
        FROM crop_cycle_plans ccp, crop_cycle_plan_detail ccpd, locations l, sub_locations sl, plant_lots pl LEFT JOIN harvest_plant_lots hpl on pl.id = hpl."plantLotId" 
        WHERE ccp."orgId" = ${orgId} AND ccp."companyId" = ${companyId} AND ccp."isActive" AND ccp.id = ccpd."cropCyclePlanId"
        AND ccpd."plantLotId" = pl.id AND ccpd."locationId" = l.id AND ccpd."subLocationId" = sl.id 
        `;
        if(growingLocationIds?.length && growingLocationIds[0] != 0){
            sqlSelect += ` AND ccpd."locationId" IN (${growingLocationIds})`
        }
        sqlSelect += ` ORDER BY l."name" , sl."name" , ccpd."startDate" DESC`;

        sqlStr = `select json_agg(row_to_json(lslccp.*))
        from (${sqlSelect}) lslccp
        `; */

        //  Plant Lot is final harvested when plantsCount = harvestedPlantsCount
        sqlStr = `select json_agg(row_to_json(lslccp.*))
        from (
            select l."name" "locationName", sl."name" "subLocationName", ccpd."startDate" "expectedStartDate", ccpd."expectedHarvestDate", ccpd."locationId", ccpd."subLocationId"
            , pl.id "plantLotId", pl."lotNo" , pl."plantedOn" "startDate", pl."plantsCount"
            , (select sum(p."isWaste"::int) "wastePlants" from plants p where p."orgId" = 89 and p."plantLotId" = pl.id)
            , (select coalesce(sum("plantsCount"), 0) "harvestedPlantsCount" from harvest_plant_lots hpl4 where hpl4."plantLotId" = pl.id and hpl4."isFinalHarvest" )
            , hpl."harvestedOn"
            from crop_cycle_plans ccp, crop_cycle_plan_detail ccpd, locations l, sub_locations sl, plant_lots pl
            left join harvest_plant_lots hpl on pl.id = hpl."plantLotId"
            where ccp."orgId" = ${orgId} and ccp."companyId" = ${companyId} and to_char(to_timestamp("date"/1000 )::date, 'YYYY') = '${year}' and ccp."isActive" and ccp."orgId" = ccpd."orgId" and ccp.id = ccpd."cropCyclePlanId"
        `;
        if(growingLocationIds?.length && growingLocationIds[0] != 0){
            sqlStr += ` and ccpd."locationId" in (${growingLocationIds})`
        }
        sqlStr += ` and ccpd."plantLotId" = pl.id and ccpd."locationId" = l.id and ccpd."subLocationId" = sl.id
            and (hpl."harvestedOn" is null or hpl.id = (select id from harvest_plant_lots hpl2 where hpl2."orgId" = ccp."orgId" and hpl2."companyId" = ccp."companyId" and hpl2."plantLotId" = pl.id order by hpl2.id desc limit 1))
            order by l."name" , sl."name" , ccpd."startDate" desc
        ) lslccp
        `;
        console.log('getCropCycleCalendarDetail: ', sqlStr);
        
        // var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

        let sqlCropCyclePlans, sqlExpectedGrowthStages, sqlCropCyclePlanPlantGrowthStages, sqlActualGrowthStages;

        sqlCropCyclePlans = `SELECT l.name "locationName", ccpd."locationId" , sl.name "subLocationName", ccpd."subLocationId", ccp."name" , ccp."date", ccpd.id "cropCyclePlanDetailId", ccpd."plantLotId" "cropCyclePlanDetailPlantLotId", ccpd."startDate" , ccpd."expectedHarvestDate" , ccpd."expectedPlants"
        FROM crop_cycle_plans ccp , crop_cycle_plan_detail ccpd , locations l , sub_locations sl
        WHERE ccp."orgId" = ${orgId} AND ccp."companyId" = ${companyId} AND ccp."isActive" AND ccp."orgId" = ccpd."orgId" AND ccpd."cropCyclePlanId" = ccp.id AND ccpd."isActive"
        AND ccpd."locationId" = l.id AND ccpd."locationId" = sl."locationId" AND ccpd."subLocationId" = sl.id
        `;
        if(growingLocationIds?.length && growingLocationIds[0] != 0){
            sqlCropCyclePlans += ` AND ccpd."locationId" IN (${growingLocationIds})`
        }
        sqlCropCyclePlans += ` ORDER BY l."name" , sl."name", ccpd."startDate" DESC`;

        //  get crop cycle plans expected growth stages
        sqlExpectedGrowthStages = `WITH cropCyclePlans
        AS (${sqlCropCyclePlans})
        SELECT json_agg(row_to_json(es.*)) "expectedGrowthStages"
        FROM (
            SELECT ccp.*
            , (SELECT json_agg(row_to_json(ccpdg1.*)) FROM (SELECT ccpdg."listOrder", ccpdg."name" , ccpdg."noOfDays" , ccpdg."startDate" , ccpdg."endDate" FROM crop_cycle_plan_detail_gs ccpdg WHERE ccpdg."cropCyclePlanDetailId" = ccp."cropCyclePlanDetailId" ORDER BY ccpdg."listOrder") "ccpdg1") "growthStages"
            FROM cropCyclePlans ccp
        ) es
        `;

        console.log('expectedGrowthStages: ', sqlExpectedGrowthStages);
        
        // var expectedGrowthStages = await knexReader.raw(sqlExpectedGrowthStages);

        sqlCropCyclePlanPlantGrowthStages = `, cropCyclePlanPlantLotGrowthStages
        AS (
        SELECT pgs3.* ,
        case when lead(pgs3."startDate") over (partition by pgs3."plantLotNo" order by pgs3."startDate") is null then (select case when "isFinalHarvest" then (select hpl."harvestedOn" from harvest_plant_lots hpl where hpl."orgId" = ${orgId} and hpl."companyId" = ${companyId} and hpl."plantLotId" = pgs3."plantLotId" order by hpl.id desc limit 1) else null end from plant_lots pl2 where pl2.id = pgs3."plantLotId") else
        lead(pgs3."startDate") over (partition by pgs3."plantLotNo" order by pgs3."startDate") end  "endDate"
        -- lead(pgs3."startDate") over (partition by pgs3."lotNo" ORDER BY pgs3."startDate") "endDate"
        FROM
        (
            SELECT DISTINCT ON (pl."lotNo", gs."listOrder") pl.id "plantLotId", pl."lotNo" "plantLotNo", gs."listOrder" , gs."name" , pgs."startDate" "startDate"
            FROM plant_lots pl , plants p , plant_growth_stages pgs , growth_stages gs , cropCyclePlans ccps, plant_locations pl2
            WHERE pl.id  = ccps."cropCyclePlanDetailPlantLotId" and pl."orgId" = p."orgId" AND pl.id = p."plantLotId" AND pl."orgId" = pgs."orgId" and pgs."plantId" = p.id AND pgs."growthStageId" = gs.id
            AND pl."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        `;
        if(growingLocationIds?.length && growingLocationIds[0] != 0){
            sqlCropCyclePlanPlantGrowthStages += ` AND pl2."locationId" IN (${growingLocationIds})`
        }
        sqlCropCyclePlanPlantGrowthStages += ` AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id ORDER BY pl3.id DESC LIMIT 1)
            AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pl."orgId" = pgs2."orgId" AND pgs2."plantId" = p.id ORDER BY pgs2.id DESC LIMIT 1)
--          AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = p.id AND pgs2."growthStageId" = pgs."growthStageId" ORDER BY id desc limit 1)
            ORDER BY pl."lotNo" , gs."listOrder", pgs."startDate" desc
        ) pgs3
        )`;

        sqlActualGrowthStages = `with cropCyclePlans
        AS (${sqlCropCyclePlans})
        ${sqlCropCyclePlanPlantGrowthStages}
        SELECT json_agg(row_to_json(ags.*)) "actualGrowthStages"
        FROM (
            SELECT ccps.*
            , (SELECT json_agg(row_to_json(ccpdg1.*))  FROM (SELECT * FROM cropCyclePlanPlantLotGrowthStages ccpplgs WHERE ccpplgs."plantLotId" = ccps."cropCyclePlanDetailPlantLotId") "ccpdg1") "growthStages"
            FROM cropCyclePlans ccps
        ) ags
        `;

        console.log('actualGrowthStages: ', sqlActualGrowthStages);
                
        // var actualGrowthStages = await knexReader.raw(sqlActualGrowthStages);

        let selectedRecs, expectedGrowthStages, actualGrowthStages;
        [selectedRecs, expectedGrowthStages, actualGrowthStages] = await Promise.all([
            knexReader.raw(sqlStr), 
            knexReader.raw(sqlExpectedGrowthStages), 
            knexReader.raw(sqlActualGrowthStages)
        ]);

        const result = {
            data: {
                list: selectedRecs.rows[0],
                expectedGrowthStages: expectedGrowthStages.rows[0].expectedGrowthStages,
                actualGrowthStages: actualGrowthStages.rows[0].actualGrowthStages,
                message: "Crop cycle calendar detail!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][crop-cycle-plan][getCropCycleCalendarDetail] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getCropCycleCalendarDetail;
