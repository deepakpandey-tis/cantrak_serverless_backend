const knexReader = require('../../../db/knex-reader');

const getEntityActions = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let loggedInUserId = req.me.id;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT ea.*`;
        sqlFrom = ` FROM entity_actions ea`;
        sqlWhere = ` WHERE ea."isActive"`;

        sqlOrderBy = ` ORDER BY ea."entityAction" ASC`

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        const result = {
            data: {
                records: selectedRecs.rows,
                message: "Entity Action list!"
            }
        }

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][user-activities][masters][getEntityActions] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getEntityActions;

/**
 */
