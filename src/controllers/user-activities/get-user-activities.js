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
        if(!userId){
            // userId not specifed, get logged-in user activities
            sqlWhere += ` AND ua."createdBy" = ${loggedInUserId}`
        }
        else {
            sqlWhere += ` AND ua."createdBy" = ${userId}`
        }
        if(companyId){
            sqlWhere += ` AND ua."companyId" = ${companyId}`;
        }
        if(fromDate){
            sqlWhere += ` AND ua."createdAt" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND ua."createdAt" <= ${new Date(toDate).getTime()}`;
        }

        sqlOrderBy = ` ORDER BY ua."createdAt" DESC`

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

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
