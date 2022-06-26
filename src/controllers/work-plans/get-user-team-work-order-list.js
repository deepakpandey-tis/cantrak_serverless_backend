const knexReader = require('../../db/knex-reader');
const moment = require("moment");

const getUserTeamWorkOrderList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        const { companyId, name, fromDate, toDate, fromCompletedDate, toCompletedDate, displayId, overdue, frequencyTag, status, locationId } = req.body;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"workOrderDate" desc, "displayId" desc`;
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
        sqlSelect = `SELECT DISTINCT wpsal.*
        , CASE WHEN wpsal."status" = 'O' THEN 'Open' WHEN wpsal."status" = 'COM' THEN 'Completed' ELSE 'Cencelled' END "statusDesc"
        , t."teamName", u."name" "mainUser", l."name" "locationName", sl."name" "subLocationName"
        `;

        sqlFrom = ` FROM work_plan_schedule_assign_locations wpsal`;
        sqlFrom += ` LEFT JOIN sub_locations sl ON wpsal."subLocationId" = sl.id`;
        sqlFrom += `, assigned_service_team ast, team_users tu, teams t, users u, locations l`;

        sqlWhere = ` WHERE wpsal."orgId" = ${orgId} AND ast."entityId" = wpsal.id and ast."entityType" = 'work_order'`;
        sqlWhere += ` AND ast."teamId" = t."teamId" AND t."teamId" = tu."teamId"`;
        if ( (!req.me.isSuperAdmin && !req.me.isOrgAdmin) ) {
            sqlWhere += ` AND tu."userId" = ${userId}`;
        }
        sqlWhere += ` AND ast."userId" = u.id  AND wpsal."locationId" = l.id`;
        if(companyId){
            sqlWhere += ` AND wpsal."companyId" = ${companyId}`;
        }
        if(name && name != ''){
            sqlWhere += ` AND wpsal."name" iLIKE '%${name}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND to_timestamp(wpsal."workOrderDate"/1000)::date >= to_timestamp(${new Date(fromDate).getTime()}/1000)::date`;
        }
        if(toDate){
            sqlWhere += ` AND to_timestamp(wpsal."workOrderDate"/1000)::date <= to_timestamp(${new Date(toDate).getTime()}/1000)::date`;
        }
        if(locationId){
            sqlWhere += ` AND wpsal."locationId" = ${locationId}`;
        }
        if(fromCompletedDate){
            sqlWhere += ` AND to_timestamp(wpsal."completedAt"/1000)::date >= to_timestamp(${new Date(fromCompletedDate).getTime()}/1000)::date`;
        }
        if(toCompletedDate){
            sqlWhere += ` AND to_timestamp(wpsal."completedAt"/1000)::date <= to_timestamp(${new Date(toCompletedDate).getTime()}/1000)::date`;
        }
        if(displayId){
            sqlWhere += ` AND wpsal."displayId" = ${displayId}`;
        }
        if(frequencyTag){
            sqlWhere += ` AND wpsal."frequencyTag" = '${frequencyTag}'`;
        }
        if(overdue){
            sqlWhere += overdue == 1 ? ` AND wpsal."isOverdue"` : ` AND NOT wpsal."isOverdue"`;
        }
        if(status){
            var arr = (status + "").split(",");
            if(arr[0] != ''){
                //  Not All
                var str = "('" + arr.join("', '") + "')";
                console.log('arr, str: ', arr, str);
                sqlWhere += ` AND wpsal."status" in ${str}`;
            }
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getUserTeamWorkOrderList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getUserTeamWorkOrderList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "User's Team Work Order list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][work-plans][getUserTeamWorkOrderList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getUserTeamWorkOrderList;

/**
 */
