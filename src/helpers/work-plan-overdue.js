const Joi = require("@hapi/joi");
const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const moment = require("moment-timezone");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "ap-southeast-1",
});

const workPlanOverdueHelper = {

  markWorkOrdersOverDue: async () => {
    try {

      // const moment = require("moment-timezone");
      // let timezone = 'Asia/Bangkok';
      // moment.tz.setDefault(timezone);
      // let currentTime = moment().valueOf();
      // console.log('[helpers][work-plan-overdue][markWorkOrdersOverDue]:  Current Time:', currentTime);

      const res = await knex.raw(
        `update work_plan_schedule_assign_locations set "isOverdue" = true where (extract(epoch from (to_timestamp("workOrderDate" / 1000)::date + interval '1 days')) * 1000) < (extract(epoch from now()) * 1000) 
        and (extract(epoch from (to_timestamp("workOrderDate" / 1000)::date)) * 1000) > (extract(epoch from (now() - interval '2 days')) * 1000) and status = 'O' and "isOverdue" = false returning *;`
      );

      if (res && res.rows) {
        console.log('[helpers][work-plan-overdue][markWorkOrdersOverDue]: WorkOrders Marked as Overdue Count:', res.rows.length);
      }

    } catch (err) {
      console.error('[helpers][work-plan-overdue][markWorkOrdersOverDue]:  Error', err);
      return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
    }
  }
};

module.exports = workPlanOverdueHelper;
