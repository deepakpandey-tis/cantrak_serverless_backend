const knexReader = require('../../db/knex-reader');
const moment = require("moment");
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const getWorkPlanWorkOrderList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        const { id, entityTypeId, workOrderDate, displayId, frequencyTag, status, locationId } = req.body;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = 'displayId';
        }

        if(!sortOrder || sortOrder === ''){
            sortOrder = 'asc';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT wps.*
        , wpsal."id" "workOrderId", wpsal."displayId", wpsal."name", wpsal."locationId", wpsal."workOrderDate", wpsal."isOverdue", wpsal."status", wpsal."frequencyTag", wpsal."completedAt"
        , l."name" "locationName"`;
        if(entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
            sqlSelect += `, sl."name" "subLocationName"`;
        }
        else if(entityTypeId == EntityTypes.WorkPlanPlantLot){
            sqlSelect += `, sl."name" "subLocationName", pl.id "plantLotId", pl."lotNo" , pl."plantedOn" , pl."plantsCount", s.name "strainName"`;
        }

        sqlFrom = ` FROM work_plan_schedules wps, work_plan_schedule_assign_locations wpsal`;
        sqlFrom += `, locations l`;
        if(entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
            sqlFrom += `, sub_locations sl`;
        }
        else if(entityTypeId == EntityTypes.WorkPlanPlantLot){
            sqlFrom += `, sub_locations sl, plant_lots pl, strains s`;
        }

        sqlWhere = ` WHERE wps."orgId" = ${orgId} AND wps."workPlanMasterId" = ${id}`;
        sqlWhere += ` AND wpsal."workPlanScheduleId" = wps.id AND wpsal."locationId" = l.id`;
        if(entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
            sqlWhere += ` AND wpsal."subLocationId" = sl.id`;
        }
        else if(entityTypeId == EntityTypes.WorkPlanPlantLot){
            sqlWhere += ` AND wpsal."subLocationId" = sl.id AND wpsal."plantLotId" = pl.id AND pl."strainId" = s.id`;
        }

        //   condition to show <= today date; now showing for all dates     AND wpsal."workOrderDate" <= ${workOrderDate}
        if(locationId){
            sqlWhere += ` AND wpsal."locationId" = ${locationId}`;
        }
        if(displayId){
            sqlWhere += ` AND wpsal."displayId" = ${displayId}`;
        }
        if(frequencyTag){
            sqlWhere += ` AND wpsal."frequencyTag" = '${frequencyTag}'`;
        }
        if(status){
            var arr = (status + "").split(",");
            var str = "('" + arr.join("', '") + "')";
            console.log('status: ', (status + "").split(","));
            sqlWhere += ` AND wpsal."status" in ${str}`;
        }

        sqlOrderBy = ` ORDER BY "workOrderDate" desc, "displayId" desc, "locationName" asc`;
        if(entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
            sqlOrderBy += `, "subLocationName" asc, name asc`;
        }
        else if(entityTypeId == EntityTypes.WorkPlanPlantLot){
            sqlOrderBy += `, "subLocationName" asc, name asc, "plantedOn"`;
        }
        //sqlOrderBy = ` ORDER BY "${sortCol}" ${sortOrder}`;
        //console.log('getWorkPlanWorkOrderList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getWorkPlanWorkOrderList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Work Order list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][work-plans][getWorkPlanWorkOrderList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getWorkPlanWorkOrderList;

/**
 */
