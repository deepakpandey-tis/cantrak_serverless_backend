const knex = require('../db/knex');
const AWS = require('aws-sdk');
const knexReader = require('../db/knex-reader');

const workOrderEventsHelper = require('../helpers/work-order-events');

module.exports.dBWakeUpTask = async (event, context) => {
  console.log('[handlers][dBWakeUpTask]: Event:', JSON.stringify(event));
  // console.log('[handlers][dBWakeUpTask]: Context:', JSON.stringify(context));

  await knex('users').limit(1);
  console.log('[handlers][dBWakeUpTask]: Task Completed Successfully');

  return true;
};


module.exports.workOrderOverdueProcessor = async (event, context) => {
  // console.log('[handlers][workOrderOverdueProcessor]: Event:', JSON.stringify(event));
  // console.log('[handlers][workOrderOverdueProcessor]: Context:', JSON.stringify(context));

  const wpoHelper = require("../helpers/work-plan-overdue");
  await wpoHelper.markWorkOrdersOverDue();

  console.log('[handlers][workOrderOverdueProcessor]: Task Completed Successfully');

  return true;
};


module.exports.dailyDigestProcessor = async (event, context) => {
  console.log('[handlers][dailyDigestProcessor]: Event:', JSON.stringify(event));
  // console.log('[handlers][workOrderOverdueProcessor]: Context:', JSON.stringify(context));

  const dailyDigestHelper = require("../helpers/daily-digest");
  await dailyDigestHelper.prepareDailyDigestForUsers();

  console.log('[handlers][dailyDigestProcessor]: Task Completed Successfully');
  return true;
};

module.exports.syncGoogleCalendarEvents = async (event, context) => {
  console.log('[handlers][syncGoogleCalendarEvents]: Event:', JSON.stringify(event));

  const currentTime = new Date().setHours(0, 0, 0, 0);

  // Add 7 days to the current date
  const nextWeekDate = currentTime + 7 * 24 * 60 * 60 * 1000;

  const workOrdersWithNoEvents = await knexReader('work_plan_schedule_assign_locations')
    .select(
      'work_plan_schedule_assign_locations.id', 
      'work_plan_schedule_assign_locations.id.orgId', 
      'google_calendar_events.googleCalEventId'
    )
    .leftJoin('google_calendar_events', function() {
      this.on('work_plan_schedule_assign_locations.id', '=', 'google_calendar_events.eventEntityId')
      .andOn('google_calendar_events.eventEntityType', '=', knexReader.raw('?', ['work_order']));
    })
    .where('work_plan_schedule_assign_locations.workOrderDate', '<=', nextWeekDate)
    .andWhere('google_calendar_events.googleCalEventId', null);

  // Import SQS Helper..
  const queueHelper = require('../../helpers/queue');

  for(const workOrder of workOrdersWithNoEvents) {      
      // Using SQS helper to avoid getting rate limiting errors from Google calendar API
      await queueHelper.addToQueue({
          workOrderId: workOrder.id,
          orgId: workOrder.orgId
      },
      'long-jobs',
      'ADD_WORK_ORDER_CALENDAR_EVENT'
      );
    }
};