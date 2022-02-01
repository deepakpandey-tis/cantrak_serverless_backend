const knexReader = require('../../db/knex-reader');

const getListComponentColumnsTemplates = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT lcct.*`;
        sqlFrom = ` FROM list_component_columns_templates lcct `;
        sqlWhere = ` WHERE lcct."orgId" = ${orgId} AND lcct."listComponentName" = '${req.query.listComponent}'`;
        sqlOrderBy = `ORDER BY lcct.name`

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        const result = {
            data: {
                records: selectedRecs.rows,
                message: "List component columns template list!"
            }
        }

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][user-customisation][getListComponentColumnsTemplates] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getListComponentColumnsTemplates;

/**
 */
