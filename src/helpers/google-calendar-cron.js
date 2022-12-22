const moment = require('moment-timezone');
const Parallel = require('async-parallel');

const knexReader = require('../db/knex-reader');

const googleCalendarCronHelper = async () => {
    const currentTime = moment().valueOf();

    // Add 7 days to the current date
    const nextWeekDate = moment().add(7, 'days').valueOf();

    const activeWorkOrdersWithNoEvents = await knexReader('work_plan_schedule_assign_locations')
        .select(
            'work_plan_schedule_assign_locations.id',
            'work_plan_schedule_assign_locations.orgId',
            'google_calendar_events.googleCalEventId'
        )
        .innerJoin('work_plan_schedules', 'work_plan_schedule_assign_locations.workPlanScheduleId', 'work_plan_schedules.id')
        .innerJoin('work_plan_master', (qb) => {
            qb.on('work_plan_schedules.workPlanMasterId', '=', 'work_plan_master.id')
                .andOn('work_plan_master.isActive', '=', knexReader.raw('?', [true]))
        })
        .leftJoin('google_calendar_events', (qb) => {
            qb.on('work_plan_schedule_assign_locations.id', '=', 'google_calendar_events.eventEntityId')
                .andOn('google_calendar_events.eventEntityType', '=', knexReader.raw('?', ['work_order']));
        })
        .where('work_plan_schedule_assign_locations.workOrderDate', '>=', currentTime)
        .andWhere('work_plan_schedule_assign_locations.workOrderDate', '<=', nextWeekDate)
        .andWhere('google_calendar_events.googleCalEventId', null);


    const inActiveWorkOrdersWithEvents = await knexReader('work_plan_schedule_assign_locations')
        .select(
            'work_plan_schedule_assign_locations.id',
            'work_plan_schedule_assign_locations.orgId',
            'google_calendar_events.googleCalEventId'
        )
        .innerJoin('work_plan_schedules', 'work_plan_schedule_assign_locations.workPlanScheduleId', 'work_plan_schedules.id')
        .innerJoin('work_plan_master', (qb) => {
            qb.on('work_plan_schedules.workPlanMasterId', '=', 'work_plan_master.id')
                .andOn('work_plan_master.isActive', '=', knexReader.raw('?', [false]))
        })
        .innerJoin('google_calendar_events', (qb) => {
            qb.on('work_plan_schedule_assign_locations.id', '=', 'google_calendar_events.eventEntityId')
                .andOn('google_calendar_events.eventEntityType', '=', knexReader.raw('?', ['work_order']));
        });


    const cancelledWorkOrdersWithEvents = await knexReader('work_plan_schedule_assign_locations')
        .select(
            'work_plan_schedule_assign_locations.id',
            'work_plan_schedule_assign_locations.orgId',
            'google_calendar_events.googleCalEventId'
        )
        .innerJoin('google_calendar_events', (qb) => {
            qb.on('work_plan_schedule_assign_locations.id', '=', 'google_calendar_events.eventEntityId')
                .andOn('google_calendar_events.eventEntityType', '=', knexReader.raw('?', ['work_order']));
        })
        .where('work_plan_schedule_assign_locations.status', '=', knexReader.raw('?', 'C'));

    //Temporary code to test the cronjob without using queueHelper on localhost
    /*
    for(let i = 0; i < workOrdersWithNoEvents.length; i++) {
        const workOrder = workOrdersWithNoEvents[i];
        setTimeout(async () => {
            console.log('Adding Event --------------------------------------------------------------')
            await workOrderEventsHelper
                .addWorkOrderEvents(+workOrder.id, +workOrder.orgId);
        }, (i + 1) * 1000)
    }
    */

    // Import SQS Helper..
    const queueHelper = require('../helpers/queue');

    Parallel.setConcurrency(5);

    await Parallel.each(activeWorkOrdersWithNoEvents, async (workOrder) => {
        try {
            await queueHelper.addToQueue({
                workOrder: workOrder
            },
                'sync-calendar',
                'ADD_WORK_ORDER_CALENDAR_EVENT'
            );
        } catch (error) {
            console.log("[helpers][google-calendar-cron][googleCalendarCronHelper] Error: Some error in processing work order events", JSON.stringify(workOrder), error);
        }
    });

    await Parallel.each(inActiveWorkOrdersWithEvents, async (workOrder) => {
        try {
            await queueHelper.addToQueue({
                workOrder: workOrder
            },
                'sync-calendar',
                'DELETE_WORK_ORDER_CALENDAR_EVENT'
            );
        } catch (error) {
            console.log("[helpers][google-calendar-cron][googleCalendarCronHelper] Error: Some error in processing work order events", JSON.stringify(workOrder), error);
        }
    });

    await Parallel.each(cancelledWorkOrdersWithEvents, async (workOrder) => {
        try {
            await queueHelper.addToQueue({
                workOrder: workOrder
            },
                'sync-calendar',
                'DELETE_WORK_ORDER_CALENDAR_EVENT'
            );
        } catch (error) {
            console.log("[helpers][google-calendar-cron][googleCalendarCronHelper] Error: Some error in processing work order events", JSON.stringify(workOrder), error);
        }
    });

    Parallel.setConcurrency(0);

};

module.exports = googleCalendarCronHelper;