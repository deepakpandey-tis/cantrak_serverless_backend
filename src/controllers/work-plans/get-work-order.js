const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const getWorkOrder = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

/*         const schema = Joi.object().keys({
            id: Joi.string().required(), 
            entityTypeId: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }
 */
        sqlSelect = `SELECT wpsal.*, c."companyName", c."logoFile", l.name "locationName"`;
        if(payload.entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
            sqlSelect += `, sl."name" "subLocationName"`;
        }
        else if(payload.entityTypeId == EntityTypes.WorkPlanPlantLot){
            sqlSelect += `, sl."name" "subLocationName", pl.id "plantLotId", pl."lotNo" , pl."plantedOn" , pl."plantsCount", s.name "strainName"`;
        }

        sqlFrom = ` FROM work_plan_schedule_assign_locations wpsal`;
        sqlFrom += `, companies c, locations l`;
        if(payload.entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
            sqlFrom += `, sub_locations sl`;
        }
        else if(payload.entityTypeId == EntityTypes.WorkPlanPlantLot){
            sqlFrom += `, sub_locations sl, plant_lots pl, strains s`;
        }

        sqlWhere = ` WHERE wpsal.id = ${payload.id} AND wpsal."orgId" = ${orgId}`;
        sqlWhere += ` AND wpsal."companyId" = c.id AND wpsal."orgId" = c."orgId"`;
        sqlWhere += ` AND wpsal."locationId" = l.id AND wpsal."orgId" = l."orgId"`;
        if(payload.entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
            sqlWhere += ` AND wpsal."subLocationId" = sl.id AND wpsal."orgId" = sl."orgId"`;
        }
        else if(payload.entityTypeId == EntityTypes.WorkPlanPlantLot){
            sqlWhere += ` AND wpsal."subLocationId" = sl.id AND wpsal."orgId" = sl."orgId" AND wpsal."plantLotId" = pl.id AND pl."strainId" = s.id`;
        }

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  Get Work Order Team and Main User
        sqlSelect = `SELECT ast.*, t."teamName", u."name", u."userName"`;

        sqlFrom = ` FROM assigned_service_team ast`;
        sqlFrom += ` LEFT JOIN teams t ON ast."teamId" = t."teamId"`;
        sqlFrom += ` LEFT JOIN users u ON ast."userId" = u.id`;

        sqlWhere = ` WHERE ast."orgId" = ${orgId} and ast."entityId" = ${payload.id} `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var workOrderTeam = await knexReader.raw(sqlStr);

        //  Get Work Order Additional Users
        sqlSelect = `SELECT asau.*, u."name", u."userName"`;

        sqlFrom = ` FROM assigned_service_additional_users asau`;
        sqlFrom += ` LEFT JOIN users u ON asau."userId" = u.id`;

        sqlWhere = ` WHERE asau."orgId" = ${orgId} and asau."entityId" = ${payload.id} `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var workOrderAdditionalUsers = await knexReader.raw(sqlStr);

        //  Get Work Order Tasks
        sqlSelect = `SELECT wpslt.*`;
        sqlSelect += `, rm.id "rmId", rm."entityId" "rmEntityId", rm."description" "rmDescription"`;
        sqlSelect += `, i.id "imgId", i."entityId" "imgEntityId", i."s3Url" "imgs3Url"`;
        sqlFrom = ` FROM work_plan_schedule_location_tasks wpslt`;
        sqlFrom += ` LEFT JOIN remarks_master rm ON wpslt.id = rm."entityId" AND rm."entityType" = 'work_order_task'`;
        sqlFrom += ` LEFT JOIN images i ON wpslt.id = i."entityId" AND i."entityType" = 'work_order_task'`;
        sqlWhere = ` WHERE wpslt."orgId" = ${orgId} and wpslt."workPlanScheduleAssignLocationId" = ${payload.id} `;
        sqlOrderBy = ` ORDER BY wpslt.id asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var workOrderTasks = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
                workOrderTeam: workOrderTeam.rows[0],
                workOrderAdditionalUsers: workOrderAdditionalUsers.rows,
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
