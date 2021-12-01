const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updateWorkOrderTasksStatus = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;

    const payload = req.body;

    let insertWorkOrder = [];
    let insertedRecord = [];

    const schema = Joi.object().keys({
        workOrderTasks: Joi.array().required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][work-plans]updateWorkOrderTasksStatus: JOi Result",
        result
    );

    if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
            errors: [
                { code: "VALIDATION_ERROR", message: result.error.message }
            ]
        });
    }

    let currentTime = new Date().getTime();
    try {

        await knex.transaction(async (trx) => {

            let workOrderTaskData;
            for (let woTask of payload.workOrderTasks){
                if(woTask.status != woTask.desireValue){
                    if(woTask.desireValue == 'O'){
                        workOrderTaskData = {
                            status: woTask.desireValue,
                            result: 1,                // forced set to normal
                            inputValue: woTask.inputValue,
                            completedBy: null,
                            completedAt: null,
                            updatedBy: userId,
                            updatedAt: currentTime,
                        };
                    } else {
                        workOrderTaskData = {
                            status: woTask.desireValue,
                            result: woTask.desireResult,
                            inputValue: woTask.inputValue,
                            completedBy: userId,
                            completedAt: currentTime,
                        };
                    }
                    console.log('work order update record: ', workOrderTaskData);

                    const insertResult = await knex
                        .update(workOrderTaskData)
                        .where({ id: woTask.id, orgId: orgId })
                        .returning(["*"])
                        .transacting(trx)
                        .into('work_plan_schedule_location_tasks');

                    insertedRecord.push(insertResult[0]);
                }
            }

            let openTasks = payload.workOrderTasks.filter(r => r.desireValue == 'O').length;
            //  console.log('open tasks: ', openTasks);
            if(openTasks <= 0){
                let completedTasks = payload.workOrderTasks.filter(r => r.status == 'COM' || r.desireValue == 'COM').length;
                //  console.log('completed tasks: ', completedTasks);
                if(payload.workOrderTasks.length == completedTasks){
                    //  console.log('all tasks completed');
                    workOrderData = {
                        status: 'COM',
                        completedBy: userId,
                        completedAt: currentTime,
                    };
                    console.log('work order update record: ', workOrderData);

                    const insertResult = await knex
                        .update(workOrderData)
                        .where({ id: payload.workOrderTasks[0].workPlanScheduleAssignLocationId, orgId: orgId })
                        .returning(["*"])
                        .transacting(trx)
                        .into('work_plan_schedule_assign_locations');

                        insertWorkOrder = insertResult[0];
                }
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertWorkOrder,
                workOrderTasks: insertedRecord,
            },
            message: 'Work Order Task status updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][updateWorkOrderTasksStatus] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateWorkOrderTasksStatus;

/**
 */
