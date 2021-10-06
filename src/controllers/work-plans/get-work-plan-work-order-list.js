const knexReader = require('../../db/knex-reader');
const moment = require("moment");

const getWorkPlanWorkOrderList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        const { id, workOrderDate, displayId, frequencyTag, status, plantationGroupId } = req.body;

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
        , wpsag."id" "workOrderId", wpsag."displayId", wpsag."name", wpsag."plantationGroupId", wpsag."workOrderDate", wpsag."isOverdue", wpsag."status", wpsag."frequencyTag"
        , pg."description"
        `;

        sqlFrom = ` FROM work_plan_schedules wps, work_plan_schedule_assign_groups wpsag, plantation_groups pg
        `;

        sqlWhere = ` WHERE wps."orgId" = ${orgId} AND wps."workPlanMasterId" = ${id}`;

        sqlWhere += ` AND wpsag."workPlanScheduleId" = wps.id AND wpsag."workOrderDate" <= ${workOrderDate} AND wpsag."plantationGroupId" = pg.id`;
        if(plantationGroupId){
            sqlWhere += ` AND wpsag."plantationGroupId" = ${plantationGroupId}`;
        }
        if(displayId){
            sqlWhere += ` AND wpsag."displayId" = ${displayId}`;
        }
        if(frequencyTag){
            sqlWhere += ` AND wpsag."frequencyTag" = '${frequencyTag}'`;
        }
        if(status){
            var arr = (status + "").split(",");
            var str = "('" + arr.join("', '") + "')";
            console.log('status: ', (status + "").split(","));
            sqlWhere += ` AND wpsag."status" in ${str}`;
        }

        sqlOrderBy = ` ORDER BY "workOrderDate" desc, "displayId" desc, "description" asc, name asc`;
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
