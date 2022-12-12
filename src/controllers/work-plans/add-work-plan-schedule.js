const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const googleCalendarSync = require('../../helpers/google-calendar-sync');

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

        const workOrdersMainUser = await knexReader
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
                'assigned_service_team.userId',
                'assigned_service_team.entityId'
            )
            .from('work_plan_schedule_assign_locations')
            .innerJoin('work_plan_schedules', 'work_plan_schedule_assign_locations.workPlanScheduleId', 'work_plan_schedules.id')
            .leftJoin('locations', 'work_plan_schedule_assign_locations.locationId', 'locations.id')
            .leftJoin('sub_locations', 'work_plan_schedule_assign_locations.subLocationId', 'sub_locations.id')
            .leftJoin('plant_lots', 'work_plan_schedule_assign_locations.plantLotId', 'plant_lots.id')
            .leftJoin('strains', 'plant_lots.strainId', 'strains.id')
            .innerJoin('assigned_service_team', function() {
                this
                    .on('assigned_service_team.entityType', '=',  knexReader.raw('?', ['work_order']))
                    .andOn('assigned_service_team.entityId', '=', 'work_plan_schedule_assign_locations.id')
            })
            .where('work_plan_schedule_assign_locations.workPlanScheduleId', insertedRecord.id)
            .andWhere('work_plan_schedule_assign_locations.createdAt', '>=', currentTime );

        for(const workOrder of workOrdersMainUser) {
            const tasks = await knexReader('work_plan_schedule_location_tasks')
            .where('work_plan_schedule_location_tasks.workPlanScheduleAssignLocationId', workOrder.id);
            workOrder.tasks = tasks;
        }

        console.log(
            "[controllers][work-plans][addWorkPlanSchedule]: work-orders events main users", workOrdersMainUser
        );


        const workOrdersAdditionalUsers = await knexReader
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
                'assigned_service_additional_users.userId',
                'assigned_service_additional_users.entityId'
            )
            .from('work_plan_schedule_assign_locations')
            .innerJoin('work_plan_schedules', 'work_plan_schedule_assign_locations.workPlanScheduleId', 'work_plan_schedules.id')
            .leftJoin('locations', 'work_plan_schedule_assign_locations.locationId', 'locations.id')
            .leftJoin('sub_locations', 'work_plan_schedule_assign_locations.subLocationId', 'sub_locations.id')
            .leftJoin('plant_lots', 'work_plan_schedule_assign_locations.plantLotId', 'plant_lots.id')
            .leftJoin('strains', 'plant_lots.strainId', 'strains.id')
            .innerJoin('assigned_service_additional_users', function() {
                this
                    .on('assigned_service_additional_users.entityType', '=',  knexReader.raw('?', ['work_order']))
                    .andOn('assigned_service_additional_users.entityId', '=', 'work_plan_schedule_assign_locations.id')
            })
            .where('work_plan_schedule_assign_locations.workPlanScheduleId', insertedRecord.id)
            .andWhere('work_plan_schedule_assign_locations.createdAt', '>=', currentTime );

        for(const workOrder of workOrdersAdditionalUsers) {
            const tasks = await knexReader('work_plan_schedule_location_tasks')
            .where('work_plan_schedule_location_tasks.workPlanScheduleAssignLocationId', workOrder.id);
            workOrder.tasks = tasks;
        }

        console.log(
            "[controllers][work-plans][addWorkPlanSchedule]: work-orders events additional users", workOrdersAdditionalUsers
        );

        // Add events to calendar of main users of work orders.
        for(let i = 0; i < workOrdersMainUser.length; i++) {
            // Added setTimeout to avoid getting rate limiting errors when adding multiple events at once.
            setTimeout(() => {
                const workOrder = workOrdersMainUser[i];
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
                googleCalendarSync
                    .addEventToCalendar(
                        Number(workOrder.userId),
                        orgId,
                        eventTitle,
                        eventDescription,
                        eventStartDate,
                        eventEndDate,
                        'work_order',
                        Number(workOrder.entityId),
                        'single'
                    )
                    .catch(error => console.log(error));
            }, 1000 * (i + 1));
        }

        // Add events to calendar of additional users of work orders.
        for(let i = 0; i < workOrdersAdditionalUsers.length; i++) {
            // Added setTimeout to avoid getting rate limiting errors when adding multiple events at once.
            setTimeout(() => {
                const workOrder = workOrdersAdditionalUsers[i];
                console.log(workOrder.plantedOn);
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
                                                <td>${task.status === 'O' ? 'Open' : 'Completed' }</td>
                                            </tr>
                                        `
                                    )).join('')
                                }
                        </tbody>
                    </table>
                `;
                const eventStartDate = new Date(new Date(Number(workOrder.workOrderDate)).setHours(8, 00)).toISOString();
                const eventEndDate = new Date(new Date(Number(workOrder.workOrderDate)).setHours(23, 59)).toISOString();
                googleCalendarSync
                .addEventToCalendar(
                    Number(workOrder.userId),
                    orgId,
                    eventTitle,
                    eventDescription,
                    eventStartDate,
                    eventEndDate,
                    'work_order',
                    Number(workOrder.entityId),
                    'single'
                    )
                    .catch(error => console.log(error));
            }, 1000 * (i + 1))
        }

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
