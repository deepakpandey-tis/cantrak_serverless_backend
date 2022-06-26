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

        const { id, entityTypeId, fromDate, toDate, fromCompletedDate, toCompletedDate, displayId, frequencyTag, status, locationId } = req.body;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"workOrderDate" desc, "displayId" desc, "locationName" asc`;
            if(entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
                sortCol += `, "subLocationName" asc`;
            }
            else if(entityTypeId == EntityTypes.WorkPlanPlantLot){
                sortCol += `, "subLocationName" asc, "plantedOn"`;
            }

            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = 'asc';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT wps.*
        , wpsal."id" "workOrderId", wpsal."displayId", wpsal."name", wpsal."locationId", wpsal."workOrderDate", wpsal."isOverdue", wpsal."status", wpsal."frequencyTag", wpsal."completedAt"
        , CASE WHEN wpsal."status" = 'O' THEN 'Open' WHEN wpsal."status" = 'COM' THEN 'Completed' ELSE 'Cencelled' END "statusDesc"
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
            if(arr[0] != ''){
                //  Not All
                var str = "('" + arr.join("', '") + "')";
                console.log('status: ', (status + "").split(","));
                sqlWhere += ` AND wpsal."status" in ${str}`;
            }
        }
        if(fromDate){
            sqlWhere += ` AND to_timestamp(wpsal."workOrderDate"/1000)::date >= to_timestamp(${new Date(fromDate).getTime()}/1000)::date`;
        }
        if(toDate){
            sqlWhere += ` AND to_timestamp(wpsal."workOrderDate"/1000)::date <= to_timestamp(${new Date(toDate).getTime()}/1000)::date`;
        }
        if(fromCompletedDate){
            sqlWhere += ` AND to_timestamp(wpsal."completedAt"/1000)::date >= to_timestamp(${new Date(fromCompletedDate).getTime()}/1000)::date`;
        }
        if(toCompletedDate){
            sqlWhere += ` AND to_timestamp(wpsal."completedAt"/1000)::date <= to_timestamp(${new Date(toCompletedDate).getTime()}/1000)::date`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getWorkPlanWorkOrderList sql: ', sqlSelect + sqlFrom + sqlWhere + sqlOrderBy);

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
