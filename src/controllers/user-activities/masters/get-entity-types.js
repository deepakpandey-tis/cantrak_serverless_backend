const knexReader = require('../../../db/knex-reader');

const getEntityTypes = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let loggedInUserId = req.me.id;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT et.*`;
        sqlFrom = ` FROM entity_types et`;
        sqlWhere = ` WHERE et."isActive"`;

        sqlOrderBy = ` ORDER BY et."entityType" ASC`

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        const result = {
            data: {
                records: selectedRecs.rows,
                message: "Entity Type list!"
            }
        }

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][user-activities][masters][getEntityTypes] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getEntityTypes;

/**
 */
