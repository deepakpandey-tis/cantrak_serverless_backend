const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const Moment = require("moment");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment);

const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const { whereBetween } = require("../db/knex");

const dashboardController = {
  getDashboardData: async (req, res) => {
    try {
      let orgId = req.orgId;
      let accessibleProjects = req.userProjectResources[0].projects;
      let payload = req.body;
      let projectResult = [];
      let projectIds = [];
      if (payload.companyIds.length) {
        projectResult = await knex
          .from("projects")
          .select(["id", "companyId", "projectName", "project as projectCode"])
          .where((qb) => {
            if (payload.companyIds.includes("all")) {
            } else {
              qb.whereIn("projects.companyId", payload.companyIds);
            }
          })
          .where({ orgId: req.orgId });
      }
      projectIds = projectResult.map((v) => v.id);
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
            "incident_priority.id",
          ])
          .first();
        priorityValue = priority.incidentPriorityCode;
      }



      serviceReqId = await knex
        .from("service_requests")
        .select("service_requests.id")
        .distinct("service_requests.id")
        .where({ orgId: req.orgId })
        .whereIn("service_requests.projectId", projectIds)
        .where({
          orgId: orgId,
          moderationStatus: true,
        })

      serviceReqId = serviceReqId.map((v) => v.id);
      serviceReqId = _.uniqBy(serviceReqId);
      console.log("serviceORequestId", serviceReqId);



      pmMaster = await knex
        .from("pm_master2")
        .select("pm_master2.id")
        .distinct("pm_master2.id")
        .where({ orgId: req.orgId })
        .whereIn("pm_master2.projectId", projectIds)
      pmMaster = pmMaster.map((v) => v.id);
      pmMaster = _.uniqBy(pmMaster);
      console.log("pmMaster+!1111111", pmMaster);



      pmScheduleMaster = await knex
        .from("task_group_schedule")
        .select("task_group_schedule.id")
        .distinct("task_group_schedule.id")
        .where({ orgId: req.orgId })
        .whereIn("task_group_schedule.pmId", pmMaster)
      pmScheduleMaster = pmScheduleMaster.map((v) => v.id);
      pmScheduleMaster = _.uniqBy(pmScheduleMaster);
      console.log("pmScheduleMaster+!1111111", pmScheduleMaster);


      const [openRequests, openOrders, openSurveys, overDueWOrders] = await Promise.all([
        knex
          .from("service_requests")
          .select("service_requests.serviceStatusCode as status")
          .distinct("service_requests.id")
          .where({ moderationStatus: true, orgId: req.orgId })
          .whereIn("service_requests.projectId", projectIds)
          .whereIn("serviceStatusCode", ["O"]),
        knex
          .from("service_orders")
          .leftJoin(
            "service_requests",
            "service_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
          .whereIn('status.descriptionEng', ["Open", "Approved", "In Progress", "On Hold"])
          .where({ "service_orders.orgId": req.orgId })
          .whereIn("service_requests.projectId", projectIds),

        knex
          .from("survey_orders")
          .select("survey_orders.surveyOrderStatus as status")
          .distinct("survey_orders.id")
          .where({
            orgId: orgId,
            surveyOrderStatus: 'Pending',
          })
          .whereIn("survey_orders.serviceRequestId", serviceReqId),

        knex
          .from("task_group_schedule")
          .distinct("task_group_schedule_assign_assets.id")
          .innerJoin(
            "task_group_schedule_assign_assets",
            "task_group_schedule.id",
            "task_group_schedule_assign_assets.scheduleId"
          )
          .innerJoin(
            "asset_master",
            "task_group_schedule_assign_assets.assetId",
            "asset_master.id"
          )
          .innerJoin(
            "pm_master2",
            "task_group_schedule.pmId",
            "pm_master2.id"
          )
          .where({
            "task_group_schedule.orgId": req.orgId,
            "task_group_schedule_assign_assets.status": 'O',
            "task_group_schedule_assign_assets.isOverdue": true
          })
          .whereIn(
            "pm_master2.projectId", projectIds
          )

      ]);

      let open_service_requests = projectIds.length ? openRequests.length : 0;
      let open_service_orders = projectIds.length ? openOrders.length : 0;
      let open_survey_orders = projectIds.length ? openSurveys.length : 0;
      let open_overdue_work_orders = projectIds.length ? overDueWOrders.length : 0;

      return res.status(200).json({
        data: {
          open_service_requests,
          open_service_orders,
          open_survey_orders,
          open_overdue_work_orders,
          priorityValue,
          o: openRequests,
          projectResult,
          projectIds,
          openRequests,
        },
        message: "Dashboard data",
      });
    } catch (err) {
      console.log("[controllers][parts][getParts] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
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
        message: "Top Assest & Problem Results !",
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*GET CURRENT DATE SERVICE APPOINTMENT LIST */
  getCurrentDateServiceAppointmentList: async (req, res) => {
    try {
      console.log("reqBody",)
      let payload = req.body;
      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let currentDate;

      if (payload.todayDate.length) {
        currentDate = moment().format("YYYY-MM-DD");
      } else if (payload.tomorrowDate.length) {
        currentDate = payload.tomorrowDate;
      } else {
        currentDate = moment().format("YYYY-MM-DD");
      }


      let result;


      let projectResult = [];
      let projectIds = [];
      if (payload.companyIds.length) {
        projectResult = await knex
          .from("projects")
          .select(["id", "companyId", "projectName", "project as projectCode"])
          .where((qb) => {
            if (payload.companyIds.includes("all")) {
            } else {
              qb.whereIn("projects.companyId", payload.companyIds);
            }
          })
          //.whereIn('projects.companyId', payload.companyIds)
          .where({ orgId: req.orgId });
      }
      projectIds = projectResult.map((v) => v.id);
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
            "users.name as user_name",
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
            "users.name as user_name",
          ])
          .whereIn("service_requests.projectId", projectIds)
          .where({ "service_requests.orgId": req.orgId })
          .where("service_appointments.appointedDate", "=", currentDate)
          .where({
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "service_appointments",
          })
          .orWhere({
            "assigned_service_additional_users.userId": id,
            "assigned_service_additional_users.entityType":
              "service_appointments",
          })
          .distinct("service_requests.id")
          .orderBy("service_requests.id", "desc");
      }

      return res.status(200).json({
        data: _.uniqBy(result, "id"),
        message: " Today Service appointment List!",
      });
    } catch (err) {
      console.log(
        "[controllers][dashboard][getCurrentDateServiceAppointmentList] : Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /*GET CURRENT DATE SURVEY APPOINTMENT LIST */
  getCurrentDateSurveyAppointmentList: async (req, res) => {
    try {
      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let payload = req.body;

      // let currentDate = moment().format("L");

      let currentDate;

      if (payload.todayDate.length) {
        currentDate = moment().format("L");
      } else if (payload.tomorrowDate.length) {
        currentDate = moment(payload.tomorrowDate).format("L");
      } else {
        currentDate = moment().format("L");
      }

      let currentTime = new Date(currentDate).getTime();

      let startNewDate = moment(currentDate).startOf("date").format();
      let endNewDate = moment(currentDate).endOf("date", "day").format();
      // let startNewDate = moment(currentDate).startOf('date').format();
      // let endNewDate = moment(currentDate).endOf('date', 'day').format();
      let result;

      let projectResult = [];
      let projectIds = [];
      if (payload.companyIds.length) {
        projectResult = await knex
          .from("projects")
          .select(["id", "companyId", "projectName", "project as projectCode"])
          .where((qb) => {
            if (payload.companyIds.includes("all")) {
            } else {
              qb.whereIn("projects.companyId", payload.companyIds);
            }
          })
          //.whereIn('projects.companyId', payload.companyIds)
          .where({ orgId: req.orgId });
      }
      projectIds = projectResult.map((v) => v.id);
      projectIds = _.uniqBy(projectIds);

      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result = await knex
          .from("survey_orders As o")
          .where((qb) => {
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
          .where((qb) => {
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
          .whereIn("s.projectId", projectIds)
          .where({
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "survey_orders",
          })
          .orWhere({
            "assigned_service_additional_users.userId": id,
            "assigned_service_additional_users.entityType": "survey_orders",
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
            "assigned_service_team.id",
          ])
          .distinct("o.id")
          .orderBy("o.id", "desc");
      }

      return res.status(200).json({
        data: _.uniqBy(result, "id"),
        message: " Today Survey appointment List!",
      });
    } catch (err) {
      console.log(
        "[controllers][dashboard][getCurrentDateSurveyAppointmentList] : Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*GET CURRENT DATE SCHEDULE WORK ORDER LIST */
  getScheduleWorkOrderList: async (req, res) => {
    try {
      let usersDetails = req.me;
      let roles = usersDetails.roles;
      let id = usersDetails.id;
      let payload = req.body;
      // let currentDate;
      let startDate;
      let endDate;

      console.log("request body data==========", req.body)
      // Set timezone for moment
      const timezone = 'Asia/Bangkok';
      moment.tz.setDefault(payload.timezone);
      //  let currentDate = moment().format("YYYY-MM-DD");
      //  console.log(
      //      "Current Time:",
      //      currentDate
      //  );

      let startNewDate = moment().startOf("date").format();
      let endNewDate = moment().endOf("date", "day").format();


      if (payload.todayDate.length) {
        startDate = moment().startOf("date", "day").format();
        endDate = moment().endOf("date", "day").format();
      } else if (payload.tomorrowDate.length) {
        startDate = moment(payload.tomorrowDate).startOf("date", "day").format();
        endDate = moment(payload.tomorrowDate).endOf("date", "day").format();
      } else {
        startDate = moment().startOf("date", "day").format();
        endDate = moment().endOf("date", "day").format();
      }

      // let currentTime = new Date(startDate).getTime();
      let result;


      let projectResult = [];
      let projectIds = [];
      if (payload.companyIds.length) {
        projectResult = await knex
          .from("projects")
          .select(["id", "companyId", "projectName", "project as projectCode"])
          .where((qb) => {
            if (payload.companyIds.includes("all")) {
            } else {
              qb.whereIn("projects.companyId", payload.companyIds);
            }
          })
          //.whereIn('projects.companyId', payload.companyIds)
          .where({ orgId: req.orgId });
      }
      projectIds = projectResult.map((v) => v.id);
      projectIds = _.uniqBy(projectIds);

      let orgId = req.orgId;
      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result = await knex
          .from("task_group_schedule")
          .innerJoin(
            "task_group_schedule_assign_assets",
            "task_group_schedule.id",
            "task_group_schedule_assign_assets.scheduleId"
          )
          .innerJoin(
            "asset_master",
            "task_group_schedule_assign_assets.assetId",
            "asset_master.id"
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
          .select([
            "task_group_schedule_assign_assets.id as workOrderId",
            "task_group_schedule_assign_assets.displayId",
            "task_group_schedule.id as scheduleId",
            "asset_master.assetName as assetName",
            "task_group_schedule_assign_assets.pmDate as pmDate",
            "teams.teamName as teamName",
            "assigned_service_team.userId as mainUserId",
            "users.name as mainUser",
          ])
          .where({
            "task_group_schedule.orgId": req.orgId,
          })
          // .whereRaw(
          //   `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${currentDate}'`
          // )
          .whereRaw(
            `DATE("task_group_schedule_assign_assets"."pmDate") = date(now())`
          )
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
            "asset_master.assetName as assetName",
            "task_group_schedule_assign_assets.id as workOrderId",
          ])
          .where({
            "task_group_schedule_assign_assets.orgId": orgId,
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "work_order",
          })
          .whereIn("pm_task_groups.companyId", payload.companyIds)
          // .orWhere({ 'assigned_service_additional_users.userId': id, 'assigned_service_additional_users.entityType': 'pm_task_groups' })
          .whereBetween("task_group_schedule_assign_assets.pmDate", [
            startNewDate,
            endNewDate,
          ])
          .orderBy("task_group_schedule_assign_assets.id", "desc");
      }
      return res.status(200).json({
        data: _.uniqBy(result, "workOrderId"),
        message: " Today Schedule Work order List!",
      });
    } catch (err) {
      console.log(
        "[controllers][dashboard][getScheduleWorkOrderList] : Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
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
        projectResult = await knex
          .from("projects")
          .select(["id", "companyId", "projectName", "project as projectCode"])
          .where((qb) => {
            if (reqData.formData.companyIds.includes("all")) {
            } else {
              qb.whereIn("projects.companyId", reqData.formData.companyIds);
            }
          })
          //.whereIn('projects.companyId', reqData.formData.companyIds)
          .where({ orgId: req.orgId });
      }
      projectIds = projectResult.map((v) => v.id);
      projectIds = _.uniqBy(projectIds);

      let final = [];
      for (let d of dates) {
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();

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
              "teams.teamCode",
            ])
            .where({ "service_requests.orgId": req.orgId })
            .whereBetween("service_requests.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .where({ "service_requests.isCreatedFromSo": false })
            .whereIn("service_requests.projectId", projectIds)
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
              "service_orders.createdAt as dateCreated",
            ])
            .orderBy("service_orders.id", "desc")
            .where({ "service_orders.orgId": req.orgId })
            .whereBetween("service_orders.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            //.whereIn("service_requests.projectId", accessibleProjects)
            .whereIn("service_requests.projectId", projectIds),
        ]);

        final.push({
          date: moment(d).format("L"),
          totalServiceRequest: _.uniqBy(totalServiceRequest, "id").length,
          totalServiceOrder: _.uniqBy(totalServiceOrder, "SoId").length,
        });
      }

      res.status(200).json({
        data: { final },
        message: "records",
        projectIds,
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getMainDataForPieChart: async (req, res) => {
    try {
      let reqData = req.body;
      let projectResult = [];
      let projectIds = [];
      if (reqData.formData.companyIds.length) {
        projectResult = await knex
          .from("projects")
          .select(["id", "companyId", "projectName", "project as projectCode"])
          .where((qb) => {
            if (reqData.formData.companyIds.includes("all")) {
            } else {
              qb.whereIn("projects.companyId", reqData.formData.companyIds);
            }
          })
          //.whereIn('projects.companyId', reqData.formData.companyIds)
          .where({ orgId: req.orgId });
      }
      projectIds = projectResult.map((v) => v.id);
      projectIds = _.uniqBy(projectIds);

      // let startDate = moment(req.body.startDate).format('L'); // TODO
      // let endDate = moment(req.body.endDate).format('L') // TODO
      let currentDate = moment().format("L");
      let startNewDate = moment(currentDate).startOf("date").format();
      let endNewDate = moment(currentDate).endOf("date", "day").format();

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
            "service_appointments.appointedDate as appointedDate",
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
            "service_requests.createdAt as dateCreated",
          ])
          .where({ "service_requests.orgId": req.orgId })
          .where("service_appointments.appointedDate", "=", currentDate)
          .where({
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "service_appointments",
          })
          .orWhere({
            "assigned_service_additional_users.userId": id,
            "assigned_service_additional_users.entityType":
              "service_appointments",
          })
          .whereIn("service_requests.projectId", projectIds)
          .distinct("service_requests.id")
          .orderBy("service_requests.id", "desc");
      }

      let result2;
      if (roles.includes("superAdmin") || roles.includes("orgAdmin")) {
        result2 = await knex
          .from("survey_orders As o")
          .where((qb) => {
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
          .where((qb) => {
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
            "assigned_service_team.entityType": "survey_orders",
          })
          .orWhere({
            "assigned_service_additional_users.userId": id,
            "assigned_service_additional_users.entityType": "survey_orders",
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
            "assigned_service_team.id",
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
            "users.name as mainUser",
          ])
          .where({ "task_group_schedule_assign_assets.orgId": req.orgId })
          .whereBetween("task_group_schedule_assign_assets.pmDate", [
            startNewDate,
            endNewDate,
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
            "users.name as mainUser",
          ])
          .where({
            "task_group_schedule_assign_assets.orgId": req.orgId,
            "assigned_service_team.userId": id,
            "assigned_service_team.entityType": "work_order",
          })
          // .orWhere({ 'assigned_service_additional_users.userId': id, 'assigned_service_additional_users.entityType': 'pm_task_groups' })
          .whereBetween("task_group_schedule_assign_assets.pmDate", [
            startNewDate,
            endNewDate,
          ])
          .whereIn("pm_task_groups.companyId", reqData.formData.companyIds)
          .orderBy("task_group_schedule_assign_assets.id", "desc");
      }

      return res.status(200).json({
        data: {
          ServiceAppointments: _.uniqBy(result, "id").length,
          SurveyAppointments: _.uniqBy(result2, "id").length,
          WorkOrders: result3.length,
        },
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
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
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();
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
            "incident_categories.descriptionEng",
          ])
          .where({
            "service_requests.orgId": req.orgId,
            "incident_sub_categories.incidentTypeId": problemTypeId,
          })
          .whereBetween("service_requests.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .where({ "service_requests.isCreatedFromSo": false })
          .distinct("service_requests.id")
          .orderBy("service_requests.id", "desc");
        // let grouped = _.groupBy(problems, 'categoryCode')
        // let problemCounts = Object.keys(grouped).map(category => ({totalServiceRequests:grouped[category].length,category}))
        final.push({
          date: moment(d).format("L"),
          totalServiceRequest: problems.length,
        });
      }

      return res.status(200).json({
        data: final,
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
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
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();
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
            "incident_categories.descriptionEng",
          ])
          .where({
            "service_requests.orgId": req.orgId,
            "incident_sub_categories.incidentTypeId": problemTypeId,
          })
          .where({ "service_requests.orgId": req.orgId })
          .whereBetween("service_requests.createdAt", [
            currentStartTime,
            currentEndTime,
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
          .filter((v) => !_.isEmpty(v))
          .map((v) => _.keys(v).map((p) => ({ [p]: v[p].length })))
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
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
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
          "incident_categories.descriptionEng",
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

      final = final.map((obj) => {
        obj["Others"] = obj[null];
        delete obj[null];
        return obj;
      });

      let finalData = _.flatten(
        final
          .filter((v) => !_.isEmpty(v))
          .map((v) => _.keys(v).map((p) => ({ [p]: v[p].length })))
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
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /* GET ALL ALLOW COMPANY LIST */
  getAllowAllCompanyList: async (req, res) => {
    try {
      let projectIds = [];
      let userId = req.me.id;

      const accessibleProjects = req.userProjectResources;

      if (accessibleProjects.length) {
        for (let pro of accessibleProjects) {
          if (pro.projects.length) {
            for (let projectId of pro.projects) {
              console.log(
                "project=========",
                pro.projects,
                "==========================================="
              );

              projectIds.push(projectId);
            }
          }
        }
      }

      projectIds = _.uniqBy(projectIds);

      let companyResult = await knex
        .from("projects")
        .select(["companyId", "projectName", "project as projectCode"])
        .whereIn("projects.id", projectIds)
        .where({ orgId: req.orgId });

      let companyIds = companyResult.map((v) => v.companyId);

      companyIds = _.uniqBy(companyIds);

      let companyData = await knex
        .from("companies")
        .select(["id", "companyName", "companyId"])
        .whereIn("companies.id", companyIds)
        .orderBy("companies.companyName", "asc")
        .where({ isActive: true, orgId: req.orgId });


      let userInfo = await knex("application_user_roles")
        .where({ userId: userId, roleId: 3 });

      return res.status(200).json({
        data: {
          companyData,
          companyIds,
          userInfo
        },
        message: "Company List Successfully!",
      });
    } catch (err) {
      console.log("[controllers][dashboard][getAssesList] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
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

        .where({
          "service_requests.isCreatedFromSo": false,
          "service_requests.moderationStatus": true,
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");

      let final = [];
      let grouped = _.groupBy(problems, "Type");
      final.push(grouped);

      let chartData = _.flatten(
        final
          .filter((v) => !_.isEmpty(v))
          .map((v) => _.keys(v).map((p) => ({ [p]: v[p].length })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      // let final2 = [];

      // let ch = _.flatten(
      //   final
      //     .filter(v => !_.isEmpty(v))
      //     .map(v => _.keys(v).map(p => ({

      //       [p]: Array(_.groupBy(v[p], "priority")).map(x => _.keys(x).map(y => ({ [y]: x[y].length })))

      //     })))
      // ).reduce((a, p) => {
      //   let l = _.keys(p)[0];
      //   if (a[l]) {
      //     a[l] += p[l];
      //   } else {
      //     a[l] = p[l];
      //   }
      //   return a;
      // }, {});

      // let ch2 = _.flatten(
      //   final
      //     .filter(v => !_.isEmpty(v))
      //     .map(v => Object.keys(v).map(p =>
      //       p

      //     ))
      // )

      // final2.push(ch);

      // let chart2 = _.flatten(
      //   final2
      //     .filter(v => !_.isEmpty(v))
      //     .map(v =>

      //       _.keys(v).map(p => ({ [p]: v[p] }))

      //       //_.keys(v).map(p => ({ [p]: v[p].map(x => _.keys(x).map(y => ({ [y]: x[y] }))) }))

      //       //console.log("vvvvvvvvvv",_.keys(v),"vvvvvvvvvvvvvvvvvvvvvvvvvvv")

      //       //   _.keys(v).map(p => ({

      //       //   //[p]: v[p]

      //       // }))
      //     )
      // )

      let priorityGroup = _.groupBy(problems, "priority");
      let finalPriority = [];
      finalPriority.push(priorityGroup);

      let priorityChartData = _.flatten(
        finalPriority
          .filter((v) => !_.isEmpty(v))
          .map((v) =>
            _.keys(v).map((p) => ({
              [p]: v[p],
            }))
          )
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      let priorityKeys = Object.keys(priorityChartData);

      let barChartData = [];

      let i = 0;
      let arrKey = [];

      for (let p of priorityKeys) {
        let m = [];

        for (let n of priorityKeys) {
          m.push("");
        }

        let prData = Object.values(priorityChartData)[i];
        i++;

        let d = getProblemTypeChart(p, prData);
        let l = m.length;

        barChartData.push({
          priority: p,
          data: d,
          m,
        });
      }

      let prG = _.groupBy(problems, "priority");
      let f = [];
      f.push(prG);
      let arr1 = [];

      let x = _.flatten(
        f
          .filter((v) => !_.isEmpty(v))
          .map((v) =>
            _.keys(v).map((p) => ({
              [p]: v[p],
            }))
          )
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      let ky = Object.keys(x);

      // let m = chart2.map(v =>

      //  // _.keys(v).map(p => v[p].map(x => _.keys(x).map(y => ({ [y]: x[y] }))))

      //   //console.log("vvvvvvvvvvvvvvvvvvv", v, "==============================");

      // )

      //  const Parallel = require('async-parallel');

      // problems = await Parallel.map(problems, async st => {

      //   return {
      //     ...st,
      //     chartData,
      //   }

      // })

      let yrr = [];

      // let i = 0;
      // for (let a of ky) {

      //   let b = Object.values(x)[i];
      //   i++;

      //   let d = getProblemTypeChart(a, b);

      //   if (a == "Medium") {

      //     d = [0, 1];
      //   }

      //   //let d = problems.filter(v => v.priority == a);
      //   yrr.push({
      //     priority: a, data: d, b: b
      //   })

      // }

      res.status(200).json({
        data: {
          problems,
          chartData,
          //grouped,
          //final,
          //ch,
          //ch2,
          //chart2,
          prG,
          // arr1,
          x,
          ky,
          yrr,
          barChartData,
        },
        message: "Service Request by problem type data successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*GET SERVICE REQUEST DATA BY PRIORITY  FOR CHART */
  getServiceRequestByPriorityChartdata: async (req, res) => {
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
        .leftJoin(
          "service_status AS status",
          "service_requests.serviceStatusCode",
          "status.statusCode"
        )
        .select([
          "service_problems.serviceRequestId",
          "incident_type.typeCode as Type",
          "incident_categories.descriptionEng",
          "service_requests.priority",
          "status.descriptionEng as status",
        ])
        .where({
          "service_requests.orgId": req.orgId,
        })
        .where({ "service_requests.orgId": req.orgId })

        .where({
          "service_requests.isCreatedFromSo": false,
          "service_requests.moderationStatus": true,
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");

      let final = [];
      let grouped = _.groupBy(problems, "priority");
      final.push(grouped);

      let chartData = _.flatten(
        final
          .filter((v) => !_.isEmpty(v))
          .map((v) => _.keys(v).map((p) => ({ [p]: v[p].length })))
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
          .filter((v) => !_.isEmpty(v))
          .map((v) =>
            _.keys(v).map((p) => ({
              [p]: _.groupBy(v[p], "priority"),
            }))
          )
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
          .filter((v) => !_.isEmpty(v))
          .map((v) => Object.keys(v).map((p) => p))
      );

      final2.push(ch);

      let chart2 = _.flatten(
        final2
          .filter((v) => !_.isEmpty(v))
          .map(
            (v) => _.keys(v).map((p) => ({ [p]: v[p] }))

            //_.keys(v).map(p => ({ [p]: v[p].map(x => _.keys(x).map(y => ({ [y]: x[y] }))) }))

            //console.log("vvvvvvvvvv",_.keys(v),"vvvvvvvvvvvvvvvvvvvvvvvvvvv")

            //   _.keys(v).map(p => ({

            //   //[p]: v[p]

            // }))
          )
      );

      let prG = _.groupBy(problems, "priority");
      let f = [];
      f.push(prG);
      let arr1 = [];

      let x = _.flatten(
        f
          .filter((v) => !_.isEmpty(v))
          .map((v) =>
            _.keys(v).map((p) => ({
              [p]: v[p],
            }))
          )
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      // let m = chart2.map(v =>

      //  // _.keys(v).map(p => v[p].map(x => _.keys(x).map(y => ({ [y]: x[y] }))))

      //   //console.log("vvvvvvvvvvvvvvvvvvv", v, "==============================");

      // )

      const Parallel = require("async-parallel");

      problems = await Parallel.map(problems, async (st) => {
        return {
          ...st,
          chartData,
        };
      });

      let statusGroup = _.groupBy(problems, "status");
      let finalStatus = [];
      finalStatus.push(statusGroup);

      let statusChartData = _.flatten(
        finalStatus
          .filter((v) => !_.isEmpty(v))
          .map((v) =>
            _.keys(v).map((p) => ({
              [p]: v[p],
            }))
          )
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      let statusKeys = Object.keys(statusChartData);

      let barChartData = [];

      let i = 0;
      let arrKey = [];

      for (let p of statusKeys) {
        let m = [];

        for (let n of statusKeys) {
          m.push("");
        }

        let prData = Object.values(statusChartData)[i];
        i++;

        let d = getPriorityChart(p, prData);
        let l = m.length;

        barChartData.push({
          status: p,
          data: d,
          m,
        });
      }

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
          x,
          barChartData,
        },
        message: "Service Request by priority data successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*GET SERVICE REQUEST DATA BY MONTH PRIORITY  FOR CHART */
  getServiceRequestByMonthPriorityChartdata: async (req, res) => {
    try {
      let payload = req.body;
      let startMonth;
      let endMonth;

      if (Number(payload.startMonth) <= 9) {
        startMonth = "0" + Number(payload.startMonth);
      } else {
        startMonth = Number(payload.startMonth);
      }

      if (Number(payload.endMonth) <= 9) {
        endMonth = "0" + Number(payload.endMonth);
      } else {
        endMonth = Number(payload.endMonth);
      }

      let lastDay;

      if (endMonth == "1") {
        lastDay = 31;
      } else if (endMonth == "2") {
        lastDay = 28;
      } else if (endMonth == "3") {
        lastDay = 31;
      } else if (endMonth == "4") {
        lastDay = 30;
      } else if (endMonth == "5") {
        lastDay = 31;
      } else if (endMonth == "6") {
        lastDay = 30;
      } else if (endMonth == "7") {
        lastDay = 31;
      } else if (endMonth == "8") {
        lastDay = 31;
      } else if (endMonth == "9") {
        lastDay = 30;
      } else if (endMonth == "10") {
        lastDay = 31;
      } else if (endMonth == "11") {
        lastDay = 30;
      } else if (endMonth == "12") {
        lastDay = 31;
      }
      let year = payload.startYear;
      let fromDate = year + "-" + startMonth + "-" + "01";
      let toDate = year + "-" + endMonth + "-" + lastDay;

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
          knex.raw(
            `to_char(to_timestamp(service_requests."createdAt"/1000),'YYYY-mm') as Date`
          ),
        ])
        .whereRaw(
          `to_char(to_timestamp(service_requests."createdAt"/1000),'YYYY-MM-DD') BETWEEN '${fromDate}' and '${toDate}'`
        )
        //.whereRaw(`to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}')`)
        .where({
          "service_requests.orgId": req.orgId,
        })
        .where({ "service_requests.orgId": req.orgId })

        .where({
          "service_requests.isCreatedFromSo": false,
          "service_requests.moderationStatus": true,
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "asc");

      let final = [];
      let grouped = _.groupBy(problems, "date");
      final.push(grouped);

      let chartData = _.flatten(
        final
          .filter((v) => !_.isEmpty(v))
          .map((v) => _.keys(v).map((p) => ({ [p]: v[p].length })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      let priorityGroup = _.groupBy(problems, "priority");
      let finalPriority = [];
      finalPriority.push(priorityGroup);

      let priorityChartData = _.flatten(
        finalPriority
          .filter((v) => !_.isEmpty(v))
          .map((v) =>
            _.keys(v).map((p) => ({
              [p]: v[p],
            }))
          )
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];
        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      let priorityKeys = Object.keys(priorityChartData);

      let barChartData = [];

      let i = 0;
      let arrKey = [];

      for (let p of priorityKeys) {
        let m = [];

        for (let n of priorityKeys) {
          m.push("");
        }

        let prData = Object.values(priorityChartData)[i];
        i++;

        let d = getMonthChart(p, prData);
        let l = m.length;

        barChartData.push({
          priority: p,
          data: d,
          m,
        });
      }

      res.status(200).json({
        data: {
          problems,
          chartData,
          grouped,
          final,
          barChartData,
        },
        message: "Service Request by month priority data successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getCmDashboardData: async (req, res) => {
    try {
      let orgId = req.orgId;
      const accessibleProjects = req.userProjectResources[0].projects;
      let payload = req.body;

      let startNewDate = moment(payload.startDate).startOf("date").format();
      let endNewDate = moment(payload.endDate).endOf("date", "day").format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();

      serviceReqId = await knex
        .from("service_requests")
        .select("service_requests.id")
        .distinct("service_requests.id")
        .where({ orgId: req.orgId })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where({
          orgId: orgId,
          moderationStatus: true,
        })
        .where((qb) => {
          if (payload.projectId) {
            qb.where("service_requests.projectId", payload.projectId)
          }
        })

      serviceReqId = serviceReqId.map((v) => v.id);
      serviceReqId = _.uniqBy(serviceReqId);
      console.log("serviceORequestId", serviceReqId);


      const [openRequests, openOrders, openSurveys] = await Promise.all([
        knex
          .from("service_requests")
          .select("service_requests.serviceStatusCode as status")
          .distinct("service_requests.id")
          .where({ moderationStatus: true, orgId: req.orgId })
          .whereIn("service_requests.projectId", accessibleProjects)
          .whereIn("serviceStatusCode", ["O"])
          .where((qb) => {
            if (currentStartTime && currentEndTime) {
              qb.whereBetween("service_requests.createdAt", [
                currentStartTime,
                currentEndTime,
              ])
            }
            if (payload.projectId) {
              qb.where("service_requests.projectId", payload.projectId)
            }
          }),

        knex
          .from("service_orders")
          .leftJoin(
            "service_requests",
            "service_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
          .whereIn('status.descriptionEng', ["Open", "Approved", "In Progress", "On Hold"])
          .where({ "service_orders.orgId": req.orgId })
          .whereIn("service_requests.projectId", accessibleProjects)
          .where((qb) => {
            if (currentStartTime && currentEndTime) {
              qb.whereBetween("service_orders.createdAt", [
                currentStartTime,
                currentEndTime,
              ])
            }
            if (payload.projectId) {
              qb.where("service_requests.projectId", payload.projectId)
            }
          }),


        knex
          .from("survey_orders")
          .select("survey_orders.surveyOrderStatus as status")
          .distinct("survey_orders.id")
          .where({
            orgId: orgId,
            surveyOrderStatus: 'Pending',
          })
          .whereIn("survey_orders.serviceRequestId", serviceReqId)
          .where((qb) => {
            if (currentStartTime && currentEndTime) {
              qb.whereBetween("survey_orders.createdAt", [
                currentStartTime,
                currentEndTime,
              ])
            }
           
          }),


      ]);

      let open_service_requests = accessibleProjects.length ? openRequests.length : 0;
      let open_service_orders = accessibleProjects.length ? openOrders.length : 0;
      let open_survey_orders = accessibleProjects.length ? openSurveys.length : 0;
      // let open_overdue_work_orders = accessibleProjects.length ? overDueWOrders.length : 0;

      return res.status(200).json({
        data: {
          open_service_requests,
          open_service_orders,
          open_survey_orders,

        },
        message: "Dashboard data",
      });
    } catch (err) {
      console.log("[controllers][dashboard][cmDashboardData] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getServiceTaskAssignedToTecnicianChartData: async (req, res) => {
    try {


      let reqData = req.body;
      let projectId = req.body.projectId;

      let startNewDate = moment(reqData.startDate).startOf("date").format();
      let endNewDate = moment(reqData.endDate).endOf("date", "day").format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();

      const accessibleProjects = req.userProjectResources[0].projects;

      let assignedTechnician = await knex
        .from("assigned_service_team")
        .leftJoin("users", "assigned_service_team.userId", "users.id")
        .leftJoin("service_requests", "assigned_service_team.entityId", "service_requests.id")
        .select([
          "users.name as technician",
          "users.id",
          "users.userName"
        ])
        .where({ "service_requests.orgId": req.orgId })
        .where({ "service_requests.isCreatedFromSo": false })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where((qb) => {
          if (projectId) {
            qb.where("service_requests.projectId", projectId)
          }
        })
        .where((qb) => {
          qb.where("assigned_service_team.entityType", 'service_requests')
          qb.orWhere("assigned_service_team.entityType", 'service_orders')
        })

      assignedTechnician = _.uniqBy(assignedTechnician, "id")

      console.log("list of technician", assignedTechnician)

      let final = [];
      [totalServiceRequest, totalServiceOrder] = await Promise.all([
        knex
          .count("* as totalServiceRequest")
          .select("users.name as technician")
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
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .where({ "service_requests.orgId": req.orgId})
          .whereBetween("service_requests.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .where({ "service_requests.isCreatedFromSo": false })
          .whereIn("service_requests.projectId", accessibleProjects)
          .where((qb) => {
            if (projectId) {
              qb.where("service_requests.projectId", projectId)
            }
          })
          .where("assigned_service_team.entityType", 'service_requests')
          .groupBy("technician"),

        knex
          .count("* as totalServiceOrder")
          .select("users.name as technician")
          .from("service_orders")
          .leftJoin(
            "service_requests",
            "service_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .where({ "service_orders.orgId": req.orgId})
          .whereBetween("service_orders.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .whereIn("service_requests.projectId", accessibleProjects)
          .where((qb) => {
            if (projectId) {
              qb.where("service_requests.projectId", projectId)
            }
          })
          .where("assigned_service_team.entityType", 'service_orders')
          .groupBy("technician")
      ]);

      console.log("[controllers][dashboard][technicianTasks] :  technician tasks", totalServiceOrder, totalServiceRequest);


      final = Object.values([...totalServiceRequest, ...totalServiceOrder,...assignedTechnician].reduce((acc, cur) => {
        let uniqTech = cur['technician'];
        acc[uniqTech] = { ...acc[uniqTech], ...cur } || cur;
        return acc;
      }, {}));




      console.log("[controllers][dashboard][technicianTasks] : technician with tasks", final);


      return res.status(200).json({
        data: {
          final
        }
      })

    } catch (err) {
      console.log("[controllers][dashboard][technicianTasks] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getServiceRequestServiceOrderChartData: async (req, res) => {
    try {
      const reqData = req.body;
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

      let projectId = reqData.projectId;

      let final = [];
      for (let d of dates) {
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();

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
              "teams.teamCode",
            ])
            .where({ "service_requests.orgId": req.orgId })
            .whereBetween("service_requests.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .where({ "service_requests.isCreatedFromSo": false })
            .whereIn("service_requests.projectId", accessibleProjects)
            .where((qb) => {
              if (projectId) {
                qb.where("service_requests.projectId", projectId)
              }
            })
            .distinct("service_requests.id")
            .orderBy("service_requests.id", "desc"),
          knex
            .from("service_orders")
            .leftJoin(
              "service_requests",
              "service_orders.serviceRequestId",
              "service_requests.id"
            )
            .select([
              "service_orders.id as SoId",
              "service_orders.createdAt as dateCreated",
            ])
            .orderBy("service_orders.id", "desc")
            .where({ "service_orders.orgId": req.orgId })
            .whereBetween("service_orders.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .whereIn("service_requests.projectId", accessibleProjects)
            .where((qb) => {
              if (projectId) {
                qb.where("service_requests.projectId", projectId)
              }
            }),
        ]);

        final.push({
          date: moment(d).format("L"),
          totalServiceRequest: _.uniqBy(totalServiceRequest, "id").length,
          totalServiceOrder: _.uniqBy(totalServiceOrder, "SoId").length,
        });
      }

      res.status(200).json({
        data: { final },
        message: "records",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getServiceRequestPieChartData: async (req, res) => {
    try {
      let payload = req.body;
      let projectId = req.body.projectId;

      let completedServiceRequest
      let inProgressServiceRequest
      let onHoldServiceRequest
      let approvedServiceRequest
      let openServiceRequest
      let underSurveyServicerequest

      let startNewDate = moment(payload.startDate).startOf("date").format();
      let endNewDate = moment(payload.endDate).endOf("date", "day").format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();

      // console.log("start and end date", currentStartTime, currentEndTime)



      const accessibleProjects = req.userProjectResources[0].projects;

      // if (currentEndTime && currentStartTime) {

      completedServiceRequest = await knex
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
          "teams.teamCode",
        ])
        .where({ "service_requests.orgId": req.orgId, "service_requests.serviceStatusCode": 'COM' })
        .whereBetween("service_requests.createdAt", [
          currentStartTime,
          currentEndTime,
        ])
        .where({ "service_requests.isCreatedFromSo": false })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where((qb) => {
          if (projectId) {
            qb.where("service_requests.projectId", projectId)
          }
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");

      inProgressServiceRequest = await knex
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
          "teams.teamCode",
        ])
        .where({ "service_requests.orgId": req.orgId, "service_requests.serviceStatusCode": 'IP' })
        .whereBetween("service_requests.createdAt", [
          currentStartTime,
          currentEndTime,
        ])
        .where({ "service_requests.isCreatedFromSo": false })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where((qb) => {
          if (projectId) {
            qb.where("service_requests.projectId", projectId)
          }
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");

      onHoldServiceRequest = await knex
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
          "teams.teamCode",
        ])
        .where({ "service_requests.orgId": req.orgId, "service_requests.serviceStatusCode": 'OH' })
        .whereBetween("service_requests.createdAt", [
          currentStartTime,
          currentEndTime,
        ])
        .where({ "service_requests.isCreatedFromSo": false })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where((qb) => {
          if (projectId) {
            qb.where("service_requests.projectId", projectId)
          }
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");

      approvedServiceRequest = await knex
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
          "teams.teamCode",
        ])
        .where({ "service_requests.orgId": req.orgId, "service_requests.serviceStatusCode": 'A' })
        .whereBetween("service_requests.createdAt", [
          currentStartTime,
          currentEndTime,
        ])
        .where({ "service_requests.isCreatedFromSo": false })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where((qb) => {
          if (projectId) {
            qb.where("service_requests.projectId", projectId)
          }
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");

      openServiceRequest = await knex
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
          "teams.teamCode",
        ])
        .where({ "service_requests.orgId": req.orgId, "service_requests.serviceStatusCode": 'O' })
        .whereBetween("service_requests.createdAt", [
          currentStartTime,
          currentEndTime,
        ])
        .where({ "service_requests.isCreatedFromSo": false })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where((qb) => {
          if (projectId) {
            qb.where("service_requests.projectId", projectId)
          }
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");

      underSurveyServicerequest = await knex
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
          "teams.teamCode",
        ])
        .where({ "service_requests.orgId": req.orgId, "service_requests.serviceStatusCode": 'US' })
        .whereBetween("service_requests.createdAt", [
          currentStartTime,
          currentEndTime,
        ])
        .where({ "service_requests.isCreatedFromSo": false })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where((qb) => {
          if (projectId) {
            qb.where("service_requests.projectId", projectId)
          }
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");

      inProgressServiceRequest = await knex
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
          "teams.teamCode",
        ])
        .where({ "service_requests.orgId": req.orgId, "service_requests.serviceStatusCode": 'IP' })
        .whereBetween("service_requests.createdAt", [
          currentStartTime,
          currentEndTime,
        ])
        .where({ "service_requests.isCreatedFromSo": false })
        .whereIn("service_requests.projectId", accessibleProjects)
        .where((qb) => {
          if (projectId) {
            qb.where("service_requests.projectId", projectId)
          }
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");


      // }

      let Open = openServiceRequest.length
      let Completed = completedServiceRequest.length
      let In_Progress = inProgressServiceRequest.length
      let On_Hold = onHoldServiceRequest.length
      let Approved = approvedServiceRequest.length
      let Under_Survey = underSurveyServicerequest.length


      return res.status(200).json({
        data: {
          Open,
          Completed,
          "In Progress": In_Progress,
          "On Hold": On_Hold,
          Approved,
          "Under Survey": Under_Survey
        }
      })

    } catch (err) {

      console.log(
        "[controllers][CM_dashboard][get Pie chart] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getPieChartForProblemType: async (req, res) => {
    try {
      let problems = null;

      let payload = req.body;

      let startNewDate = moment(payload.startDate).startOf("date").format();
      let endNewDate = moment(payload.endDate).endOf("date", "day").format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();

      let final = [];
      // for (let d of dates) {

      const accessibleProjects = req.userProjectResources[0].projects;
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
          "incident_categories.descriptionEng",
        ])
        .where({
          "service_requests.orgId": req.orgId,
        })
        .where({ "service_requests.orgId": req.orgId })
        .whereIn("property_units.projectId", accessibleProjects)
        .whereBetween("service_requests.createdAt", [
          currentStartTime,
          currentEndTime,
        ])
        .where({ "service_requests.isCreatedFromSo": false })
        .where((qb) => {
          if (payload.projectId) {
            qb.where("property_units.projectId", payload.projectId)
          }
        })
        .distinct("service_requests.id")
        .orderBy("service_requests.id", "desc");


      let grouped = _.groupBy(problems, "categoryCode");

      // let problemWise = _.keys(grouped).map(category => ({totalServiceRequests:grouped[category].length,category}))
      final.push(grouped); //totalServiceRequest: problems.length })
      //}

      // console.log("Final data", final)


      final = final.map((obj) => {
        obj["Others"] = obj[null];
        delete obj[null];
        return obj;
      });

      let finalData = _.flatten(
        final
          .filter((v) => !_.isEmpty(v))
          .map((v) => _.keys(v).map((p) => ({ [p]: v[p] ? v[p].length : 0 })))
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
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
};

function getProblemTypeChart(priority, data) {
  let d = _.groupBy(data, "Type");

  let n = Object.keys(d);
  let arr = [];
  let arr1 = [""];

  let i = 0;
  for (let g of n) {
    for (let k of n) {
      //arr1.push("");
    }

    let ind = n.indexOf(g);

    let l = Object.values(d)[i].length;
    let l2;
    if (l) {
      l2 = l;
    } else {
      l2 = 0;
    }
    i++;

    arr1.splice(ind + 1 - 1, 0, l);

    arr.push(arr1, ind);
  }

  return arr1;
}

function getPriorityChart(priority, data) {
  let d = _.groupBy(data, "priority");

  let n = Object.keys(d);
  let arr = [];
  let arr1 = [""];

  let i = 0;
  for (let g of n) {
    for (let k of n) {
      //arr1.push("");
    }

    let ind = n.indexOf(g);

    let l = Object.values(d)[i].length;
    let l2;
    if (l) {
      l2 = l;
    } else {
      l2 = 0;
    }
    i++;

    arr1.splice(ind + 1 - 1, 0, l);

    arr.push(arr1, ind);
  }

  return arr1;
}

function getMonthChart(priority, data) {
  let d = _.groupBy(data, "date");

  let n = Object.keys(d);
  let arr = [];
  let arr1 = [""];

  let i = 0;
  for (let g of n) {
    for (let k of n) {
      //arr1.push("");
    }

    let ind = n.indexOf(g);

    let l = Object.values(d)[i].length;
    let l2;
    if (l) {
      l2 = l;
    } else {
      l2 = 0;
    }
    i++;

    arr1.splice(ind + 1 - 1, 0, l);

    arr.push(arr1, ind);
  }

  return arr1;
}

module.exports = dashboardController;
