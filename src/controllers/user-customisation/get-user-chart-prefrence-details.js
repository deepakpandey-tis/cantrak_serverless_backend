const knexReader = require('../../db/knex-reader');

const getUserChartPrefrenceDetails = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let companyId = req.params.companyId;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT ucp.*`;
        sqlFrom = ` FROM user_chart_prefrences ucp `;
        sqlWhere = ` WHERE ucp."orgId" = ${orgId} AND ucp."userId" = '${userId}' AND ucp."companyId" = '${companyId}'`;
        sqlOrderBy = `ORDER BY ucp.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);
        let rows;
        if(selectedRecs?.rows?.length){
            rows = selectedRecs.rows[0];
        }

        const result = {
            data: {
                records: rows,
                message: "User Chart Prefrence Details!"
            }
        }

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][user-customisation][getUserChartPrefrenceDetails] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getUserChartPrefrenceDetails;

/**
 */
