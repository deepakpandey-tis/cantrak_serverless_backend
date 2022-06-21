const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const updateWorkPlan = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let taskNo;
        let insertTask = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            name: Joi.string().required(),
            companyId: Joi.string().required(),
            entityTypeId: Joi.number().required(),
            locationIds: Joi.array().required(),
            // plantationId: Joi.string().required(),
            // plantationGroupIds: Joi.array().required(),
            tasks: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][work-plans]updateWorkPlan: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        // Check already exists
        const alreadyExists = await knexReader("work_plan_master")
            .where(qb => {
                qb.where('name', 'iLIKE', payload.name)
            })
            .where({ orgId: req.orgId })
            .where({ companyId: payload.companyId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][work-plans][updateWorkPlan]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Work Plan already exist!" }
                ]
            });
        }

        const {tasks, ...workPlanMaster} = req.body;
        let currentTime = new Date().getTime();

        await knex.transaction(async (trx) => {
            let insertData = {
                companyId: payload.companyId,
                // plantationId: payload.plantationId,
                name: payload.name,
                // plantationGroupIds: payload.plantationGroupIds,
                locationIds: payload.locationIds,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('work plan update record: ', insertData);

            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into('work_plan_master');

            insertedRecord = insertResult[0];

            //  Delete existing tasks
            let delRecs = await knex('work_plan_tasks')
                .where({ workPlanMasterId: payload.id, orgId: orgId })
                .transacting(trx)
                .del();

            //  Add Tasks
            taskNo = 0;
            for(let task of tasks){
              taskData = {
                orgId: orgId,
                workPlanMasterId: payload.id,
                ...task, 
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
              };
              console.log('task: ', taskData);
  
              const insertResult = await knex
              .insert(taskData)
              .returning(["*"])
              .transacting(trx)
              .into("work_plan_tasks");
  
              insertTask[taskNo] = insertResult[0];
              taskNo += 1;
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                workPlanTasks: insertTask,
            },
            message: 'Template updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][updateWorkPlan] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateWorkPlan;

/**
 */
