const knex = require('../db/knex');
const AWS = require('aws-sdk');
const moment = require("moment-timezone");
const knexReader = require('../db/knex-reader');

const workOrderEventsHelper = require('../helpers/work-order-events');

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

  const googleCalendarCronHelper = require('../helpers/google-calendar-cron');

  await googleCalendarCronHelper();

  console.log('[handlers][syncGoogleCalendarEvents]: Task Completed Successfully');

  return true;
};