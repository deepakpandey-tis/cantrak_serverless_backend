const knexReader = require('../db/knex-reader');

const googleCalendarSync = require('./google-calendar-sync');

const getWorkOrderEventData = (workOrder) => {
    const eventTitle = `${workOrder.templateName} for work order #${workOrder.workOrderNumber}`;
    const eventDescription = `
        <table>
            <tbody>
                <tr>
                    <th>Work Order No.</th>
                    <td>${workOrder.workOrderNumber}</td>
                </tr>
                <tr>
                    <th>Status</th>
                    <td>${workOrder.workOrderStatus === 'O' ? 'Open' : 'Completed'}</td>
                </tr>
                <tr>
                    <th>Growing Location</th>
                    <td>${workOrder.locationName}</td>
                </tr>
                    ${
                        workOrder.subLocationName 
                        ? 
                        `
                        <tr>
                            <th>Sub Growing Location:</th>
                            <td>${workOrder.subLocationName}</td>
                        </tr>
                        `
                        : ''
                    }
                    ${
                        workOrder.plantLotNumber 
                        ? 
                        `
                        <tr>
                            <th>Plant Lot No.:</th>
                            <td>${workOrder.plantLotNumber}</td>
                        </tr>
                        <tr>
                            <th>Strain:</th>
                            <td>${workOrder.strainName}</td>
                        </tr>
                        <tr>
                            <th>Planted Date:</th>
                            <td>${new Date(Number(workOrder.plantedOn)).toLocaleDateString('en-TH', {year: 'numeric', month: 'long', day: 'numeric'})}</td>
                        </tr>
                        <tr>
                            <th>No. of Plants:</th>
                            <td>${workOrder.plantsCount}</td>
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
                        workOrder.tasks.map(task => (
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

    const eventStartDate = new Date(new Date(Number(workOrder.workOrderDate)).setHours(8, 00)).toISOString();
    const eventEndDate = new Date(new Date(Number(workOrder.workOrderDate)).setHours(23, 59)).toISOString();

    return {
        eventTitle,
        eventDescription,
        eventStartDate,
        eventEndDate
    };
};

const workOrderEventsHelper = {
    addWorkOrderEvents: async (workOrderId, orgId) => {
        try {
            const workOrder = await knexReader
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
                .where('work_plan_schedule_assign_locations.id', workOrderId)
                .andWhere('work_plan_schedule_assign_locations.orgId', orgId)
                .first();

            const tasks = await knexReader('work_plan_schedule_location_tasks')
                .where('work_plan_schedule_location_tasks.workPlanScheduleAssignLocationId', workOrderId)
                .andWhere('work_plan_schedule_location_tasks.orgId', orgId)
                .orderBy('serialNumber');

            workOrder.tasks = tasks;

            const assignedServiceTeam = await knexReader('assigned_service_team')
                .where({
                    orgId: orgId,
                    entityType: 'work_order',
                    entityId: workOrderId
                }).first();

            const assignedServiceAdditionalUsers = await knexReader('assigned_service_additional_users')
                .where({
                    orgId: orgId,
                    entityType: 'work_order',
                    entityId: workOrderId
                });

            const { eventTitle, eventDescription, eventStartDate, eventEndDate } = getWorkOrderEventData(workOrder);

            // Add event to main user's calendar
            await googleCalendarSync.addEventToCalendar(
                    +assignedServiceTeam.userId,
                    +orgId,
                    eventTitle,
                    eventDescription,
                    eventStartDate,
                    eventEndDate,
                    assignedServiceTeam.entityType,
                    +assignedServiceTeam.entityId
                );
        
            // Add event to additional users' calendar
            if(assignedServiceAdditionalUsers && assignedServiceAdditionalUsers.length > 0) {
                for(let user of assignedServiceAdditionalUsers) {
                    await googleCalendarSync.addEventToCalendar(
                        +user.userId,
                        +orgId,
                        eventTitle,
                        eventDescription,
                        eventStartDate,
                        eventEndDate,
                        user.entityType,
                        +user.entityId
                    );
                }
            }

        } catch(error) {
            console.error("[helpers][work-order-events][workOrderEventsHelper][addWorkOrderEvent]: [Error]", error);
            return {
                error: {
                    code: "UNKNOWN_SERVER_ERROR",
                    message: error.message,
                    error: new Error(error.message)
                }
            }
        }

    },

    updateWorkOrderEvents: async (workOrderId, orgId) => {
        try {
            const workOrder = await knexReader
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
                .where('work_plan_schedule_assign_locations.id', workOrderId)
                .andWhere('work_plan_schedule_assign_locations.orgId', orgId)
                .first();

            const tasks = await knexReader('work_plan_schedule_location_tasks')
                .where('work_plan_schedule_location_tasks.workPlanScheduleAssignLocationId', workOrderId)
                .andWhere('work_plan_schedule_location_tasks.orgId', orgId)
                .orderBy('serialNumber');

            workOrder.tasks = tasks;

            const assignedServiceTeam = await knexReader('assigned_service_team')
                .where({
                    orgId: orgId,
                    entityType: 'work_order',
                    entityId: workOrderId
                }).first();

            const assignedServiceAdditionalUsers = await knexReader('assigned_service_additional_users')
                .where({
                    orgId: orgId,
                    entityType: 'work_order',
                    entityId: workOrderId
                });

            const { eventTitle, eventDescription, eventStartDate, eventEndDate } = getWorkOrderEventData(workOrder);

            // Uodate event in main user's calendar
            await googleCalendarSync.updateEventInCalendar(
                    +assignedServiceTeam.userId,
                    +orgId,
                    eventTitle,
                    eventDescription,
                    eventStartDate,
                    eventEndDate,
                    assignedServiceTeam.entityType,
                    +assignedServiceTeam.entityId
                );

            // Update event in additional users' calendar
            if(assignedServiceAdditionalUsers && assignedServiceAdditionalUsers.length > 0) {
                for(let user of assignedServiceAdditionalUsers) {
                    await googleCalendarSync.updateEventInCalendar(
                        +user.userId,
                        +orgId,
                        eventTitle,
                        eventDescription,
                        eventStartDate,
                        eventEndDate,
                        user.entityType,
                        +user.entityId
                    );
                }
            }
        } catch (error) {
            console.error("[helpers][work-order-events][workOrderEventsHelper][addWorkOrderEvent]: [Error]", error);
            return {
                error: {
                    code: "UNKNOWN_SERVER_ERROR",
                    message: error.message,
                    error: new Error(error.message)
                }
            }
        }
    },

    deleteWorkOrderEvents: async (workOrderId, orgId) => {
        const workOrderEventsInDB = await knexReader('google_calendar_events')
            .where({
                orgId: orgId,
                eventEntityId: workOrderId,
                eventEntityType: 'work_order'
            });
        
        for(const workOrderEvent of workOrderEventsInDB) {
            await googleCalendarSync.deleteEventFromCalendar(
                +workOrderEvent.userId,
                +orgId,
                'work_order',
                workOrderEvent.eventEntityId
            )
        }
    }
};

module.exports = workOrderEventsHelper;