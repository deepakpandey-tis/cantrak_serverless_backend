const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const googleCalendarSync = require('../../helpers/google-calendar-sync');


const uncancelWorkOrder = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;

    const payload = req.body;

    let insertedRecord = [];

    const schema = Joi.object().keys({
        id: Joi.string().required(),
        uncancelReason: Joi.string().required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][work-plans]uncancelWorkOrder: JOi Result",
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
            let insertData = {
                entityId: payload.id,
                entityType: "work-orders",
                description: payload.uncancelReason,
                orgId: req.orgId,
                createdBy: req.me.id,
                createdAt: currentTime,
                updatedAt: currentTime,
            };
            console.log('uncancel work order reason record: ', insertData);

            const insertRemarkResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("remarks_master");

            insertData = {
                status: "O",
                cancelledBy: userId,
                cancelledAt: currentTime,
            };
            console.log('uncancel work order record: ', insertData);

            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into('work_plan_schedule_assign_locations');

            insertedRecord = insertResult[0];

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
            .where('work_plan_schedule_assign_locations.id', payload.id)
            .first();

        const tasks = await knexReader('work_plan_schedule_location_tasks')
            .where('work_plan_schedule_location_tasks.workPlanScheduleAssignLocationId', updatedWorkOrder.id);

        updatedWorkOrder.tasks = tasks;

        const assignedServiceTeam = await knexReader('assigned_service_team')
            .where({
                orgId: orgId,
                entityType: 'work_order',
                entityId: payload.id
            }).first();

        const assignedServiceAdditionalUsers = await knexReader('assigned_service_additional_users')
            .where({
                orgId: orgId,
                entityType: 'work_order',
                entityId: payload.id
            });

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

        // Add event to new main user's calendar
        googleCalendarSync.addEventToCalendar(
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
                googleCalendarSync.addEventToCalendar(
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
                record: insertedRecord,
            },
            message: 'Work Order uncancelled successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][uncancelWorkOrder] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = uncancelWorkOrder;

/**
 */
