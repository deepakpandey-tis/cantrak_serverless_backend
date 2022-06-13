const knexReader = require('../../db/knex-reader');
const moment = require("moment");

const getUserTeamWorkOrderList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        const { companyId, fromDate, toDate, displayId, frequencyTag, status, locationId } = req.body;

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
        sqlSelect = `SELECT DISTINCT wpsal.*
        , t."teamName", u."name" "mainUser", l."name" "locationName", sl."name" "subLocationName"
        `;

        sqlFrom = ` FROM work_plan_schedule_assign_locations wpsal, assigned_service_team ast, team_users tu, teams t, users u, locations l, sub_locations sl
        `;

        sqlWhere = ` WHERE wpsal."orgId" = ${orgId} AND ast."entityId" = wpsal.id and ast."entityType" = 'work_order'`;
        sqlWhere += ` AND ast."teamId" = t."teamId" AND t."teamId" = tu."teamId"`;
        if ( !(req.me.isSuperAdmin || req.me.isOrgAdmin) ) {
            sqlWhere += ` AND tu."userId" = ${userId}`;
        }
        sqlWhere += ` AND ast."userId" = u.id  AND wpsal."locationId" = l.id AND wpsal."subLocationId" = sl.id`;
        if(companyId){
            sqlWhere += ` AND wpsal."companyId" = ${companyId}`;
        }
        if(fromDate){
            sqlWhere += ` AND wpsal."workOrderDate" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND wpsal."workOrderDate" <= ${new Date(toDate).getTime()}`;
        }
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

        sqlOrderBy = ` ORDER BY "workOrderDate" asc, "displayId" asc, "locationName" asc, "subLocationName" asc, name asc`;
        //sqlOrderBy = ` ORDER BY "${sortCol}" ${sortOrder}`;
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
