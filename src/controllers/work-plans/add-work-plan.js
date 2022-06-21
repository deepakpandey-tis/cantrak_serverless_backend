const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const addWorkPlan = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;
        console.log(
            "[controllers][work-plans][addWorkPlan]: payload", payload
        );

        let insertedRecord = [];
        let taskNo;
        let insertTask = [];

        const schema = Joi.object().keys({
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
            "[controllers][work-plans][addWorkPlan]: JOi Result",
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
                qb.where('name', 'iLIKE', payload.name.trim())
            })
            .where({ orgId: req.orgId })
            .where({ companyId: payload.companyId });

        console.log(
            "[controllers][work-plans][addWorkPlan]: ",
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
        let insertData = {
            orgId: orgId,
            ...workPlanMaster,
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('work plan insert record: ', insertData);

        await knex.transaction(async (trx) => {
            const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("work_plan_master");

            insertedRecord = insertResult[0];

            //  Tasks
            taskNo = 0;
            for(let task of tasks){
              taskData = {
                orgId: orgId,
                workPlanMasterId: insertedRecord.id,
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
            message: 'Template added successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][addWorkPlan] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addWorkPlan;

/**
 */
