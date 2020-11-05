const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const Moment = require("moment");
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);

const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");




const dashboardController = {
  getDashboardData: async (req, res) => {
    try {

      let orgId = req.orgId;
      let accessibleProjects = req.userProjectResources[0].projects;
      let payload = req.body;
      let projectResult = [];
      let projectIds = [];
      if (payload.companyIds.length) {

        projectResult = await knex.from('projects').select(['id', 'companyId', 'projectName', 'project as projectCode'])
          .where(qb => {

            if (payload.companyIds.includes("all")) {

            } else {
              qb.whereIn('projects.companyId', payload.companyIds);
            }

          })
          .where({ orgId: req.orgId });

      }
      projectIds = projectResult.map(v => v.id);
      projectIds = _.uniqBy(projectIds);

      let prioritySeq = await knex("incident_priority")
        .max("sequenceNo")
        .where({ orgId: orgId });
      let priority;
      let priorityValue = null;
      if (prioritySeq.length) {
        let maxSeq = prioritySeq[0].max;
        priority = await knex("incident_priority")
          .where({ sequenceNo: maxSeq, orgId: orgId })
          .groupBy([
            "incident_priority.incidentPriorityCode",
            "incident_priority.id"
          ])
          .first();
        priorityValue = priority.incidentPriorityCode;
      }

      const [openRequests, openOrders, srhp, sohp] = await Promise.all([
        knex
          .from("service_requests")
          .select("service_requests.serviceStatusCode as status")
          .distinct("service_requests.id")
          .where({ "moderationStatus": true, orgId: req.orgId })
          .whereIn("service_requests.projectId", projectIds)
          .whereIn("serviceStatusCode", ["US", "O"])
        ,
        //.whereIn("service_requests.projectId", accessibleProjects)
        // .where({ serviceStatusCode: "US", orgId: orgId, "moderationStatus": true })
        //.orWhere({ serviceStatusCode: "O", orgId: orgId, "moderationStatus": true }),
        knex
          .from("service_requests")
          .select("service_requests.serviceStatusCode as status")
          .distinct("service_requests.id")
          .where({ orgId: req.orgId })
          .whereIn("service_requests.projectId", projectIds)
          .whereIn("serviceStatusCode", ["A", "IP", "OH"]),

        //.whereIn("service_requests.projectId", accessibleProjects)
        ///.where({ serviceStatusCode: "A", orgId: orgId })
        //.orWhere({ serviceStatusCode: "IP", orgId: orgId })
        //.orWhere({ serviceStatusCode: "OH", orgId: orgId }),
        knex
          .from("service_requests")
          .select("service_requests.serviceStatusCode as status")
          .distinct("service_requests.id")
          .where({ orgId: req.orgId })
          .whereIn("service_requests.projectId", projectIds)
          //.whereIn("service_requests.projectId", accessibleProjects)
          .where({
            priority: priorityValue,
            orgId: orgId,
            "moderationStatus": true
          })
          .whereIn("serviceStatusCode", ["US", "O"]),

        // .orWhere({
        //   serviceStatusCode: "O",
        //   orgId: orgId,
        //   priority: priorityValue,
        //   "moderationStatus": true
        // }),
        //.where({ serviceStatusCode: 'O', orgId, priority: priorityValue })
        // .whereIn('service_requests.projectId', accessibleProjects)
        //.distinct('service_requests.id')
        knex
          .from("service_requests")
          .select("service_requests.serviceStatusCode as status")
          .distinct("service_requests.id")
          .whereIn("service_requests.projectId", projectIds)
          //.whereIn("service_requests.projectId", accessibleProjects)
          .where({
            // serviceStatusCode: "A",
            orgId: orgId,
            priority: priorityValue
          })
          .whereIn("serviceStatusCode", ["A", "IP", "OH"]),
        // .orWhere({
        //   serviceStatusCode: "IP",
        //   orgId: orgId,
        //   priority: priorityValue
        // })
        // .orWhere({
        //   serviceStatusCode: "OH",
        //   orgId: orgId,
        //   priority: priorityValue
        // })
      ]);

      let open_service_requests = projectIds.length ? openRequests.length : 0;
      let open_service_orders = projectIds.length ? openOrders.length : 0;
      let open_service_requests_high_priority = projectIds.length ? srhp.length : 0;
      let open_service_orders_high_priority = projectIds.length ? sohp.length : 0;

      return res.status(200).json({
        data: {
          open_service_requests,
          open_service_orders,
          open_service_requests_high_priority,
          open_service_orders_high_priority,
          priorityValue,
          o: openRequests,
          projectResult,
          projectIds,
          openRequests
        },
        message: "Dashboard data"
      });
    } catch (err) {
      console.log("[controllers][parts][getParts] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getTopAssetProblem: async (req, res) => {
    // Define try/catch block
    try {
      let assestProbResult = null;

      // teamResult =  await knex('teams').leftJoin('team_users','team_users.teamId', '=', 'teams.teamId').select('teams.*').count("team_users.userId").groupByRaw('teams.teamId');
      assestProbResult = await knex.raw(
        `select "asset_master"."assetName","asset_master"."model", count("assigned_assets"."assetId") as "totalProblems" from "assigned_assets" inner join "asset_master" on "assigned_assets"."assetId" = "asset_master"."id" where "assigned_assets"."entityType"='service_requests'  group by "assigned_assets"."assetId","asset_master"."id" ORDER BY "totalProblems" DESC LIMIT 5`
      );

      console.log(
        "[controllers][teams][getTeamList] : Team List",
        assestProbResult
      );
      assestProbResult = { asset: assestProbResult.rows };

      res.status(200).json({
        data: assestProbResult,
        message: "Top Assest & Problem Results !"
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*GET CURRENT DATE SERVICE APPOINTMENT LIST */
  getCurrentDateServiceAppointmentList: async (req, res) => {
    try {
      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let currentDate = moment().format("YYYY-MM-DD");

      let result;

      let payload = req.body;
      let projectResult = [];
      let projectIds = [];
      if (payload.companyIds.length) {

        projectResult = await knex.from('projects').select(['id', 'companyId', 'projectName', 'project as projectCode'])
          .where(qb => {

            if (payload.companyIds.includes("all")) {

            } else {
              qb.whereIn('projects.companyId', payload.companyIds);
            }

          })
          //.whereIn('projects.companyId', payload.companyIds)
          .where({ orgId: req.orgId });

      }
      projectIds = projectResult.map(v => v.id);
      projectIds = _.uniqBy(projectIds);

      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result = await knex
          .from("service_requests")
          .leftJoin(
            "service_orders",
            "service_requests.id",
            "service_orders.serviceRequestId"
          )
          .leftJoin(
            "service_appointments",
            "service_orders.id",
            "service_appointments.serviceOrderId"
          )
          .leftJoin(
            "assigned_service_team",
            "service_appointments.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .select([
            "service_requests.id",
            "service_orders.id as soId",
            "service_requests.houseId as houseId",
            "service_requests.description as description",
            "service_requests.priority",
            "service_requests.serviceStatusCode as status",
            "service_appointments.status as serviceAppointmentStatus",
            "service_appointments.appointedDate as appointedDate",
            "service_requests.requestedBy as requestedBy",
            "service_requests.createdAt as dateCreated",
            "service_appointments.appointedDate as appointedDate",
            "teams.teamName as teamName",
            "users.name as user_name"
          ])
          .where({ "service_requests.orgId": req.orgId })
          .where({ "service_appointments.appointedDate": currentDate });
      } else {
        result = await knex
          .from("service_requests")
          .leftJoin(
            "service_orders",
            "service_requests.id",
            "service_orders.serviceRequestId"
          )
          .leftJoin(
            "service_appointments",
            "service_orders.id",
            "service_appointments.serviceOrderId"
          )
          .leftJoin(
            "assigned_service_team",
            "service_appointments.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "assigned_service_additional_users",
            "service_appointments.id",
            "assigned_service_additional_users.entityId"
          )
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .select([
            "service_requests.id",
            "service_orders.id as soId",
            "service_requests.houseId as houseId",
            "service_requests.description as description",
            "service_requests.priority",
            "service_requests.serviceStatusCode as status",
            "service_appointments.status as serviceAppointmentStatus",
            "service_appointments.appointedDate as appointedDate",
            "service_requests.requestedBy as requestedBy",
            "service_requests.createdAt as dateCreated",
            "teams.teamName as teamName",
            "users.name as user_name"
          ])
          .whereIn('service_requests.projectId', projectIds)
          .where({ "service_requests.orgId": req.orgId })
          .where("service_appointments.appointedDate", "=", currentDate)
          .where({
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "service_appointments"
          })
          .orWhere({
            "assigned_service_additional_users.userId": id,
            "assigned_service_additional_users.entityType":
              "service_appointments"
          })
          .distinct("service_requests.id")
          .orderBy("service_requests.id", "desc");
      }

      return res.status(200).json({
        data: _.uniqBy(result, "id"),
        message: " Today Service appointment List!"
      });
    } catch (err) {
      console.log(
        "[controllers][dashboard][getCurrentDateServiceAppointmentList] : Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /*GET CURRENT DATE SURVEY APPOINTMENT LIST */
  getCurrentDateSurveyAppointmentList: async (req, res) => {
    try {
      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let currentDate = moment().format("L");
      let currentTime = new Date(currentDate).getTime();

      let startNewDate = moment(currentDate)
        .startOf("date")
        .format();
      let endNewDate = moment(currentDate)
        .endOf("date", "day")
        .format();
      // let startNewDate = moment(currentDate).startOf('date').format();
      // let endNewDate = moment(currentDate).endOf('date', 'day').format();
      let result;

      let payload = req.body;
      let projectResult = [];
      let projectIds = [];
      if (payload.companyIds.length) {

        projectResult = await knex.from('projects').select(['id', 'companyId', 'projectName', 'project as projectCode'])
          .where(qb => {

            if (payload.companyIds.includes("all")) {

            } else {
              qb.whereIn('projects.companyId', payload.companyIds);
            }

          })
          //.whereIn('projects.companyId', payload.companyIds)
          .where({ orgId: req.orgId });

      }
      projectIds = projectResult.map(v => v.id);
      projectIds = _.uniqBy(projectIds);

      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result = await knex
          .from("survey_orders As o")
          .where(qb => {
            qb.where("o.orgId", req.orgId);
          })
          .where({ "assigned_service_team.entityType": "survey_orders" })
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
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin("property_units", "s.houseId", "property_units.id")
          .leftJoin(
            "buildings_and_phases",
            "property_units.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "service_problems",
            "s.id",
            "service_problems.serviceRequestId"
          )
          .leftJoin("requested_by", "s.requestedBy", "requested_by.id")
          .leftJoin(
            "incident_categories",
            "service_problems.categoryId",
            "incident_categories.id"
          )
          .leftJoin(
            "user_house_allocation",
            "s.houseId",
            "user_house_allocation.houseId"
          )
          .leftJoin(
            "users as assignUser",
            "user_house_allocation.userId",
            "assignUser.id"
          )
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
            "teams.teamName as teamCode"
          )
          .whereBetween("o.appointedDate", [startNewDate, endNewDate])
          .orderBy("o.id", "desc")
          .distinct("o.id");
      } else {
        result = await knex
          .from("survey_orders As o")
          .where(qb => {
            qb.where("o.orgId", req.orgId);
          })
          .where({ "assigned_service_team.entityType": "survey_orders" })
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
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin("property_units", "s.houseId", "property_units.id")
          .leftJoin(
            "buildings_and_phases",
            "property_units.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "service_problems",
            "s.id",
            "service_problems.serviceRequestId"
          )
          .leftJoin("requested_by", "s.requestedBy", "requested_by.id")
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
          .leftJoin(
            "user_house_allocation",
            "s.houseId",
            "user_house_allocation.houseId"
          )
          .leftJoin(
            "users as assignUser",
            "user_house_allocation.userId",
            "assignUser.id"
          )
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
            "teams.teamName as teamCode"
          )
          .whereBetween("o.appointedDate", [startNewDate, endNewDate])
          .whereIn('s.projectId', projectIds)
          .where({
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "survey_orders"
          })
          .orWhere({
            "assigned_service_additional_users.userId": id,
            "assigned_service_additional_users.entityType": "survey_orders"
          })
          .groupBy([
            "o.id",
            "s.description",
            "o.appointedDate",
            "o.appointedTime",
            "users.name",
            "s.id",
            "s.priority",
            "u.name",
            "o.surveyOrderStatus",
            "o.createdAt",
            "teams.teamName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description",
            "property_units.unitNumber",
            "incident_categories.descriptionEng",
            "requested_by.name",
            "assignUser.name",
            "teams.teamName",
            "assigned_service_additional_users.id",
            "assigned_service_team.id"
          ])
          .distinct("o.id")
          .orderBy("o.id", "desc");
      }

      return res.status(200).json({
        data: _.uniqBy(result, "id"),
        message: " Today Survey appointment List!"
      });
    } catch (err) {
      console.log(
        "[controllers][dashboard][getCurrentDateSurveyAppointmentList] : Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*GET CURRENT DATE SCHEDULE WORK ORDER LIST */
  getScheduleWorkOrderList: async (req, res) => {
    try {
      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let startDate = moment()
        .startOf("date", "day")
        .format();
      let endDate = moment()
        .endOf("date", "day")
        .format();
      let currentTime = new Date(startDate).getTime();
      let result;

      let payload = req.body;
      let projectResult = [];
      let projectIds = [];
      if (payload.companyIds.length) {

        projectResult = await knex.from('projects').select(['id', 'companyId', 'projectName', 'project as projectCode'])
          .where(qb => {

            if (payload.companyIds.includes("all")) {

            } else {
              qb.whereIn('projects.companyId', payload.companyIds);
            }

          })
          //.whereIn('projects.companyId', payload.companyIds)
          .where({ orgId: req.orgId });

      }
      projectIds = projectResult.map(v => v.id);
      projectIds = _.uniqBy(projectIds);


      let orgId = req.orgId;
      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result = await knex
          .from("task_group_schedule_assign_assets")
          .leftJoin(
            "task_group_schedule",
            "task_group_schedule_assign_assets.scheduleId",
            "task_group_schedule.id"
          )
          .leftJoin(
            "pm_task_groups",
            "task_group_schedule.taskGroupId",
            "pm_task_groups.id"
          )
          .leftJoin(
            "assigned_service_team",
            "pm_task_groups.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin(
            "assigned_service_additional_users",
            "pm_task_groups.id",
            "assigned_service_additional_users.entityId"
          )
          .leftJoin(
            "asset_master",
            "task_group_schedule_assign_assets.assetId",
            "asset_master.id"
          )
          .select([
            "task_group_schedule.id as scheduleId",
            "task_group_schedule_assign_assets.*",
            "teams.teamName as teamName",
            "assigned_service_team.userId as mainUserId",
            "users.name as mainUser",
            "asset_master.assetName as assetName"
          ])
          .where({ "task_group_schedule_assign_assets.orgId": orgId })
          .whereBetween("task_group_schedule_assign_assets.pmDate", [
            startDate,
            endDate
          ])
          .orderBy("task_group_schedule_assign_assets.id", "desc");
      } else {
        result = await knex
          .from("task_group_schedule_assign_assets")
          .leftJoin(
            "task_group_schedule",
            "task_group_schedule_assign_assets.scheduleId",
            "task_group_schedule.id"
          )
          .leftJoin(
            "pm_task_groups",
            "task_group_schedule.taskGroupId",
            "pm_task_groups.id"
          )
          .leftJoin(
            "assigned_service_team",
            "pm_task_groups.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin(
            "assigned_service_additional_users",
            "pm_task_groups.id",
            "assigned_service_additional_users.entityId"
          )
          .leftJoin(
            "asset_master",
            "task_group_schedule_assign_assets.assetId",
            "asset_master.id"
          )
          .select([
            "task_group_schedule.id as scheduleId",
            "task_group_schedule_assign_assets.*",
            "teams.teamName as teamName",
            "assigned_service_team.userId as mainUserId",
            "users.name as mainUser",
            "asset_master.assetName as assetName"
          ])
          .where({
            "task_group_schedule_assign_assets.orgId": orgId,
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "pm_task_groups"
          })
          .whereIn('pm_task_groups.companyId', payload.companyIds)
          // .orWhere({ 'assigned_service_additional_users.userId': id, 'assigned_service_additional_users.entityType': 'pm_task_groups' })
          .whereBetween("task_group_schedule_assign_assets.pmDate", [
            startDate,
            endDate
          ])
          .orderBy("task_group_schedule_assign_assets.id", "desc");
      }

      return res.status(200).json({
        data: _.uniqBy(result, "id"),
        message: " Today Schedule Work order List!"
      });
    } catch (err) {
      console.log(
        "[controllers][dashboard][getScheduleWorkOrderList] : Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getServiceRequestServiceOrderBwDates: async (req, res) => {
    try {
      const reqData = req.body;
      let competitionStartDate = moment("2019-11-13").format("YYYY-MM-DD");
      let today = moment("").format("YYYY-MM-DD");
      // let startDate = moment(reqData.startDate).isValid() ? moment(reqData.startDate).format('YYYY-MM-DD') : competitionStartDate;
      // let endDate = moment(reqData.endDate).isValid() ? moment(reqData.endDate).format('YYYY-MM-DD') : today;
      const accessibleProjects = req.userProjectResources[0].projects;

      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };

      var dates = getDaysArray(
        new Date(reqData.startDate),
        new Date(reqData.endDate)
      );

      let projectResult = [];
      let projectIds = [];
      if (reqData.formData.companyIds.length) {

        projectResult = await knex.from('projects').select(['id', 'companyId', 'projectName', 'project as projectCode'])
          .where(qb => {

            if (reqData.formData.companyIds.includes("all")) {

            } else {
              qb.whereIn('projects.companyId', reqData.formData.companyIds);
            }

          })
          //.whereIn('projects.companyId', reqData.formData.companyIds)
          .where({ orgId: req.orgId });

      }
      projectIds = projectResult.map(v => v.id);
      projectIds = _.uniqBy(projectIds);


      let final = [];
      for (let d of dates) {
        let startNewDate = moment(d)
          .startOf("date")
          .format();
        let endNewDate = moment(d)
          .endOf("date", "day")
          .format();

        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();



        [totalServiceRequest, totalServiceOrder] = await Promise.all([
          knex
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
            .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
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
              "teams.teamCode"
            ])
            .where({ "service_requests.orgId": req.orgId })
            .whereBetween("service_requests.createdAt", [
              currentStartTime,
              currentEndTime
            ])
            .where({ "service_requests.isCreatedFromSo": false })
            .whereIn('service_requests.projectId', projectIds)
            .distinct("service_requests.id")
            .orderBy("service_requests.id", "desc"),
          // .offset(offset).limit(per_page)
          knex
            .from("service_orders")
            .leftJoin(
              "service_requests",
              "service_orders.serviceRequestId",
              "service_requests.id"
            )
            .select([
              "service_orders.id as SoId",
              "service_orders.createdAt as dateCreated"
            ])
            .orderBy("service_orders.id", "desc")
            .where({ "service_orders.orgId": req.orgId })
            .whereBetween("service_orders.createdAt", [
              currentStartTime,
              currentEndTime
            ])
            //.whereIn("service_requests.projectId", accessibleProjects)
            .whereIn("service_requests.projectId", projectIds)
        ]);

        final.push({
          date: moment(d).format("L"),
          totalServiceRequest: _.uniqBy(totalServiceRequest, "id").length,
          totalServiceOrder: _.uniqBy(totalServiceOrder, "SoId").length
        });
      }

      res.status(200).json({
        data: { final },
        message: "records",
        projectIds
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getMainDataForPieChart: async (req, res) => {
    try {

      let reqData = req.body;
      let projectResult = [];
      let projectIds = [];
      if (reqData.formData.companyIds.length) {

        projectResult = await knex.from('projects').select(['id', 'companyId', 'projectName', 'project as projectCode'])
          .where(qb => {

            if (reqData.formData.companyIds.includes("all")) {

            } else {
              qb.whereIn('projects.companyId', reqData.formData.companyIds);
            }

          })
          //.whereIn('projects.companyId', reqData.formData.companyIds)
          .where({ orgId: req.orgId });

      }
      projectIds = projectResult.map(v => v.id);
      projectIds = _.uniqBy(projectIds);

      // let startDate = moment(req.body.startDate).format('L'); // TODO
      // let endDate = moment(req.body.endDate).format('L') // TODO
      let currentDate = moment().format("L");
      let startNewDate = moment(currentDate)
        .startOf("date")
        .format();
      let endNewDate = moment(currentDate)
        .endOf("date", "day")
        .format();

      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;

      let result;
      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result = await knex
          .from("service_requests")
          .leftJoin(
            "service_orders",
            "service_requests.id",
            "service_orders.serviceRequestId"
          )
          .leftJoin(
            "service_appointments",
            "service_orders.id",
            "service_appointments.serviceOrderId"
          )
          .leftJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )

          .select([
            "service_requests.id",
            "service_orders.id as soId",
            "service_requests.houseId as houseId",
            "service_requests.description as description",
            "service_requests.priority",
            "service_requests.serviceStatusCode as status",
            "service_requests.requestedBy as requestedBy",
            "service_requests.createdAt as dateCreated",
            "service_appointments.appointedDate as appointedDate"
          ])
          .where({ "service_requests.orgId": req.orgId })
          .where({ "service_appointments.appointedDate": currentDate });
      } else {
        result = await knex
          .from("service_requests")
          .leftJoin(
            "service_orders",
            "service_requests.id",
            "service_orders.serviceRequestId"
          )
          .leftJoin(
            "service_appointments",
            "service_orders.id",
            "service_appointments.serviceOrderId"
          )
          .leftJoin(
            "assigned_service_team",
            "service_appointments.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "assigned_service_additional_users",
            "service_appointments.id",
            "assigned_service_additional_users.entityId"
          )
          .select([
            "service_requests.id",
            "service_orders.id as soId",
            "service_requests.houseId as houseId",
            "service_requests.description as description",
            "service_requests.priority",
            "service_requests.serviceStatusCode as status",
            "service_requests.requestedBy as requestedBy",
            "service_requests.createdAt as dateCreated"
          ])
          .where({ "service_requests.orgId": req.orgId })
          .where("service_appointments.appointedDate", "=", currentDate)
          .where({
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "service_appointments"
          })
          .orWhere({
            "assigned_service_additional_users.userId": id,
            "assigned_service_additional_users.entityType":
              "service_appointments"
          })
          .whereIn("service_requests.projectId", projectIds)
          .distinct("service_requests.id")
          .orderBy("service_requests.id", "desc");
      }

      let result2;
      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result2 = await knex
          .from("survey_orders As o")
          .where(qb => {
            qb.where("o.orgId", req.orgId);
          })
          .where({ "assigned_service_team.entityType": "survey_orders" })
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
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin("property_units", "s.houseId", "property_units.id")
          .leftJoin(
            "buildings_and_phases",
            "property_units.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "service_problems",
            "s.id",
            "service_problems.serviceRequestId"
          )
          .leftJoin("requested_by", "s.requestedBy", "requested_by.id")
          .leftJoin(
            "incident_categories",
            "service_problems.categoryId",
            "incident_categories.id"
          )
          .leftJoin(
            "user_house_allocation",
            "s.houseId",
            "user_house_allocation.houseId"
          )
          .leftJoin(
            "users as assignUser",
            "user_house_allocation.userId",
            "assignUser.id"
          )
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
            "teams.teamName as teamCode"
          )
          .whereBetween("o.appointedDate", [startNewDate, endNewDate])
          .orderBy("o.id", "desc")
          .distinct("o.id");
      } else {
        result2 = await knex
          .from("survey_orders As o")
          .where(qb => {
            qb.where("o.orgId", req.orgId);
          })
          .where({ "assigned_service_team.entityType": "survey_orders" })
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
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin("property_units", "s.houseId", "property_units.id")
          .leftJoin(
            "buildings_and_phases",
            "property_units.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "service_problems",
            "s.id",
            "service_problems.serviceRequestId"
          )
          .leftJoin("requested_by", "s.requestedBy", "requested_by.id")
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
          .leftJoin(
            "user_house_allocation",
            "s.houseId",
            "user_house_allocation.houseId"
          )
          .leftJoin(
            "users as assignUser",
            "user_house_allocation.userId",
            "assignUser.id"
          )
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
            "teams.teamName as teamCode"
          )
          .whereBetween("o.appointedDate", [startNewDate, endNewDate])
          .where({
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "survey_orders"
          })
          .orWhere({
            "assigned_service_additional_users.userId": id,
            "assigned_service_additional_users.entityType": "survey_orders"
          })
          .whereIn("s.projectId", projectIds)
          .groupBy([
            "o.id",
            "s.description",
            "o.appointedDate",
            "o.appointedTime",
            "users.name",
            "s.id",
            "s.priority",
            "u.name",
            "o.surveyOrderStatus",
            "o.createdAt",
            "teams.teamName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description",
            "property_units.unitNumber",
            "incident_categories.descriptionEng",
            "requested_by.name",
            "assignUser.name",
            "teams.teamName",
            "assigned_service_additional_users.id",
            "assigned_service_team.id"
          ])
          .distinct("o.id")
          .orderBy("o.id", "desc");
      }

      let result3;

      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result3 = await knex
          .from("task_group_schedule_assign_assets")
          .leftJoin(
            "task_group_schedule",
            "task_group_schedule_assign_assets.scheduleId",
            "task_group_schedule.id"
          )
          .leftJoin(
            "pm_task_groups",
            "task_group_schedule.taskGroupId",
            "pm_task_groups.id"
          )
          .leftJoin(
            "assigned_service_team",
            "pm_task_groups.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin(
            "assigned_service_additional_users",
            "pm_task_groups.id",
            "assigned_service_additional_users.entityId"
          )
          .select([
            "task_group_schedule.id as scheduleId",
            "task_group_schedule_assign_assets.*",
            "teams.teamName as teamName",
            "assigned_service_team.userId as mainUserId",
            "users.name as mainUser"
          ])
          .where({ "task_group_schedule_assign_assets.orgId": req.orgId })
          .whereBetween("task_group_schedule_assign_assets.pmDate", [
            startNewDate,
            endNewDate
          ])
          .orderBy("task_group_schedule_assign_assets.id", "desc");
      } else {
        result3 = await knex
          .from("task_group_schedule_assign_assets")
          .leftJoin(
            "task_group_schedule",
            "task_group_schedule_assign_assets.scheduleId",
            "task_group_schedule.id"
          )
          .leftJoin(
            "pm_task_groups",
            "task_group_schedule.taskGroupId",
            "pm_task_groups.id"
          )
          .leftJoin(
            "assigned_service_team",
            "pm_task_groups.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin(
            "assigned_service_additional_users",
            "pm_task_groups.id",
            "assigned_service_additional_users.entityId"
          )
          .select([
            "task_group_schedule.id as scheduleId",
            "task_group_schedule_assign_assets.*",
            "teams.teamName as teamName",
            "assigned_service_team.userId as mainUserId",
            "users.name as mainUser"
          ])
          .where({
            "task_group_schedule_assign_assets.orgId": req.orgId,
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "pm_task_groups"
          })
          // .orWhere({ 'assigned_service_additional_users.userId': id, 'assigned_service_additional_users.entityType': 'pm_task_groups' })
          .whereBetween("task_group_schedule_assign_assets.pmDate", [
            startNewDate,
            endNewDate
          ])
          .whereIn('pm_task_groups.companyId', reqData.formData.companyIds)
          .orderBy("task_group_schedule_assign_assets.id", "desc");
      }

      return res.status(200).json({
        data: {
          ServiceAppointments: _.uniqBy(result, "id").length,
          SurveyAppointments: _.uniqBy(result2, "id").length,
          WorkOrders: result3.length
        }
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getServiceRequestsByProblemType: async (req, res) => {
    try {
      // const problems = await knex('service_problems')
      // .leftJoin('incident_sub_categories','service_problems.problemId','incident_sub_categories.id')
      // .leftJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id')
      //   .select(['service_problems.serviceRequestId', 'incident_categories.categoryCode','incident_categories.descriptionEng'])
      //   .where({'incident_sub_categories.orgId':req.orgId})
      let problems = null;
      let problemTypeId = req.body.problemTypeId;
      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };
      var dates = getDaysArray(
        new Date(req.body.startDate),
        new Date(req.body.endDate)
      );
      let final = [];
      for (let d of dates) {
        let startNewDate = moment(d)
          .startOf("date")
          .format();
        let endNewDate = moment(d)
          .endOf("date", "day")
          .format();
        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();
        problems = await knex
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
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .select([
            "service_problems.serviceRequestId",
            "incident_categories.categoryCode",
            "incident_categories.descriptionEng"
          ])
          .where({
            "service_requests.orgId": req.orgId,
            "incident_sub_categories.incidentTypeId": problemTypeId
          })
          .whereBetween("service_requests.createdAt", [
            currentStartTime,
            currentEndTime
          ])
          .where({ "service_requests.isCreatedFromSo": false })
          .distinct("service_requests.id")
          .orderBy("service_requests.id", "desc");
        // let grouped = _.groupBy(problems, 'categoryCode')
        // let problemCounts = Object.keys(grouped).map(category => ({totalServiceRequests:grouped[category].length,category}))
        final.push({
          date: moment(d).format("L"),
          totalServiceRequest: problems.length
        });
      }

      return res.status(200).json({
        data: final
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPieChartForIncidentTypes: async (req, res) => {
    try {
      let problems = null;
      let problemTypeId = req.body.problemTypeId;
      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };
      var dates = getDaysArray(
        new Date(req.body.startDate),
        new Date(req.body.endDate)
      );
      let final = [];
      for (let d of dates) {
        let startNewDate = moment(d)
          .startOf("date")
          .format();
        let endNewDate = moment(d)
          .endOf("date", "day")
          .format();
        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();
        problems = await knex
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
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .select([
            "service_problems.serviceRequestId",
            "incident_categories.categoryCode",
            "incident_categories.descriptionEng"
          ])
          .where({
            "service_requests.orgId": req.orgId,
            "incident_sub_categories.incidentTypeId": problemTypeId
          })
          .where({ "service_requests.orgId": req.orgId })
          .whereBetween("service_requests.createdAt", [
            currentStartTime,
            currentEndTime
          ])
          .where({ "service_requests.isCreatedFromSo": false })
          .distinct("service_requests.id")
          .orderBy("service_requests.id", "desc");
        let grouped = _.groupBy(problems, "categoryCode");

        // let problemWise = _.keys(grouped).map(category => ({totalServiceRequests:grouped[category].length,category}))
        final.push(grouped); //totalServiceRequest: problems.length })
      }
      let finalData = _.flatten(
        final
          .filter(v => !_.isEmpty(v))
          .map(v => _.keys(v).map(p => ({ [p]: v[p].length })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});
      return res.status(200).json({
        data: finalData
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPieChartForAllIncidentTypes: async (req, res) => {
    try {
      let problems = null;


      let final = [];
      // for (let d of dates) {


      problems = await knex
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
          "incident_type",
          "incident_sub_categories.incidentTypeId",
          "incident_type.id"
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
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .select([
          "service_problems.serviceRequestId",
          "incident_type.typeCode as categoryCode",
          "incident_categories.descriptionEng"
        ])
        .where({
          "service_requests.orgId": req.orgId,
        })
        .where({ "service_requests.orgId": req.orgId })

        .where({ "service_requests.isCreatedFromSo": false })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");
      let grouped = _.groupBy(problems, "categoryCode");




      // let problemWise = _.keys(grouped).map(category => ({totalServiceRequests:grouped[category].length,category}))
      final.push(grouped); //totalServiceRequest: problems.length })
      //}


      final = final.map(obj => {
        obj["Others"] = obj[null]
        delete obj[null];
        return obj;
      })

      let finalData = _.flatten(
        final
          .filter(v => !_.isEmpty(v))
          .map(v => _.keys(v).map(p => ({ [p]: v[p].length })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});
      return res.status(200).json({
        data: finalData,
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
  ,
  /* GET ALL ALLOW COMPANY LIST */
  getAllowAllCompanyList: async (req, res) => {

    try {

      let projectIds = [];
      const accessibleProjects = req.userProjectResources;

      if (accessibleProjects.length) {
        for (let pro of accessibleProjects) {

          if (pro.projects.length) {

            for (let projectId of pro.projects) {
              console.log("project=========", pro.projects, "===========================================")

              projectIds.push(projectId);
            }
          }
        }
      }

      projectIds = _.uniqBy(projectIds);

      let companyResult = await knex.from('projects').select(['companyId', 'projectName', 'project as projectCode'])
        .whereIn('projects.id', projectIds)
        .where({ orgId: req.orgId });

      let companyIds = companyResult.map(v => v.companyId);

      companyIds = _.uniqBy(companyIds);

      let companyData = await knex.from('companies').select(['id', 'companyName', 'companyId'])
        .whereIn('companies.id', companyIds)
        .orderBy("companies.companyName", 'asc')
        .where({ isActive: true, orgId: req.orgId });


      return res.status(200).json({
        data: {
          companyData,
          companyIds
        },
        message: "Company List Successfully!"
      });

    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }


  }
  ,
  /*GET SERVICE REQUEST DATA BY PROBLEM TYPE FOR CHART */
  getServiceRequestByProblemTypeChartdata: async (req, res) => {

    try {

      let problems = null;
      problems = await knex
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
          "incident_type",
          "incident_sub_categories.incidentTypeId",
          "incident_type.id"
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
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .select([
          "service_problems.serviceRequestId",
          "incident_type.typeCode as Type",
          "incident_categories.descriptionEng",
          "service_requests.priority",
        ])
        .where({
          "service_requests.orgId": req.orgId,
        })
        .where({ "service_requests.orgId": req.orgId })

        .where({ "service_requests.isCreatedFromSo": false, 'service_requests.moderationStatus': true })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");



      let final = [];
      let grouped = _.groupBy(problems, "Type");
      final.push(grouped);

      let chartData = _.flatten(
        final
          .filter(v => !_.isEmpty(v))
          .map(v => _.keys(v).map(p => ({ [p]: v[p].length })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});



      let final2 = [];

      let ch = _.flatten(
        final
          .filter(v => !_.isEmpty(v))
          .map(v => _.keys(v).map(p => ({


            [p]: _.groupBy(v[p], "priority")

          })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});





      let ch2 = _.flatten(
        final
          .filter(v => !_.isEmpty(v))
          .map(v => Object.keys(v).map(p =>
            p

          ))
      )


      final2.push(ch);

      let chart2 = _.flatten(
        final2
          .filter(v => !_.isEmpty(v))
          .map(v =>

            _.keys(v).map(p => ({ [p]: v[p] }))

            //_.keys(v).map(p => ({ [p]: v[p].map(x => _.keys(x).map(y => ({ [y]: x[y] }))) }))

            //console.log("vvvvvvvvvv",_.keys(v),"vvvvvvvvvvvvvvvvvvvvvvvvvvv")

            //   _.keys(v).map(p => ({ 


            //   //[p]: v[p] 



            // }))
          )
      )




      let prG = _.groupBy(problems, "priority");
      let f = [];
      f.push(prG);
      let arr1 = [];

      let x = _.flatten(
        f
          .filter(v => !_.isEmpty(v))
          .map(v => _.keys(v).map(p => ({
            [p]: v[p]

          })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});


      for (let d of problems) {






      }

      // let m = chart2.map(v =>

      //  // _.keys(v).map(p => v[p].map(x => _.keys(x).map(y => ({ [y]: x[y] }))))

      //   //console.log("vvvvvvvvvvvvvvvvvvv", v, "==============================");

      // )

      const Parallel = require('async-parallel');

      problems = await Parallel.map(problems, async st => {

        return {
          ...st,
          chartData,
        }

      })




      res.status(200).json({
        data: {
          problems,
          chartData,
          grouped,
          final,
          ch,
          ch2,
          chart2,
          prG,
          arr1,
          x



        },
        message: "Service Request by problem type data successfully!"
      })


    } catch (err) {

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      })

    }
  }

};

module.exports = dashboardController;



