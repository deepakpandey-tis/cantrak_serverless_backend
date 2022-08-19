const knexReader = require('../../db/knex-reader');
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const getUserActivityList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let loggedInUserId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, userId, fromDate, toDate, getLoginLogout, entityActionId, entityTypeId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"createdAt" DESC`;
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = 'desc';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)

        sqlSelect = `SELECT ua.*, c."companyName"`;
        sqlFrom = ` FROM user_activities ua`;
        sqlFrom += ` LEFT OUTER JOIN companies c ON c.id = ua."companyId"`
        sqlWhere = ` WHERE ua."orgId" = ${orgId}`;
        if(userId){
            sqlWhere += ` AND ua."createdBy" = ${userId}`
        }
/*         else {
            // userId not specifed, get logged-in user activities
            sqlWhere += ` AND ua."createdBy" = ${loggedInUserId}`
        }
 */
        if(companyId){
            sqlWhere += ` AND (ua."companyId" is null OR ua."companyId" = ${companyId})`;
        }
        if(fromDate){
            sqlWhere += ` AND to_timestamp(ua."createdAt"/1000)::date >= to_timestamp(${new Date(fromDate).getTime()}/1000)::date`;
        }
        if(toDate){
            sqlWhere += ` AND to_timestamp(ua."createdAt"/1000)::date <= to_timestamp(${new Date(toDate).getTime()}/1000)::date`;
        }
        if(!getLoginLogout){
            sqlWhere += ` AND "entityTypeId" != ${EntityTypes.Login} AND "entityTypeId" != ${EntityTypes.Logout}`;
        }
        if(entityActionId){
            sqlWhere += ` AND ua."entityActionId" = ${entityActionId}`;
        }
        if(entityTypeId){
            sqlWhere += ` AND ua."entityTypeId" = ${entityTypeId}`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getUserActivityList sql: ', sqlSelect + sqlFrom + sqlWhere + sqlOrderBy);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getUserActivityList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "User activity list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][user-activities][getUserActivityList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getUserActivityList;

/**
 */
