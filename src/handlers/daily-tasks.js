module.exports.workOrderOverdueProcessor = async (event, context) => {
  // console.log('[handlers][workOrderOverdueProcessor]: Event:', JSON.stringify(event));
  // console.log('[handlers][workOrderOverdueProcessor]: Context:', JSON.stringify(context));

  const wpoHelper = require("../helpers/work-plan-overdue");
  await wpoHelper.markWorkOrdersOverDue();

  console.log('[handlers][workOrderOverdueProcessor]: Task Completed Successfully');

  return true;
};


module.exports.syncGoogleCalendarEvents = async (event, context) => {
  console.log('[handlers][syncGoogleCalendarEvents]: Event:', JSON.stringify(event));

  const googleCalendarCronHelper = require('../helpers/google-calendar-cron');

  await googleCalendarCronHelper();

  console.log('[handlers][syncGoogleCalendarEvents]: Task Completed Successfully');

  return true;
};