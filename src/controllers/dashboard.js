const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");

const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");




const dashboardController = {

  getDashboardData: async (req, res) => {
    try {

      let orgId = req.orgId;
      let accessibleProjects = req.userProjectResources[0].projects

      let prioritySeq = await knex('incident_priority').max('sequenceNo').where({ orgId });
      let priority;
      let priorityValue;
      if (prioritySeq.length) {

        let maxSeq = prioritySeq[0].max;
        priority = await knex('incident_priority').where({ sequenceNo: maxSeq }).groupBy(['incident_priority.incidentPriorityCode', 'incident_priority.id']).first();
        priorityValue = priority.incidentPriorityCode;
      }


      const [openRequests, openOrders, srhp, sohp] = await Promise.all([

        knex.from('service_requests')
          .select('service_requests.serviceStatusCode as status')
          .where({ serviceStatusCode: 'O', orgId })
          .whereIn('service_requests.projectId', accessibleProjects)
          .distinct('service_requests.id')
        ,
        knex.from('service_orders')
          .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
          .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
          .select('status.statusCode as status')
          .distinct('service_orders.id')
          .where({ "service_requests.serviceStatusCode": 'O', 'service_orders.orgId': orgId })
        ,
        knex.from('service_requests')
          .select('service_requests.serviceStatusCode as status')
          .where({ serviceStatusCode: 'O', orgId, priority: priorityValue })
          .whereIn('service_requests.projectId', accessibleProjects)
          .distinct('service_requests.id')
        ,

        knex.from('service_orders')
          .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
          .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
          .select('status.statusCode as status')
          .distinct('service_orders.id')
          .where({ "service_requests.serviceStatusCode": 'O', 'service_orders.orgId': orgId, 'service_requests.priority': priorityValue })

      ])

      let open_service_requests = openRequests.length ? openRequests.length : 0;
      let open_service_orders = openOrders.length ? openOrders.length : 0;
      let open_service_requests_high_priority = srhp.length ? srhp.length : 0;
      let open_service_orders_high_priority = sohp.length ? sohp.length : 0;


      return res.status(200).json({
        data: {
          open_service_requests,
          open_service_orders,
          open_service_requests_high_priority,
          open_service_orders_high_priority,
        },
        message: 'Dashboard data'
      })

    } catch (err) {
      console.log('[controllers][parts][getParts] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  getTopAssetProblem: async (req, res) => {
    // Define try/catch block
    try {
      let assestProbResult = null;

      // teamResult =  await knex('teams').leftJoin('team_users','team_users.teamId', '=', 'teams.teamId').select('teams.*').count("team_users.userId").groupByRaw('teams.teamId');
      assestProbResult = await knex.raw(`select "asset_master"."assetName","asset_master"."model", count("assigned_assets"."assetId") as "totalProblems" from "assigned_assets" inner join "asset_master" on "assigned_assets"."assetId" = "asset_master"."id" where "assigned_assets"."entityType"='service_requests'  group by "assigned_assets"."assetId","asset_master"."id" ORDER BY "totalProblems" DESC LIMIT 5`);

      console.log('[controllers][teams][getTeamList] : Team List', assestProbResult);
      assestProbResult = { asset: assestProbResult.rows };

      res.status(200).json({
        data: assestProbResult,
        message: "Top Assest & Problem Results !"
      })

    } catch (err) {
      console.log('[controllers][dashboard][getAssesList] : Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ]
      });
    }
  },
  /*GET CURRENT DATE SERVICE APPOINTMENT LIST */
  getCurrentDateServiceAppointmentList: async (req, res) => {
    try {

      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let currentDate = moment().format('L');
      let currentTime = new Date(currentDate).getTime();
      let result;

      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {


        result = await knex
          .from("service_requests")
          .leftJoin(
            "service_problems",
            "service_requests.id",
            "service_problems.serviceRequestId"
          )
          .leftJoin(
            "incident_categories",
            "service_problems.categoryId",
            "incident_categories.id"
          )
          .leftJoin(
            "incident_sub_categories",
            "incident_categories.id",
            "incident_sub_categories.incidentCategoryId"
          )
          .leftJoin(
            "property_units",
            "service_requests.houseId",
            "property_units.id"
          )
          .leftJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "teams",
            "assigned_service_team.teamId",
            "teams.teamId"
          )
          .select([
            "service_requests.id",
            "service_requests.houseId as houseId",
            "service_requests.description as description",
            "incident_categories.descriptionEng as category",
            "incident_sub_categories.descriptionEng as problem",
            "service_requests.priority",
            "service_requests.serviceStatusCode as status",
            "property_units.unitNumber as unitNo",
            "service_requests.requestedBy as requestedBy",
            "service_requests.createdAt as dateCreated",
            "teams.teamName",
            "teams.teamCode",

          ])
          .where({ "service_requests.orgId": req.orgId })
          .where('service_requests.createdAt', '>=', currentTime)
          .distinct('service_requests.id')
          .orderBy('service_requests.id', 'desc')

      } else {

        result = await knex
          .from("service_requests")
          .leftJoin(
            "service_problems",
            "service_requests.id",
            "service_problems.serviceRequestId"
          )
          .leftJoin(
            "incident_categories",
            "service_problems.categoryId",
            "incident_categories.id"
          )
          .leftJoin(
            "incident_sub_categories",
            "incident_categories.id",
            "incident_sub_categories.incidentCategoryId"
          )
          .leftJoin(
            "property_units",
            "service_requests.houseId",
            "property_units.id"
          )
          .leftJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "assigned_service_additional_users",
            "service_requests.id",
            "assigned_service_additional_users.entityId"
          )
          .leftJoin(
            "teams",
            "assigned_service_team.teamId",
            "teams.teamId"
          )
          .select([
            "service_requests.id",
            "service_requests.houseId as houseId",
            "service_requests.description as description",
            "incident_categories.descriptionEng as category",
            "incident_sub_categories.descriptionEng as problem",
            "service_requests.priority",
            "service_requests.serviceStatusCode as status",
            "property_units.unitNumber as unitNo",
            "service_requests.requestedBy as requestedBy",
            "service_requests.createdAt as dateCreated",
            "teams.teamName",
            "teams.teamCode",

          ])
          .where({ "service_requests.orgId": req.orgId })
          .where('service_requests.createdAt', '>=', currentTime)
          .where({ 'assigned_service_team.userId': id, 'assigned_service_team.entityType': 'service_requests' })
          .orWhere({ 'assigned_service_additional_users.userId': id, 'assigned_service_additional_users.entityType': 'service_requests' })
          .distinct('service_requests.id')
          .orderBy('service_requests.id', 'desc')

      }

      return res.status(200).json({
        data: result,
        message: " Today Service appointment List!"
      });


    } catch (err) {

      console.log('[controllers][dashboard][getCurrentDateServiceAppointmentList] : Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ]
      });
    }
  },

  /*GET CURRENT DATE SURVEY APPOINTMENT LIST */
  getCurrentDateSurveyAppointmentList: async (req, res) => {

    try {

      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let currentDate = moment().format('L');
      let currentTime = new Date(currentDate).getTime();
      let result;

      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {


        result = await knex
          .from("survey_orders As o")
          .where(qb => {
            qb.where("o.orgId", req.orgId);
          }).where({ "assigned_service_team.entityType": "survey_orders" })
          .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .leftJoin(
            "service_status AS status",
            "s.serviceStatusCode",
            "status.statusCode"
          )
          .leftJoin(
            "assigned_service_team",
            "o.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "teams",
            "assigned_service_team.teamId",
            "teams.teamId"
          )
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin(
            "property_units",
            "s.houseId",
            "property_units.id"
          )
          .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
          .leftJoin(
            "service_problems",
            "s.id",
            "service_problems.serviceRequestId"
          )
          .leftJoin(
            "requested_by",
            "s.requestedBy",
            "requested_by.id"
          )
          .leftJoin(
            "incident_categories",
            "service_problems.categoryId",
            "incident_categories.id"
          )
          .leftJoin('user_house_allocation', 's.houseId', 'user_house_allocation.houseId')
          .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
          .select(
            "o.id as sId",
            "s.description as description",
            "o.appointedDate as appointmentDate",
            "o.appointedTime as appointmentTime",
            "users.name as assignedTo",
            "s.id as srId",
            "s.priority as priority",
            "u.name as createdBy",
            "o.surveyOrderStatus as status",
            "o.createdAt as dateCreated",
            "teams.teamName as teamName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingDescription",
            "property_units.unitNumber",
            "incident_categories.descriptionEng as problemDescription",
            "requested_by.name as requestedBy",
            "assignUser.name  as tenantName",
            "teams.teamName as teamCode",
          )
          .where('o.appointedDate', '=', currentDate)
          .orderBy('o.id', 'desc')
          .distinct('o.id')


      } else {


        result = await knex
          .from("survey_orders As o")
          .where(qb => {
            qb.where("o.orgId", req.orgId);
          }).where({ "assigned_service_team.entityType": "survey_orders" })
          .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .leftJoin(
            "service_status AS status",
            "s.serviceStatusCode",
            "status.statusCode"
          )
          .leftJoin(
            "assigned_service_team",
            "o.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "teams",
            "assigned_service_team.teamId",
            "teams.teamId"
          )
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin(
            "property_units",
            "s.houseId",
            "property_units.id"
          )
          .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
          .leftJoin(
            "service_problems",
            "s.id",
            "service_problems.serviceRequestId"
          )
          .leftJoin(
            "requested_by",
            "s.requestedBy",
            "requested_by.id"
          )
          .leftJoin(
            "incident_categories",
            "service_problems.categoryId",
            "incident_categories.id"
          )
          .leftJoin(
            "assigned_service_additional_users",
            "o.id",
            "assigned_service_additional_users.entityId"
          )
          .leftJoin('user_house_allocation', 's.houseId', 'user_house_allocation.houseId')
          .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
          .select(
            "o.id as sId",
            "s.description as description",
            "o.appointedDate as appointmentDate",
            "o.appointedTime as appointmentTime",
            //"users.name as assignedTo",
            "s.id as srId",
            "s.priority as priority",
            "u.name as createdBy",
            "o.surveyOrderStatus as status",
            "o.createdAt as dateCreated",
            "teams.teamName as teamName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingDescription",
            "property_units.unitNumber",
            "incident_categories.descriptionEng as problemDescription",
            "requested_by.name as requestedBy",
            "assignUser.name  as tenantName",
            "teams.teamName as teamCode",
          )
          .where('o.appointedDate', '=', currentDate)
          .where({ 'assigned_service_team.userId': id, 'assigned_service_team.entityType': 'survey_orders' })
          .orWhere({ 'assigned_service_additional_users.userId': id, 'assigned_service_additional_users.entityType': 'survey_orders' })
          .groupBy([
            'o.id',
            's.description',
            'o.appointedDate',
            'o.appointedTime',
            'users.name',
            's.id',
            's.priority',
            'u.name',
            'o.surveyOrderStatus',
            'o.createdAt',
            'teams.teamName',
            'buildings_and_phases.buildingPhaseCode',
            'buildings_and_phases.description',
            'property_units.unitNumber',
            'incident_categories.descriptionEng',
            'requested_by.name',
            'assignUser.name',
            'teams.teamName',
            'assigned_service_additional_users.id',
            'assigned_service_team.id'
          ])
          .distinct('o.id')

          .orderBy('o.id', 'desc')

      }


      return res.status(200).json({
        data: _.uniqBy(result, 'id'),
        message: " Today Survey appointment List!"
      });


    } catch (err) {

      console.log('[controllers][dashboard][getCurrentDateSurveyAppointmentList] : Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ]
      });

    }
  },
  /*GET CURRENT DATE SCHEDULE WORK ORDER LIST */
  getScheduleWorkOrderList: async (req, res) => {
    try {

      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let currentDate = moment().format('L');
      let currentTime = new Date(currentDate).getTime();
      let result;
      let orgId = req.orgId;
      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {

        result  = await knex.from('task_group_schedule')
                   .leftJoin('task_group_schedule_assign_assets','task_group_schedule.id',"task_group_schedule_assign_assets.scheduleId")
                   .select([
                     'task_group_schedule.id',
                     'task_group_schedule_assign_assets.id as workOrderId'
                   ])
                   .where({'task_group_schedule.orgId':orgId})
                   .whereBetween('task_group_schedule_assign_assets.pmDate',[currentDate,currentDate])
                   .orderBy('task_group_schedule.id','desc')

      }else{

      }

      return res.status(200).json({
        data: result,
        message: " Today Schedule Work order List!"
      });



    } catch (err) {

      console.log('[controllers][dashboard][getScheduleWorkOrderList] : Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ]
      });

    }

  }
};

module.exports = dashboardController;
