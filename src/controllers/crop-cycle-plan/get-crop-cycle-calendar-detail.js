const knexReader = require('../../db/knex-reader');

const getCropCycleCalendarDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let { companyId, growingLocationIds } = req.body;

        let sqlStr, sqlSelect;

        sqlSelect = `SELECT l."name" "locationName", sl."name" "subLocationName", ccpd."startDate" "expectedStartDate", ccpd."expectedHarvestDate", ccpd."locationId", ccpd."subLocationId" , pl."lotNo" , pl."plantedOn" "startDate", case when pl."isFinalHarvest" then hpl."harvestedOn" else null end "endDate"
        FROM crop_cycle_plans ccp, crop_cycle_plan_detail ccpd, locations l, sub_locations sl, plant_lots pl left join harvest_plant_lots hpl on pl.id = hpl."plantLotId" 
        WHERE ccp."orgId" = ${orgId} AND ccp."companyId" = ${companyId} AND ccp."isActive" AND ccp.id = ccpd."cropCyclePlanId"
        AND ccpd."plantLotId" = pl.id AND ccpd."locationId" = l.id AND ccpd."subLocationId" = sl.id 
        ORDER BY l."name" , sl."name" , ccpd."startDate"
        `;
        if(growingLocationIds[0] != 0){
            sqlPlantsAge += ` AND ccpd."locationId" IN (${growingLocationIds})`
        }

        sqlStr = `select json_agg(row_to_json(lslccp.*))
        from (${sqlSelect}) lslccp
        `;

        console.log('getCropCycleCalendarDetail: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

        const result = {
            data: {
                list: selectedRecs.rows[0],
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
