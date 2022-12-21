const knex = require('../db/knex');
const knexReader = require('../db/knex-reader');
const moment = require('moment-timezone');
const Parallel = require('async-parallel');

const googleCalendarCronHelper = async () => {
    const currentTime = moment().valueOf();

    // Add 7 days to the current date
    const nextWeekDate = moment().add(7, 'days').valueOf();

    // const workOrdersRaw = await knex.raw(`
    // select "work_plan_schedule_assign_locations"."id", "work_plan_schedule_assign_locations"."orgId", "google_calendar_events"."googleCalEventId" from "work_plan_schedule_assign_locations" left join "google_calendar_events" on "work_plan_schedule_assign_locations"."id" = "google_calendar_events"."eventEntityId" and "google_calendar_events"."eventEntityType" = ? where "work_plan_schedule_assign_locations"."workOrderDate" >= ? and "work_plan_schedule_assign_locations"."workOrderDate" <= ? and "google_calendar_events"."googleCalEventId" is null
    // `, ['work_order', currentTime, nextWeekDate]);
  
    // const workOrdersWithNoEvents = workOrdersRaw.rows;

    // console.log(workOrdersWithNoEvents);

    // const workOrders = await knexReader('work_plan_master')
    //     .select('work_plan_schedule_assign_locations.id', 'work_plan_schedule_assign_locations.orgId')
    //     .innerJoin('work_plan_schedules', 'work_plan_master.id', 'work_plan_schedules.workPlanMasterId')
    //     .innerJoin('work_plan_schedule_assign_locations', 'work_plan_schedules.id', 'work_plan_schedule_assign_locations.workPlanScheduleId')
    //     .innerJoin('google_calendar_events', function () {
    //         this.on('work_plan_schedule_assign_locations.id', '=', 'google_calendar_events.eventEntityId')
    //             .andOn('google_calendar_events.eventEntityType', '=', knexReader.raw('?', ['work_order']));
    //     })
    //     .where('work_plan_master.id', payload.id)
    //     .andWhere('work_plan_master.orgId', orgId);

    const workOrdersWithNoEvents = await knexReader('work_plan_schedule_assign_locations')
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
  
    /*
    //Temporary code to test the cronjob with using queueHelper
    for(let i = 0; i < workOrdersWithNoEvents.length; i++) {
        const workOrder = workOrdersWithNoEvents[i];
        setTimeout(async () => {
            console.log('Adding Event --------------------------------------------------------------')
            await workOrderEventsHelper
                .addWorkOrderEvents(+workOrder.id, +workOrder.orgId);
        }, (i + 1) * 1000)
    }
    */
  
      const workOrdersChunks = [];
      const chunkSize = 20;
  
      for(let i = 0; i < workOrdersWithNoEvents.length; i += chunkSize) {
          workOrdersChunks.push(workOrdersWithNoEvents.slice(i, i + chunkSize));
      }

      let delayInSeconds = 0;
  
      // Import SQS Helper..
      const queueHelper = require('../helpers/queue');
      
      Parallel.setConcurrency(0);

      await Parallel.each(workOrdersChunks, async (workOrdersChunk) => {
          try {
              if (delayInSeconds < 900) {
                  delayInSeconds += 30;
                  await queueHelper.addToQueue({
                      workOrderChunk: workOrdersChunk
                  },
                  'long-jobs',
                  'ADD_WORK_ORDER_CALENDAR_EVENT',
                  delayInSeconds
                  );
              } else {
                  console.log("[helpers][google-calendar-cron][googleCalendarCronHelper] Error: Skipping adding events to calendar, delay time exceeded 900 seconds");
              }
          } catch (error) {
              console.log("[helpers][google-calendar-cron][googleCalendarCronHelper] Error: Some error in processing work orders events chunks", JSON.stringify(workOrderChunk), error);
          }
      });
};

module.exports = googleCalendarCronHelper;