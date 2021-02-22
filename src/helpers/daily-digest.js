const Joi = require("@hapi/joi");
const _ = require("lodash");
const knex = require("../db/knex");


const dailyDigestHelper = {
  
  prepareDailyDigestForUsers: async () => {
    try {

      const moment = require("moment-timezone");
      let timezone = 'Asia/Bangkok';
      moment.tz.setDefault(timezone);
      let currentTime = moment().valueOf();
      console.log('[helpers][daily-digest][prepareDailyDigestForUsers]:  Current Time:', moment().format("YYYY-MM-DD hh:mm A"));

      // Stream on each users who has logged in past 7 days...


    } catch (err) {
      console.error('[helpers][daily-digest][prepareDailyDigestForUsers]:  Error', err);
      return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
    }
  }
};
module.exports = dailyDigestHelper;
