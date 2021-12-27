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

        sqlSelect = `SELECT wpsa.*, c."companyName", l.name "locationName"`;

        sqlFrom = ` FROM work_plan_schedule_assign_locations wpsa, companies c, locations l`;

        sqlWhere = ` WHERE wpsa.id = ${payload.id} AND wpsa."orgId" = ${orgId}`;
        sqlWhere += ` AND wpsa."companyId" = c.id AND wpsa."orgId" = c."orgId"`;
        sqlWhere += ` AND wpsa."locationId" = l.id AND wpsa."orgId" = l."orgId"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  Get Work Order Tasks
        sqlSelect = `SELECT wpslt.*`;
        sqlFrom = ` FROM work_plan_schedule_location_tasks wpslt`;
        sqlWhere = ` WHERE wpslt."orgId" = ${orgId} and wpslt."workPlanScheduleAssignLocationId" = ${payload.id} `;
        sqlOrderBy = ` ORDER BY wpslt.id asc`;

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