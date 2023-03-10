const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const getWorkPlan = async (req, res) => {
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

        //
        sqlSelect = `SELECT wpm.*, c."companyName", c."logoFile", l.name "locationName"`;
        sqlFrom = ` FROM work_plan_master wpm, companies c, locations l`;
        sqlWhere = ` WHERE wpm."orgId" = ${orgId} and wpm.id = ${payload.id} `;
        sqlWhere += ` AND wpm."companyId" = c.id AND wpm."orgId" = c."orgId"`;
        sqlWhere += ` AND wpm."orgId" = l."orgId" AND wpm."companyId" = l."companyId"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  Get Work Plan Tasks
        sqlSelect = `SELECT wpt.*`;
        sqlFrom = ` FROM work_plan_tasks wpt`;
        sqlWhere = ` WHERE wpt."workPlanMasterId" = ${payload.id} AND wpt."orgId" = ${orgId}`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var workPlanTasks = await knexReader.raw(sqlStr);

        //  Get Work Plan Selected Locations
/*         //  Checking if All Locations selected
        const allLocations = selectedRecs.rows[0].locationIds.find(r => r.id == 0);

        sqlSelect = `SELECT l.id, l.name`;
        sqlFrom = ` FROM locations l`;
        if(allLocations){
            //  All Locations Selected
            sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."companyId" = ${selectedRecs.rows[0].companyId}`;
        } else {
            //  Some Locations Selected
            sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."companyId" = ${selectedRecs.rows[0].companyId}`;
            sqlWhere += ` AND l.id in (`;
            sqlWhere += ` SELECT location.id from work_plan_master wpm , jsonb_to_recordset(wpm."locationIds") as location(id bigint) where wpm.id = ${payload.id}`;
            sqlWhere += `)`;
        }
 */

        if(selectedRecs.rows[0].entityTypeId == EntityTypes.WorkPlanGrowingSubLocation){
            sqlSelect = `SELECT l.id, l.name, sl.id "subLocationId", sl.name "subLocationName"`;
            sqlFrom = ` FROM locations l, sub_locations sl`;
            sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."companyId" = ${selectedRecs.rows[0].companyId} AND l.id = sl."locationId"`;
            sqlWhere += ` AND sl.id IN (SELECT UNNEST(string_to_array(regexp_replace(location."subLocationId", '[\\[ \\]]', '', 'g'), ',')::bigint[]) FROM work_plan_master wpm , jsonb_to_recordset(wpm."locationIds") as location(id bigint, "subLocationId" varchar) WHERE wpm.id = ${payload.id})`;
            sqlOrderBy = ` ORDER BY l.name, sl.name`;
        }
        else if(selectedRecs.rows[0].entityTypeId == EntityTypes.WorkPlanGrowingLocation){
            sqlSelect = `SELECT l.id, l.name`;
            sqlFrom = ` FROM locations l, work_plan_master wpm , jsonb_to_recordset(wpm."locationIds") as location(id bigint)`;
            sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."companyId" = ${selectedRecs.rows[0].companyId}`;
            sqlWhere += ` AND wpm.id = ${payload.id} AND l.id = location."id"`;
            sqlOrderBy = ` ORDER BY l.name`;
        }
        else if(selectedRecs.rows[0].entityTypeId == EntityTypes.WorkPlanPlantLot){
            sqlSelect = `SELECT l.id, l.name, sl.id "subLocationId", sl.name "subLocationName", pl.id "plantLotId", pl."lotNo" , pl."plantedOn" , pl."plantsCount", s.name "strainName"`;
            sqlFrom = ` FROM work_plan_master wpm , jsonb_to_recordset(wpm."locationIds") as location(id bigint, "subLocationId" bigint, "plantLotId" varchar), locations l, sub_locations sl, plant_lots pl, strains s`;
            sqlWhere = ` WHERE wpm.id = ${payload.id} AND wpm."orgId" = ${orgId} AND wpm."companyId" = ${selectedRecs.rows[0].companyId}`;
            sqlWhere += ` AND l.id = location."id" AND sl.id = location."subLocationId" AND pl."strainId" = s.id`;
            sqlWhere += ` AND pl.id in (select unnest(string_to_array(regexp_replace(location."plantLotId", '[\\[ \\]]', '', 'g'), ',')::bigint[]))`;
            sqlOrderBy = ` ORDER BY l.name, sl.name, pl."lotNo"`;
        }

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var workPlanLocations = await knexReader.raw(sqlStr);

        console.log('workplan: ', selectedRecs.rows[0].locationIds.find(r => r.id == 0));
        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
                workPlanLocations: workPlanLocations.rows,
                workPlanTasks: workPlanTasks.rows
            },
            message: "Work Plan detail!"
        });
        //

/* 
        sqlSelect = `SELECT wpm.*, c."companyName", p.name "plantationName"`;
        sqlFrom = ` FROM work_plan_master wpm, companies c, plantations p`;
        sqlWhere = ` WHERE wpm."orgId" = ${orgId} and wpm.id = ${payload.id} `;
        sqlWhere += ` AND wpm."companyId" = c.id AND wpm."orgId" = c."orgId"`;
        sqlWhere += ` AND wpm."plantationId" = p.id AND wpm."orgId" = p."orgId"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  Get Work Plan Tasks
        sqlSelect = `SELECT wpt.*`;
        sqlFrom = ` FROM work_plan_tasks wpt`;
        sqlWhere = ` WHERE wpt."workPlanMasterId" = ${payload.id} AND wpt."orgId" = ${orgId}`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var workPlanTasks = await knexReader.raw(sqlStr);

        //  Get Work Plan Selected Plantation Groups
        //  Checking if All Plantation Groups selected
        const allGroups = selectedRecs.rows[0].plantationGroupIds.find(r => r.id == 0);

        sqlSelect = `SELECT pg.id, pg.description, pp.description plantationPhaseDescription`;
        sqlFrom = ` FROM plantation_groups pg, plantation_phases pp`;
        if(allGroups){
            //  All Plantation Groups Selected
            sqlWhere = ` WHERE pg."orgId" = ${orgId} AND pg."companyId" = ${selectedRecs.rows[0].companyId} AND pg."plantationId" = ${selectedRecs.rows[0].plantationId}`;
            sqlWhere += ` AND pg."plantationPhaseId" = pp.id`;
        } else {
            //  Some Plantation Groups Selected
            sqlWhere = ` WHERE pg."orgId" = ${orgId} AND pg."companyId" = ${selectedRecs.rows[0].companyId} AND pg."plantationId" = ${selectedRecs.rows[0].plantationId}`;
            sqlWhere += ` AND pg."plantationPhaseId" = pp.id`;
            sqlWhere += ` AND pg.id in (`;
            sqlWhere += ` SELECT grp.id from work_plan_master wpm , jsonb_to_recordset(wpm."plantationGroupIds") as grp(id bigint) where wpm.id = ${payload.id}`;
            sqlWhere += `)`;
        }

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var workPlanGroups = await knexReader.raw(sqlStr);

        console.log('workplan: ', selectedRecs.rows[0].plantationGroupIds.find(r => r.id == 0));
        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
                workPlanGroups: workPlanGroups.rows,
                workPlanTasks: workPlanTasks.rows
            },
            message: "Work Plan detail!"
        });
 */
    } catch (err) {
        console.log("[controllers][work-plans][getWorkPlan] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getWorkPlan;
