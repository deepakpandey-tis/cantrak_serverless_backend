const knexReader = require("../../../db/knex-reader");
const moment = require("moment");

const getUserTeamWorkOrders = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        const { companyId, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        
        sqlSelect = `SELECT DISTINCT wpsal.*
        , t."teamName", u."name" "mainUser", l."name" "locationName", sl."name" "subLocationName"
        `;

        sqlFrom = ` FROM work_plan_schedule_assign_locations wpsal, assigned_service_team ast, team_users tu, teams t, users u, locations l, sub_locations sl
        `;

        sqlWhere = ` WHERE wpsal."orgId" = ${orgId} AND wpsal."status" = 'O' AND ast."entityId" = wpsal.id and ast."entityType" = 'work_order'`;
        sqlWhere += ` AND ast."teamId" = t."teamId" AND t."teamId" = tu."teamId"`;
        if ( !(req.me.isSuperAdmin || req.me.isOrgAdmin) ) {
            sqlWhere += ` AND tu."userId" = ${userId}`;
        }
        sqlWhere += ` AND ast."userId" = u.id  AND wpsal."locationId" = l.id AND wpsal."subLocationId" = sl.id`;
        if(companyId){
            sqlWhere += ` AND wpsal."companyId" = ${companyId}`;
        }
        if(fromDate){
            // Ignore time part; compare only dates
            // sqlWhere += ` AND wpsal."workOrderDate" >= ${new Date(fromDate).getTime()}`;
            sqlWhere += ` AND to_timestamp(wpsal."workOrderDate"/1000 )::date >= to_timestamp(${new Date(fromDate).getTime()}/1000 )::date`;
        }
        if(toDate){
            sqlWhere += ` AND to_timestamp(wpsal."workOrderDate"/1000 )::date <= to_timestamp(${new Date(toDate).getTime()}/1000 )::date`;
        }

        sqlOrderBy = ` ORDER BY "workOrderDate" asc, "displayId" asc, "locationName" asc, "subLocationName" asc, name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        //console.log('getUserTeamWorkOrders: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "User's Team Work Orders!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][dashboard][work-orders][getUserTeamWorkOrders] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getUserTeamWorkOrders;

/**
 */
