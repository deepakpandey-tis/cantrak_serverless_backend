const knex = require('../db/knex');
const knexReader = require('../db/knex-reader');
const moment = require('moment-timezone');

const googleCalendarCronHelper = async () => {
    const currentTime = moment().valueOf();

    // Add 7 days to the current date
    const nextWeekDate = moment().add(7, 'days').valueOf();

    const workOrdersRaw = await knex.raw(`
    select "work_plan_schedule_assign_locations"."id", "work_plan_schedule_assign_locations"."orgId", "google_calendar_events"."googleCalEventId" from "work_plan_schedule_assign_locations" left join "google_calendar_events" on "work_plan_schedule_assign_locations"."id" = "google_calendar_events"."eventEntityId" and "google_calendar_events"."eventEntityType" = ? where "work_plan_schedule_assign_locations"."workOrderDate" >= ? and "work_plan_schedule_assign_locations"."workOrderDate" <= ? and "google_calendar_events"."googleCalEventId" is null
    `, ['work_order', currentTime, nextWeekDate]);
  
    const workOrdersWithNoEvents = workOrdersRaw.rows;

    console.log(workOrdersWithNoEvents);
    // const workOrdersWithNoEvents = await knexReader('work_plan_schedule_assign_locations')
    //   .select(
    //     'work_plan_schedule_assign_locations.id', 
    //     'work_plan_schedule_assign_locations.orgId', 
    //     'google_calendar_events.googleCalEventId'
    //   )
    //   .leftJoin('google_calendar_events', (qb) => {
    //     qb.on('work_plan_schedule_assign_locations.id', '=', 'google_calendar_events.eventEntityId')
    //     .andOn('google_calendar_events.eventEntityType', '=', knexReader.raw('?', ['work_order']));
    //   })
    //   .where('work_plan_schedule_assign_locations.workOrderDate', '>=', currentTime)
    //   .andWhere('work_plan_schedule_assign_locations.workOrderDate', '<=', nextWeekDate)
    //   .andWhere('google_calendar_events.googleCalEventId', null);
  
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
      const chunkSize = 10;
  
      for(let i = 0; i < workOrdersWithNoEvents.length; i += chunkSize) {
          workOrdersChunks.push(workOrdersWithNoEvents.slice(i, i + chunkSize));
      }
  
      // Import SQS Helper..
      const queueHelper = require('../helpers/queue');
  
      for(const workOrderChunk of workOrdersChunks) {
          // Using SQS queueHelper to avoid getting rate limiting errors from Google calendar API
          queueHelper.addToQueue({
              workOrderChunk: workOrderChunk
          },
          'long-jobs',
          'ADD_WORK_ORDER_CALENDAR_EVENT'
          ).catch(error => console.log(error));
      }  
    
};

module.exports = googleCalendarCronHelper;