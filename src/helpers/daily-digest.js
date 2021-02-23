const Joi = require("@hapi/joi");
const _ = require("lodash");
const moment = require("moment-timezone");

const knex = require("../db/knex");
const emailHelper = require("../helpers/email");
const redisHelper = require("../helpers/redis");

const timezone = 'Asia/Bangkok';
// const timezone = 'Asia/Calcutta';

moment.tz.setDefault(timezone);

const getCardsData = async (orgId) => {

  // use redis-cache here ...., so this query is not executed multiple times...
  const cardsDataKey = `cards-data-for-org-${orgId}`;
  let cardsData = await redisHelper.getValue(cardsDataKey);

  if (!cardsData) {
    const [openRequests, openOrders, openSurveys, overDueWOrders] = await Promise.all([
      knex
        .from("service_requests")
        .distinct("service_requests.id")
        .where({ moderationStatus: true, orgId })
        .whereIn("serviceStatusCode", ["US", "O"]),

      knex
        .from("service_requests")
        .distinct("service_requests.id")
        .where({ orgId: orgId })
        .whereIn("serviceStatusCode", ["A", "IP", "OH"]),

      knex
        .from("survey_orders")
        .distinct("survey_orders.id")
        .where({
          orgId: orgId,
          surveyOrderStatus: 'Pending',
        }),

      knex
        .from("task_group_schedule_assign_assets")
        .distinct("task_group_schedule_assign_assets.id")
        .where({
          orgId: orgId,
          status: 'O',
          isOverdue: true
        })
    ]);

    cardsData = {
      openServiceRequestCount: openRequests ? openRequests.length : 0,
      openServiceOrdersCount: openOrders ? openOrders.length : 0,
      openSurveysCount: openSurveys ? openSurveys.length : 0,
      overDueWorkOrdersCount: overDueWOrders ? overDueWOrders.length : 0,
    };

    // Save value to redis for future requests...
    await redisHelper.setValueWithExpiry(cardsDataKey, cardsData, 1800);
  }

  return cardsData;
}

const sendDailyDigestToOrgAdmins = async () => {
  const usersQuery = await knex.raw(`select u.id as "userId", * from users u join application_user_roles ur on ur."userId" = u.id 
   where u."isActive" = true and u."lastLogin" > (extract(epoch from (now() - interval '7 days')) * 1000)
   and ur."roleId" = 2`);
  let users = usersQuery.rows;

  const Parallel = require('async-parallel');
  await Parallel.each(users, async (user) => {
    console.log('[helpers][daily-digest][sendDailyDigestToOrgAdmins]: For User Email/Id:', user.email, user.userId);

    let cardData = await getCardsData(user.orgId);
    console.log('[helpers][daily-digest][sendDailyDigestToOrgAdmins]: Card Data:', cardData);

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
          cardData: cardData,
          parts: parts
        },
        orgId: user.orgId
      });
    }

  });
};

const sendDailyDigestToOrgUsers = async () => {
  // Stream on each users who has logged in past 7 days...
  const usersQuery = await knex.raw(`select u.id as "userId", * from users u join application_user_roles ur on ur."userId" = u.id 
   where u."isActive" = true and u."lastLogin" > (extract(epoch from (now() - interval '7 days')) * 1000)
   and ur."roleId" = 3`);
  let users = usersQuery.rows;

  let startNewDate = moment().startOf("date").format();
  let endNewDate = moment().endOf("date", "day").format();

  const Parallel = require('async-parallel');
  await Parallel.each(users, async (user) => {
    console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: For User Email/Id:', user.email, user.userId);

    let cardData = await getCardsData(user.orgId);
    console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: Card Data:', cardData);

    // Get User Projects 

    const result = await knex("team_users")
      .innerJoin(
        "team_roles_project_master",
        "team_users.teamId",
        "team_roles_project_master.teamId"
      )
      .innerJoin(
        "role_resource_master",
        "team_roles_project_master.roleId",
        "role_resource_master.roleId"
      )
      .select([
        "team_roles_project_master.projectId as projectId",
        "role_resource_master.resourceId as resourceId"
      ])
      .where({ 'team_users.userId': user.userId, 'team_users.orgId': user.orgId });

    userProjectResources = _.chain(result).groupBy("resourceId").map((value, key) => ({ id: key, projects: value.map(a => a.projectId) })).value();
    userProjectResources = userProjectResources.map(ap => ap.projects);
    let projectIds = _.flatten(userProjectResources);
    projectIds = _.uniqBy(projectIds);
    console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: Projects:', projectIds);

    if (userProjectResources.length > 0) {
      // Now - get the list of todays service-appointments assigned to this person
      let surveyAppointments = await knex.from("survey_orders As o")
        .where((qb) => {
          qb.where("o.orgId", user.orgId);
        })
        .select(['s.description', "teams.teamName", "o.appointedTime"])
        .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
        .leftJoin("assigned_service_team", "o.id", "assigned_service_team.entityId")
        .where({ "assigned_service_team.entityType": "survey_orders" })
        .whereBetween("o.appointedDate", [startNewDate, endNewDate])
        .whereIn("s.projectId", projectIds)
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .distinct("o.id")
        .orderBy("o.id", "desc");

      console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: Todays surveyAppointments:', surveyAppointments);


      let serviceAppointments = await knex
        .from("service_requests")
        .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")
        .leftJoin("service_appointments", "service_orders.id", "service_appointments.serviceOrderId")
        .leftJoin("assigned_service_team", "service_appointments.id", "assigned_service_team.entityId")
        .where({ "assigned_service_team.entityType": "service_appointments" })
        .whereBetween("service_appointments.appointedDate", [startNewDate, endNewDate])
        .select([
          "service_requests.id", "service_requests.description", "teams.teamName", "service_appointments.appointedTime"
        ])
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .whereIn("service_requests.projectId", projectIds)
        .where({ "service_requests.orgId": user.orgId })
        .distinct("service_requests.id");

      console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: Todays serviceAppointments:', serviceAppointments);


      // Now - get the list of todays work-orders assigned to this person

      let workOrders = await knex
        .from("task_group_schedule_assign_assets")
        .leftJoin(
          "task_group_schedule",
          "task_group_schedule_assign_assets.scheduleId",
          "task_group_schedule.id"
        )
        .leftJoin(
          "pm_master2",
          "task_group_schedule.pmId",
          "pm_master2.id"
        )
        .leftJoin(
          "assigned_service_team",
          "task_group_schedule_assign_assets.id",
          "assigned_service_team.entityId"
        )
        .leftJoin(
          "asset_master",
          "task_group_schedule_assign_assets.assetId",
          "asset_master.id"
        )
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .select([
          "pm_master2.id", "pm_master2.name", "asset_master.assetName", "teams.teamName"
        ])
        .where({
          "task_group_schedule_assign_assets.orgId": user.orgId,
          "assigned_service_team.entityType": "work_order",
        })
        .whereIn("pm_master2.projectId", projectIds)
        .whereBetween("task_group_schedule_assign_assets.pmDate", [startNewDate, endNewDate])
        .orderBy("task_group_schedule_assign_assets.id", "desc");

      console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: Todays workOrders:', workOrders);

      let todaysData = {
        workOrders, serviceAppointments, surveyAppointments
      }

      if (workOrders.length > 0 || serviceAppointments.length > 0 || surveyAppointments.length > 0) {
        await emailHelper.sendTemplateEmail({
          to: user.email,
          subject: `Daily Digest - ${moment().format("YYYY-MM-DD")}`,
          template: "daily-digest/to-org-users.ejs",
          templateData: {
            fullName: user.name,
            orgId: user.orgId,
            cardData,
            todaysData
          },
          orgId: user.orgId
        });
      } else {
        console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: Not enough data for user...');
      }

    } else {
      console.log('[helpers][daily-digest][sendDailyDigestToOrgUsers]: User has access to no projects...');
    }

  });
};


const dailyDigestHelper = {

  prepareDailyDigestForUsers: async () => {
    try {

      console.log('[helpers][daily-digest][prepareDailyDigestForUsers]: Processing Start - Current Time:', moment().format("YYYY-MM-DD hh:mm A"));

      try {
        await sendDailyDigestToOrgAdmins();
      } catch (err) {
        console.log('[helpers][daily-digest][prepareDailyDigestForUsers]: Some error occured in preparing daily digest for admins', err);
      }

      try {
        await sendDailyDigestToOrgUsers();
      } catch (err) {
        console.log('[helpers][daily-digest][prepareDailyDigestForUsers]: Some error occured in preparing daily digest for org users', err);
      }

      console.log('[helpers][daily-digest][prepareDailyDigestForUsers]: Processing End - Current Time:', moment().format("YYYY-MM-DD hh:mm A"))
    } catch (err) {
      console.error('[helpers][daily-digest][prepareDailyDigestForUsers]:  Error', err);
      return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
    }
  }
};
module.exports = dailyDigestHelper;
