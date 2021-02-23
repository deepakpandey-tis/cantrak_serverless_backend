const Joi = require("@hapi/joi");
const _ = require("lodash");
const moment = require("moment-timezone");

const knex = require("../db/knex");
const emailHelper = require("../helpers/email");

const timezone = 'Asia/Bangkok';
moment.tz.setDefault(timezone);

const sendDailyDigestToOrgAdmins = async () => {
  const usersQuery = await knex.raw(`select * from users u join application_user_roles ur on ur."userId" = u.id 
   where u."isActive" = true and u."lastLogin" > (extract(epoch from (now() - interval '7 days')) * 1000)
   and ur."roleId" = 2`);
  let users = usersQuery.rows;

  const Parallel = require('async-parallel');
  await Parallel.each(users, async (user) => {
    console.log('[helpers][daily-digest][sendDailyDigestToOrgAdmins]: For User:', user.email);

    // Find parts of given organisation...
    const partsQuery = await knex.raw(`select distinct pm.id, sum(pl.quantity) as "totalQuantity", pm."minimumQuantity",  pm."partName", pm."partCode", pm."orgId" 
                              from part_master pm left join part_ledger pl on pm.id = pl."partId" 
                        where pm."orgId" = 89 group by pm.id having sum(pl.quantity) < pm."minimumQuantity";`);

    let parts = partsQuery.rows;

    if (parts.length) {
      await emailHelper.sendTemplateEmail({
        to: user.email,
        subject: `Daily Digest - ${moment().format("YYYY-MM-DD")}`,
        template: "daily-digest/to-org-admin.ejs",
        templateData: {
          fullName: user.name,
          orgId: user.orgId,
          parts: parts
        },
        orgId: user.orgId
      });
    }

  });
};

const sendDailyDigestToOrgUsers = async () => {
  // Stream on each users who has logged in past 7 days...
  const usersQuery = await knex.raw(`select * from users u join application_user_roles ur on ur."userId" = u.id 
   where u."isActive" = true and u."lastLogin" > (extract(epoch from (now() - interval '7 days')) * 1000)
   and ur."roleId" = 3`);
  let users = usersQuery.rows;

  const Parallel = require('async-parallel');
  await Parallel.each(users, async (user) => {
    console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: For User:', user.email);

    await emailHelper.sendTemplateEmail({
      to: user.email,
      subject: `Daily Digest - ${moment().format("YYYY-MM-DD")}`,
      template: "daily-digest/to-org-users.ejs",
      templateData: {
        fullName: user.name,
        orgId: user.orgId
      },
      orgId: user.orgId
    });
  });
};


const dailyDigestHelper = {

  prepareDailyDigestForUsers: async () => {
    try {

      console.log('[helpers][daily-digest][prepareDailyDigestForUsers]: Processing Start - Current Time:', moment().format("YYYY-MM-DD hh:mm A"));

      try {
        // await sendDailyDigestToOrgAdmins();
      } catch (err) {
        console.log('[helpers][daily-digest][prepareDailyDigestForUsers]: Some error occured in preparing daily digest for admins');
      }

      try {
        // await sendDailyDigestToOrgUsers();
      } catch (err) {
        console.log('[helpers][daily-digest][prepareDailyDigestForUsers]: Some error occured in preparing daily digest for org users');
      }

      console.log('[helpers][daily-digest][prepareDailyDigestForUsers]: Processing End - Current Time:', moment().format("YYYY-MM-DD hh:mm A"))
    } catch (err) {
      console.error('[helpers][daily-digest][prepareDailyDigestForUsers]:  Error', err);
      return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
    }
  }
};
module.exports = dailyDigestHelper;
