const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const addWorkPlanSchedule = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;
        console.log(
            "[controllers][work-plans][addWorkPlanSchedule]: payload", payload
        );

        let insertedRecord = [];
        let woNo, woTaskNo;
        let insertedWorkOrders = [];
        let insertedWorkOrderTasks = [];

        /*         const schema = Joi.object().keys({
                    name: Joi.string().required(),
                    companyId: Joi.string().required(),
                    plantationId: Joi.string().required(),
                    plantationGroupIds: Joi.array().required(),
                    tasks: Joi.array().required(),
                });
        
                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][work-plans][addWorkPlanSchedule]: JOi Result",
                    result
                );
        
                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }
         */
        const { workOrders, workOrderTasks, schedule } = req.body;
        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...schedule,
            startDate: new Date(schedule.startDate).getTime(),
            endDate: new Date(schedule.endDate).getTime(),
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('work plan schedule insert record: ', insertData);

        await knex.transaction(async (trx) => {
            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("work_plan_schedules");

            insertedRecord = insertResult[0];

            //  Location Work Order
            woNo = 0;
            for (let wo of workOrders) {
                workOrderData = {
                    orgId: orgId,
                    workPlanScheduleId: insertedRecord.id,
                    ...wo,
                    workOrderDate: new Date(wo.workOrderDate).getTime(),
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('work order insert record: ', workOrderData);

                const insertResult = await knex
                    .insert(workOrderData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("work_plan_schedule_assign_locations");

                insertedWorkOrders[woNo] = insertResult[0];

                //  Location Work Ordr Tasks
                woTaskNo = 0;
                for (let woTask of workOrderTasks) {
                    workOrderTaskData = {
                        orgId: orgId,
                        workPlanScheduleAssignLocationId: insertedWorkOrders[woNo].id,
                        ...woTask,
                        createdBy: userId,
                        createdAt: currentTime,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('work order task insert record: ', workOrderTaskData);

                    const insertResult = await knex
                        .insert(workOrderTaskData)
                        .returning(["*"])
                        .transacting(trx)
                        .into("work_plan_schedule_location_tasks");

                        insertedWorkOrderTasks[woTaskNo] = insertResult[0];
                    woTaskNo += 1;
                }

                // Next Assigned Location (Work Order)
                woNo += 1;
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                workOrders: insertedWorkOrders,
                workOrderTasks: insertedWorkOrderTasks,
            },
            message: 'Work Plan Schedule added successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][addWorkPlanSchedule] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addWorkPlanSchedule;

/**
 */
