const knexReader = require('../../db/knex-reader');

const getUserActivities = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let loggedInUserId = req.me.id;

        let { companyId, userId, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

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

        sqlOrderBy = ` ORDER BY ua."createdAt" DESC`

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        console.log('getUserActivities sql: ', sqlStr);

        var selectedRecs = await knexReader.raw(sqlStr);

        const result = {
            data: {
                records: selectedRecs.rows,
                message: "User activities list!"
            }
        }

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][user-activities][getUserActivities] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getUserActivities;

/**
 */
