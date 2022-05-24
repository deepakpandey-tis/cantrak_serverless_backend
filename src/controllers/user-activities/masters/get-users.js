const knexReader = require('../../../db/knex-reader');

const getUsers = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let loggedInUserId = req.me.id;

        // let { companyId, userId, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT u.id, u.name`;
        sqlFrom = ` FROM users u`;
        sqlWhere = ` WHERE u."orgId" = ${orgId} AND u."isActive"`;

        sqlOrderBy = ` ORDER BY u."name" DESC`

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        console.log('getUsers sql: ', sqlStr);

        var selectedRecs = await knexReader.raw(sqlStr);

        const result = {
            data: {
                records: selectedRecs.rows,
                message: "User list!"
            }
        }

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][user-activities][getUsers] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getUsers;

/**
 */
