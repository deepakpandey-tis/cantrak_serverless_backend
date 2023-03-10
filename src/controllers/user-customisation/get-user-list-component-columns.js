const Joi = require("@hapi/joi");
const knexReader = require('../../db/knex-reader');

const getUserListComponentColumns = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        sqlSelect = `SELECT lcct.*`;
        sqlFrom = ` FROM list_component_columns_templates lcct, user_list_component_columns ulcc `;
        sqlWhere = ` WHERE ulcc."orgId" = ${orgId} AND ulcc."userId" = ${userId} AND ulcc."listComponentName" = '${req.query.listComponent}'
        AND ulcc."listComponentColumnsTemplateId" = lcct.id
        `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows.length > 0 ? selectedRecs.rows[0] : {},
            },
            message: "User list component columns!"
        });

    } catch (err) {
        console.log("[controllers][user-customisation]][getUserListComponentColumns] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getUserListComponentColumns;
