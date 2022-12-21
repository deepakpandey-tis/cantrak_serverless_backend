const Joi = require("@hapi/joi");
const moment = require("moment-timezone");
const Parallel = require('async-parallel');
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const workOrderEventsHelper = require('../../helpers/work-order-events');

const addWorkPlanSchedule = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;
        console.log(
            "[controllers][work-plans][addWorkPlanSchedule]: payload", payload
        );

        let insertedRecord = [];
        let woNo, woTaskNo, woAdditionalUserNo;
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
                    // ...wo,
                    companyId: wo.companyId,
                    name: wo.name,
                    entityTypeId: wo.entityTypeId,
                    locationId: wo.locationId,
                    subLocationId: wo.entityTypeId == EntityTypes.WorkPlanGrowingLocation ? null : wo.subLocationId,
                    plantLotId: wo.entityTypeId == EntityTypes.WorkPlanPlantLot ? wo.plantLotId : null,
                    frequencyTag: wo.frequencyTag,
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

                //  Location Work Order Team
                let insertTeamData = {
                    orgId: orgId,
                    entityId: insertedWorkOrders[woNo].id,
                    entityType: 'work_order',
                    teamId: wo.teamId,
                    userId: wo.userId,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('work order team insert record: ', insertTeamData);

                const insertTeamResult = await knex
                    .insert(insertTeamData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("assigned_service_team");

                insertedWorkOrders[woNo].team = insertTeamResult[0];
        
                //  Location Work Order Additional Users
                woAdditionalUserNo = 0;
                insertedWorkOrders[woNo].additionalUsers = [];
                if(wo.additionalUsersId != null){
                    for (let woAUId of wo.additionalUsersId) {
                        workOrderAdditionalUserData = {
                            orgId: orgId,
                            entityId: insertedWorkOrders[woNo].id,
                            entityType: 'work_order',
                            userId: woAUId,
                            createdAt: currentTime,
                            updatedAt: currentTime,
                        };
                        console.log('work order additional user insert record: ', workOrderAdditionalUserData);

                        const insertAdditionaUserResult = await knex
                            .insert(workOrderAdditionalUserData)
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_service_additional_users");

                        insertedWorkOrders[woNo].additionalUsers[woAdditionalUserNo] = insertAdditionaUserResult[0];
                        woAdditionalUserNo += 1;
                    }
                }

                //  Location Work Order Tasks
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

        moment.tz.setDefault('Asia/Bangkok');

        const today = moment(currentTime).set({
            hour: 0,
            minute: 0,
            second: 0
        }).valueOf();

        // Add 7 days to the current date
        const nextWeekDate = today + 7 * 24 * 60 * 60 * 1000;

        const workOrdersNew = await knexReader('work_plan_schedule_assign_locations')
            .select('work_plan_schedule_assign_locations.id', 'work_plan_schedule_assign_locations.orgId')
            .innerJoin('work_plan_schedules', 'work_plan_schedule_assign_locations.workPlanScheduleId', 'work_plan_schedules.id')
            .where('work_plan_schedule_assign_locations.workPlanScheduleId', insertedRecord.id)
            .andWhere('work_plan_schedule_assign_locations.createdAt', '>=', currentTime )
            .andWhere('work_plan_schedule_assign_locations.workOrderDate', '<=', nextWeekDate);

        
        // Temporary code to test adding multiple work order events without using queueHelper
        /*
        for(let i = 0; i < workOrdersNew.length; i++) {
            const workOrder = workOrdersNew[i];
            setTimeout(async () => {
                await workOrderEventsHelper
                    .addWorkOrderEvents(+workOrder.id, +orgId);
            }, (i + 1) * 1000)
        }
        */
       
        const workOrdersChunks = [];
        const chunkSize = 20;

        for(let i = 0; i < workOrdersNew.length; i += chunkSize) {
            workOrdersChunks.push(workOrdersNew.slice(i, i + chunkSize));
        }

        // Import SQS Helper..
        const queueHelper = require('../../helpers/queue');

        let delayInSeconds = 0;

        Parallel.setConcurrency(0);

        await Parallel.each(workOrdersChunks, async (workOrderChunk) => {
            try {
                if (delayInSeconds < 900) {
                    delayInSeconds += 30;
                    await queueHelper.addToQueue({
                        workOrderChunk: workOrderChunk
                    },
                    'long-jobs',
                    'ADD_WORK_ORDER_CALENDAR_EVENT',
                    delayInSeconds
                    );
                } else {
                    console.log("[controllers][work-plans][addWorkPlanSchedule] Error: Skipping adding work orders events to calendar, delay time exceeded 900 seconds");
                }
            } catch(error) {
                console.log("[controllers][work-plans][addWorkPlanSchedule] Error: Some error in processing work orders events chunks", JSON.stringify(workOrderChunk), error);
            }
        });
        
                        
        return res.status(200).json({
            data: {
                record: insertedRecord,
                workOrders: insertedWorkOrders,
                workOrderTasks: insertedWorkOrderTasks,
            },
            message: 'Work Plan Schedule / Work Order added successfully.'
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
