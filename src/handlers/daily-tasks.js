const knex = require('../db/knex');
const AWS = require('aws-sdk');

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