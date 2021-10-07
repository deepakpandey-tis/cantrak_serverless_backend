const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getWorkOrder = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        const schema = Joi.object().keys({
            id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT wpsag.*, c."companyName", p.name "plantationName", pg.description`;

        sqlFrom = ` FROM work_plan_schedule_assign_groups wpsag, companies c, plantations p, plantation_groups pg`;

        sqlWhere = ` WHERE wpsag.id = ${payload.id} AND wpsag."orgId" = ${orgId}`;
        sqlWhere += ` AND wpsag."companyId" = c.id AND wpsag."orgId" = c."orgId"`;
        sqlWhere += ` AND wpsag."plantationId" = p.id AND wpsag."orgId" = p."orgId"`;
        sqlWhere += ` AND wpsag."plantationGroupId" = pg.id AND wpsag."orgId" = pg."orgId"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  Get Work Order Tasks
        sqlSelect = `SELECT wpsgt.*`;
        sqlFrom = ` FROM work_plan_schedule_group_tasks wpsgt`;
        sqlWhere = ` WHERE wpsgt."orgId" = ${orgId} and wpsgt."workPlanScheduleAssignGroupId" = ${payload.id} `;
        sqlOrderBy = ` ORDER BY wpsgt.id asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var workOrderTasks = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
                workOrderTasks: workOrderTasks.rows
            },
            message: "Work Order detail!"
        });

    } catch (err) {
        console.log("[controllers][work-plans][getWorkOrder] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getWorkOrder;
