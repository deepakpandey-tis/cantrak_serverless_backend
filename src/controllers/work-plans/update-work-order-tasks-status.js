const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const googleCalendarSync = require('../../helpers/google-calendar-sync');

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

        const updatedWorkOrder = await knexReader
            .select(
                'work_plan_schedule_assign_locations.id',
                'work_plan_schedule_assign_locations.name AS templateName',
                'work_plan_schedule_assign_locations.workPlanScheduleId',
                'work_plan_schedule_assign_locations.displayId AS workOrderNumber',
                'work_plan_schedule_assign_locations.workOrderDate',
                'work_plan_schedule_assign_locations.status AS workOrderStatus',
                'work_plan_schedule_assign_locations.locationId',
                'work_plan_schedule_assign_locations.subLocationId',
                'work_plan_schedule_assign_locations.plantLotId',
                'work_plan_schedule_assign_locations.orgId',
                'work_plan_schedule_assign_locations.companyId',
                'locations.name AS locationName',
                'sub_locations.name AS subLocationName',
                'plant_lots.lotNo AS plantLotNumber',
                'plant_lots.plantedOn',
                'plant_lots.plantsCount',
                'strains.name AS strainName',
            )
            .from('work_plan_schedule_assign_locations')
            .innerJoin('work_plan_schedules', 'work_plan_schedule_assign_locations.workPlanScheduleId', 'work_plan_schedules.id')
            .leftJoin('locations', 'work_plan_schedule_assign_locations.locationId', 'locations.id')
            .leftJoin('sub_locations', 'work_plan_schedule_assign_locations.subLocationId', 'sub_locations.id')
            .leftJoin('plant_lots', 'work_plan_schedule_assign_locations.plantLotId', 'plant_lots.id')
            .leftJoin('strains', 'plant_lots.strainId', 'strains.id')
            .where('work_plan_schedule_assign_locations.id', payload.workOrderTasks[0].workPlanScheduleAssignLocationId)
            .first();

        const tasks = await knexReader('work_plan_schedule_location_tasks')
            .where('work_plan_schedule_location_tasks.workPlanScheduleAssignLocationId', payload.workOrderTasks[0].workPlanScheduleAssignLocationId)
            .orderBy('serialNumber');

        updatedWorkOrder.tasks = tasks;

        const eventTitle = `${updatedWorkOrder.templateName} for work order #${updatedWorkOrder.workOrderNumber}`;
        const eventDescription = `
            <table>
                <tbody>
                    <tr>
                        <th>Work Order No.</th>
                        <td>${updatedWorkOrder.workOrderNumber}</td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td>${updatedWorkOrder.workOrderStatus === 'O' ? 'Open' : 'Completed'}</td>
                    </tr>
                    <tr>
                        <th>Growing Location</th>
                        <td>${updatedWorkOrder.locationName}</td>
                    </tr>
                        ${
                            updatedWorkOrder.subLocationName 
                            ? 
                            `
                            <tr>
                                <th>Sub Growing Location:</th>
                                <td>${updatedWorkOrder.subLocationName}</td>
                            </tr>
                            `
                            : ''
                        }
                        ${
                            updatedWorkOrder.plantLotNumber 
                            ? 
                            `
                            <tr>
                                <th>Plant Lot No.:</th>
                                <td>${updatedWorkOrder.plantLotNumber}</td>
                            </tr>
                            <tr>
                                <th>Strain:</th>
                                <td>${updatedWorkOrder.strainName}</td>
                            </tr>
                            <tr>
                                <th>Planted Date:</th>
                                <td>${new Date(Number(updatedWorkOrder.plantedOn)).toLocaleDateString('en-TH', {year: 'numeric', month: 'long', day: 'numeric'})}</td>
                            </tr>
                            <tr>
                                <th>No. of Plants:</th>
                                <td>${updatedWorkOrder.plantsCount}</td>
                            </tr>
                            `
                            : ''
                        }
                </tbody>
            </table>
            <strong>Work Order Tasks:</strong>
            <table>
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>WO Tasks</th>
                        <th>Durations (Hrs.)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                        ${
                            updatedWorkOrder.tasks.map(task => (
                                `
                                    <tr>
                                        <td>${task.serialNumber}</td>
                                        <td>${task.name}</td>
                                        <td>${task.duration}</td>
                                        <td>${task.status === 'O' ? 'Open' : 'Completed'}</td>
                                    </tr>
                                `
                            )).join('')
                        }
                </tbody>
            </table>
        `;

        const eventStartDate = new Date(new Date(Number(updatedWorkOrder.workOrderDate)).setHours(8, 00)).toISOString();
        const eventEndDate = new Date(new Date(Number(updatedWorkOrder.workOrderDate)).setHours(23, 59)).toISOString();

        const assignedServiceTeam = await knexReader('assigned_service_team')
            .where({
                orgId: orgId,
                entityType: 'work_order',
                entityId: payload.workOrderTasks[0].workPlanScheduleAssignLocationId
            }).first();

        const assignedServiceAdditionalUsers = await knexReader('assigned_service_additional_users')
            .where({
                orgId: orgId,
                entityType: 'work_order',
                entityId: payload.workOrderTasks[0].workPlanScheduleAssignLocationId
            });


        // Add event to new main user's calendar
        googleCalendarSync.updateEventInCalendar(
            +assignedServiceTeam.userId,
            +orgId,
            eventTitle,
            eventDescription,
            eventStartDate,
            eventEndDate,
            assignedServiceTeam.entityType,
            +assignedServiceTeam.entityId
            ).catch((error) => { 
            console.log(error);
            });
    
            // Add event to new additional users' calendar
        if(assignedServiceAdditionalUsers && assignedServiceAdditionalUsers.length > 0) {
            for(let user of assignedServiceAdditionalUsers) {
                googleCalendarSync.updateEventInCalendar(
                +user.userId,
                +orgId,
                eventTitle,
                eventDescription,
                eventStartDate,
                eventEndDate,
                user.entityType,
                +user.entityId
                ).catch((error) => { 
                console.log(error);
                });
            }
        }

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
