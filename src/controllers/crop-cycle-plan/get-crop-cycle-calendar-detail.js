const knexReader = require('../../db/knex-reader');

const getCropCycleCalendarDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let { companyId, growingLocationIds } = req.body;

        let sqlStr, sqlSelect;

        sqlSelect = `SELECT l."name" "locationName", sl."name" "subLocationName", ccpd."startDate" "expectedStartDate", ccpd."expectedHarvestDate", ccpd."locationId", ccpd."subLocationId" , pl."lotNo" , pl."plantedOn" "startDate", case when pl."isFinalHarvest" then hpl."harvestedOn" else null end "endDate"
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
        `;

        console.log('getCropCycleCalendarDetail: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

        let sqlCropCyclePlans, sqlExpectedGrowthStages, sqlCropCyclePlanPlantGrowthStages, sqlActualGrowthStages;

        sqlCropCyclePlans = `SELECT l.name "locationName", ccpd."locationId" , sl.name "subLocationName", ccpd."subLocationId", ccp."name" , ccp."date", ccpd.id "cropCyclePlanDetailId", ccpd."plantLotId" "cropCyclePlanDetailPlantLotId", ccpd."startDate" , ccpd."expectedHarvestDate" , ccpd."expectedPlants"
        FROM crop_cycle_plans ccp , crop_cycle_plan_detail ccpd , locations l , sub_locations sl
        WHERE ccp."orgId" = ${orgId} AND ccp."companyId" = ${companyId} AND ccp."isActive" AND ccpd."cropCyclePlanId" = ccp.id AND ccpd."isActive"
        AND ccpd."locationId" = l.id AND ccpd."subLocationId" = sl.id
        `;
        if(growingLocationIds?.length && growingLocationIds[0] != 0){
            sqlCropCyclePlans += ` AND ccpd."locationId" IN (${growingLocationIds})`
        }
        sqlCropCyclePlans += ` ORDER BY l."name" , sl."name", ccpd."startDate" DESC`;

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
        
        var expectedGrowthStages = await knexReader.raw(sqlExpectedGrowthStages);

        sqlCropCyclePlanPlantGrowthStages = `, cropCyclePlanPlantLotGrowthStages
        AS (
            SELECT pgs3.* ,
            case when lead(pgs3."startDate") over (partition by pgs3."plantLotNo" order by pgs3."startDate") is null then (select case when "isFinalHarvest" then (select hpl."harvestedOn" from harvest_plant_lots hpl where hpl."plantLotId" = pgs3."plantLotId" order by hpl.id desc limit 1) else null end from plant_lots pl2 where pl2.id = pgs3."plantLotId") else
            lead(pgs3."startDate") over (partition by pgs3."plantLotNo" order by pgs3."startDate") end  "endDate"
            -- lead(pgs3."startDate") over (partition by pgs3."lotNo" ORDER BY pgs3."startDate") "endDate"
            FROM
            (
                SELECT distinct pl.id "plantLotId", pl."lotNo" "plantLotNo", gs."listOrder" , gs."name" , pgs."startDate" "startDate"
                FROM plant_lots pl , plants p , plant_growth_stages pgs , growth_stages gs , cropCyclePlans ccps
                WHERE pl.id  = ccps."cropCyclePlanDetailPlantLotId" AND pl.id = p."plantLotId" AND pgs."plantId" = p.id AND pgs."growthStageId" = gs.id
                AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = p.id ORDER BY id desc limit 1)
                ORDER BY pl."lotNo" , gs."listOrder"
            ) pgs3
        )
        `;

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
                
        var actualGrowthStages = await knexReader.raw(sqlActualGrowthStages);

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
