const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");

const knex = require("../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const AWS = require("aws-sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const https = require("https");

const imageHelper = require("../helpers/image");
const { innerJoin } = require("../db/knex");
const surveyAppointmentNotification = require("../notifications/service-request/survey-appointment-notification");
const surveyAppointmentAssignUserNotification = require("../notifications/service-request/survey-appointment-assign-user-notification");

const surveyOrderController = {
  addSurveyOrder: async (req, res) => {
    try {
      let surveyOrder = null;
      let additionalUsers = [];
      let userId = req.me.id;
      let surveyOrderPayload = req.body;
      let surveyOrderId;
      let assignedServiceTeam;
      let serviceRequestResult;
      let userResult;
      let requestResult;
      let userResult2;
      let allUserIds = [];
      let assignUserResult;

      let initialSurveyOrderPayload = _.omit(
        surveyOrderPayload,
        ["additionalUsers", "teamId", "mainUserId"]
      );

      const schema = Joi.object().keys({
        serviceRequestId: Joi.string().required(),
        appointedDate: Joi.string().required(),
        appointedTime: Joi.string().required(),
      });

      let result = Joi.validate(
        initialSurveyOrderPayload,
        schema
      );
      console.log(
        "[controllers][surveyOrder][addSurveyOrder]: JOi Result",
        result
      );

      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let currentTime = new Date().getTime();

      let sender = await knex
        .from("users")
        .where({ id: req.me.id })
        .first();
      let ALLOWED_CHANNELS = [
        "IN_APP",
        "EMAIL",
        "WEB_PUSH",
        "SOCKET_NOTIFY",
      ];

      await knex.transaction(async (trx) => {
        let propertyUnit = await knex
          .select(["companyId"])
          .where({
            id: surveyOrderPayload.serviceRequestId,
          })
          .into("service_requests")
          .first();

        let insertSurveyOrderData = {
          ...initialSurveyOrderPayload,
          orgId: req.orgId,
          companyId: propertyUnit.companyId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime,
          isActive: true,
          surveyOrderStatus: "Pending",
        };

        // Insert into survey_orders table
        let surveyOrderResult = await knex
          .insert(insertSurveyOrderData)
          .returning(["*"])
          .transacting(trx)
          .into("survey_orders");
        surveyOrder = surveyOrderResult[0];

        surveyOrderId = surveyOrder.id;

        // Insert into assigned_service_team table

        let assignedServiceTeamPayload = {
          teamId: surveyOrderPayload.teamId,
          userId: surveyOrderPayload.mainUserId,
          entityId: surveyOrder.id,
          orgId: req.orgId,
          entityType: "survey_orders",
          createdAt: currentTime,
          updatedAt: currentTime,
        };

        const assignedServiceTeamResult = await knex
          .insert(assignedServiceTeamPayload)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_team");
        assignedServiceTeam = assignedServiceTeamResult[0];

        // Insert into assigned_service_additional_users

        let assignedServiceAdditionalUsers =
          surveyOrderPayload.additionalUsers;

        for (user of assignedServiceAdditionalUsers) {
          let userResult = await knex
            .insert({
              userId: user,
              entityId: surveyOrder.id,
              entityType: "survey_orders",
              orgId: req.orgId,
              createdAt: currentTime,
              updatedAt: currentTime,
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_additional_users");
          additionalUsers.push(userResult[0]);
        }

        await knex("service_requests")
          .update({ serviceStatusCode: "US" })
          .where({
            id: surveyOrderPayload.serviceRequestId,
          })
          .returning(["*"]);

        /*GET REQUEST BY & CREATED BY ID OPEN */
        let orgMaster = await knex
          .from("organisations")
          .where({ id: req.orgId })
          .first();

        serviceRequestResult = await knex(
          "service_requests"
        )
          .where({
            id: surveyOrderPayload.serviceRequestId,
            orgId: req.orgId,
          })
          .first();
        if (serviceRequestResult) {
          userResult = await knex("users")
            .select([
              "users.*",
              "application_user_roles.roleId",
            ])
            .innerJoin(
              "application_user_roles",
              "users.id",
              "application_user_roles.userId"
            )
            .where({
              "users.id": serviceRequestResult.createdBy,
              "application_user_roles.roleId": 4,
              "users.orgId": req.orgId,
            })
            .first();

          requestResult = await knex("requested_by")
            .where({
              id: serviceRequestResult.requestedBy,
              orgId: req.orgId,
            })
            .first();
          if (requestResult) {
            userResult2 = await knex("users")
              .select([
                "users.*",
                "application_user_roles.roleId",
              ])
              .innerJoin(
                "application_user_roles",
                "users.id",
                "application_user_roles.userId"
              )
              .where({
                "users.email": requestResult.email,
                "application_user_roles.roleId": 4,
                "users.orgId": req.orgId,
              })
              .first();
          }

          let appointmentDate = moment(
            initialSurveyOrderPayload.appointedDate
          ).format("YYYY-MM-DD");
          let appointmentTime =
            initialSurveyOrderPayload.appointedTime;

          let dataNos = {
            payload: {
              title: "Survey Appointment",
              url: "",
              description: `An Engineer as been appointed  for visit on ${appointmentDate} at ${appointmentTime} to Survey regarding your Service Request`,
              redirectUrl: "/user/service-request",
              orgData: orgMaster,
              thaiTitle: "นัดสำรวจ",
              thaiDetails: `นัดหมายช่างซ่อมเพื่อตรวจสอบ ในวัน ${appointmentDate} เวลา ${appointmentTime} ตามใบแจ้งคำร้องของท่านเรียบร้อย`,
            },
          };

          //let sender = await knex.from("users").where({ id: req.me.id }).first();
          let receiver;
          //let ALLOWED_CHANNELS = ["IN_APP", "EMAIL", "WEB_PUSH"];

          if (userResult) {
            receiver = userResult;
          } else {
            receiver = userResult2;
          }

          await surveyAppointmentNotification.send(
            sender,
            receiver,
            dataNos,
            ALLOWED_CHANNELS
          );
        }
        /*GET REQUEST BY & CREATED BY ID CLOSE */

        /*  SEND NOTIFICATION TO USER OPEN */
        let mainUser = surveyOrderPayload.mainUserId;
        let addUser = surveyOrderPayload.additionalUsers;
        allUserIds.push(...addUser, mainUser);

        assignUserResult = await knex("users")
          .where({ orgId: req.orgId })
          .whereIn("id", allUserIds);

        if (assignUserResult) {
          let dataNos2 = {
            payload: {
              title: "Survey Appointment Assigned",
              url: "",
              description: `A new survey appointment has been created and assigned to you.`,
              redirectUrl: "/admin/service-request",
              orgData: orgMaster,
            },
          };

          for (u of assignUserResult) {
            await surveyAppointmentAssignUserNotification.send(
              sender,
              u,
              dataNos2,
              ALLOWED_CHANNELS
            );
          }
        }

        /*  SEND NOTIFICATION TO USER CLOSE */

        trx.commit;
      });

      await knex("survey_orders")
        .update({ surveyInProcess: null })
        .where({ id: surveyOrderId });

      res.status(200).json({
        data: {
          surveyOrder,
          assignedServiceTeam,
          assignedAdditionalUsers: additionalUsers,
        },
        message: "Survey Order added successfully !",
      });
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][addSurveyOrder] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  updateSurveyOrder: async (req, res) => {
    try {
      let surveyOrder = null;
      let additionalUsers = [];

      await knex.transaction(async (trx) => {
        let surveyOrderPayload = req.body;
        let id = req.body.id;

        let initialSurveyOrderPayload = _.omit(
          surveyOrderPayload,
          ["additionalUsers", "teamId", "mainUserId", "id"]
        );

        const schema = Joi.object().keys({
          appointedDate: Joi.string().required(),
          appointedTime: Joi.string().required(),
        });

        let result = Joi.validate(
          initialSurveyOrderPayload,
          schema
        );
        console.log(
          "[controllers][surveyOrder][addSurveyOrder]: JOi Result",
          result
        );

        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        let currentTime = new Date().getTime();
        let insertSurveyOrderData = {
          ...initialSurveyOrderPayload,
          updatedAt: currentTime,
          isActive: true,
        };
        // Update into survey_orders table
        let surveyOrderResult = await knex
          .update(insertSurveyOrderData)
          .where({ id: id, orgId: req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("survey_orders");
        surveyOrder = surveyOrderResult[0];

        // Update status service_requests table
        let resultRequest = await knex(
          "survey_orders"
        ).where({
          isActive: "true",
          id: incidentRequestPayload.id,
          orgId: orgId,
        });

        serviceRequestId =
          resultRequest[0].serviceRequestId;

        let updateSRStatus = await knex
          .update({
            serviceStatusCode: "US",
            updatedAt: currentTime,
          })
          .where({ id: serviceRequestId, orgId: req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("service_request");

        // Update into assigned_service_team table

        let assignedServiceTeamPayload = {
          teamId: surveyOrderPayload.teamId,
          userId: surveyOrderPayload.mainUserId,
          updatedAt: currentTime,
        };
        const assignedServiceTeamResult = await knex
          .update(assignedServiceTeamPayload)
          .where({
            entityId: id,
            entityType: "survey_orders",
            orgId: req.orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_team");
        assignedServiceTeam = assignedServiceTeamResult[0];

        // Update into assigned_service_additional_users

        // Here 3 operations will take place
        /*
            1. Select users based on entity id and entity type
            2. Remove Those users 
            3. Add new users                    
        */
        let assignedServiceAdditionalUsers =
          surveyOrderPayload.additionalUsers;

        let selectedUsers = await knex
          .select()
          .where({
            entityId: id,
            entityType: "survey_orders",
            orgId: req.orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_additional_users")
          .map((user) => user.userId);

        if (
          _.isEqual(
            selectedUsers,
            assignedServiceAdditionalUsers
          )
        ) {
          // trx.commit
          trx.commit;
          return res.status(200).json({
            data: {
              surveyOrder,
              assignedServiceTeam,
              assignedAdditionalUsers: additionalUsers,
            },
            message: "Survey Order updated successfully !",
          });
        } else {
          // Remove old users

          for (user of selectedUsers) {
            await knex
              .del()
              .where({
                entityId: id,
                entityType: "survey_orders",
                orgId: req.orgId,
              })
              .returning(["*"])
              .transacting(trx)
              .into("assigned_service_additional_users");
          }

          // Insert New Users

          for (user of assignedServiceAdditionalUsers) {
            let userResult = await knex
              .insert({
                userId: user,
                entityId: id,
                entityType: "survey_orders",
                orgId: req.orgId,
                createdAt: currentTime,
                updatedAt: currentTime,
              })
              .returning(["*"])
              .transacting(trx)
              .into("assigned_service_additional_users");
            additionalUsers.push(userResult[0]);
          }
          trx.commit;
          return res.status(200).json({
            data: {
              surveyOrder,
              assignedServiceTeam,
              assignedAdditionalUsers: additionalUsers,
            },
            message: "Survey Order updated successfully !",
          });
        }
      });
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][addSurveyOrder] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getSurveyOrderList: async (req, res) => {
    try {
      let servicePayload = req.body;
      let serviceRequestId = req.body.serviceRequestId;
      let filterList = {};
      let newCreatedDate = "";
      let newCreatedDateTo = "";
      let completedFromDate = "";
      let completedToDate = "";
      let dueFromDate = "";
      let dueToDate = "";
      let compToDate = "";
      const accessibleProjects =
        req.userProjectResources[0].projects;

      let projectIds = req.accessibleProjects;

      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (servicePayload.isFilterActive == "true") {
        // SURVEY ORDER ID

        if (
          servicePayload.surveyOrderId != "undefined" &&
          servicePayload.surveyOrderId != "" &&
          servicePayload.surveyOrderId
        ) {
          filterList["o.id"] = servicePayload.surveyOrderId;
        }

        // SERVICE ID
        if (
          serviceRequestId != "undefined" &&
          serviceRequestId != "" &&
          serviceRequestId
        ) {
          filterList["s.id"] = serviceRequestId;
        }

        // STATUS
        if (
          servicePayload.status != "undefined" &&
          servicePayload.status != "" &&
          servicePayload.status
        ) {
          filterList["o.surveyOrderStatus"] =
            servicePayload.status;
        }

        // PRIORITY
        if (
          servicePayload.priority != "undefined" &&
          servicePayload.priority
        ) {
          filterList["s.priority"] =
            servicePayload.priority;
        }

        // LOCATION
        if (
          servicePayload.location != "undefined" &&
          servicePayload.location
        ) {
          filterList["s.location"] =
            servicePayload.location;
        }

        // ARCHIVE
        if (
          servicePayload.archive != "undefined" &&
          servicePayload.archive
        ) {
          filterList["o.archive"] = servicePayload.archive;
        }

        // ASSIGNED BY
        if (
          (servicePayload.assignedBy != "undefined",
          servicePayload.assignedBy != "" &&
            servicePayload.assignedBy)
        ) {
          filterList["o.createdBy"] =
            servicePayload.assignedBy;
        }

        // CREATED BY
        if (
          (servicePayload.createdBy != "undefined",
          servicePayload.createdBy != "" &&
            servicePayload.createdBy)
        ) {
          filterList["o.createdBy"] =
            servicePayload.createdBy;
        }

        // REQUESTED BY
        if (
          servicePayload.requestedBy != "undefined" &&
          servicePayload.requestedBy != "" &&
          servicePayload.requestedBy
        ) {
          filterList["s.requestedBy"] =
            servicePayload.requestedBy;
        }

        // COMPLETED BY
        if (
          servicePayload.completedBy != "undefined" &&
          servicePayload.completedBy != "" &&
          servicePayload.completedBy
        ) {
          filterList["o.completedBy"] =
            servicePayload.completedBy;
        }

        // SURVEY BETWEEN DATES
        if (
          servicePayload.surveyFrom != "undefined" &&
          servicePayload.surveyFrom != "" &&
          servicePayload.surveyFrom &&
          servicePayload.surveyTo != "undefined" &&
          servicePayload.surveyTo != "" &&
          servicePayload.surveyTo
        ) {
          let myDate = servicePayload.surveyFrom;
          console.log("fromDate", myDate);
          newCreatedDate = new Date(myDate).getTime();

          let myDateTo = servicePayload.surveyTo;
          console.log("toDate", myDateTo);
          newCreatedDateTo = new Date(myDateTo).getTime();
        }
        // COMPLETED DATES BETWEEN
        if (
          servicePayload.completedFrom != "undefined" &&
          servicePayload.completedFrom &&
          servicePayload.completedTo != "undefined" &&
          servicePayload.completedTo
        ) {
          let compFromDate = servicePayload.completedFrom;
          console.log("comfromDate", compFromDate);
          completedFromDate = new Date(
            compFromDate
          ).getTime();

          let compToDate = servicePayload.completedTo;
          console.log("comptoDate", compToDate);
          completedToDate = new Date(compToDate).getTime();
        }

        // DUE DATE
        if (
          servicePayload.dueDateFrom != "undefined" &&
          servicePayload.dueDateFrom != "" &&
          servicePayload.dueDateFrom &&
          servicePayload.dueDateTo != "undefined" &&
          servicePayload.dueDateTo != "" &&
          servicePayload.dueDateTo
        ) {
          let dueFromDate = servicePayload.dueDateFrom;
          console.log("duefromDate", dueFromDate);
          dueFromDate = new Date(dueFromDate).getTime();

          let dueToDate = servicePayload.dueDateTo;
          console.log("duetoDate", compToDate);
          dueToDate = new Date(dueToDate).getTime();
        }
        /**
         * SURVEY ORDER FILTER BY ASSIGNED TO
         */

        if (
          servicePayload.assignedTo != "undefined" &&
          servicePayload.assignedTo != "" &&
          servicePayload.assignedTo
        ) {
          filterList["st.userId"] =
            servicePayload.assignedTo;
        }
        console.log("Filter Query", filterList);

        /* Get List of survey order List By Filter Data */

        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("survey_orders as o")
          .where((qb) => {
            qb.where(filterList);
            if (newCreatedDate || newCreatedDateTo) {
              qb.whereBetween("o.createdAt", [
                newCreatedDate,
                newCreatedDateTo,
              ]);
            }
            if (completedFromDate || completedToDate) {
              qb.whereBetween("o.completedOn", [
                completedFromDate,
                completedToDate,
              ]);
            }
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [
                dueFromDate,
                dueToDate,
              ]);
            }
            qb.where("o.orgId", req.orgId);
          })
          .innerJoin(
            "service_requests as s",
            "o.serviceRequestId",
            "s.id"
          )
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
          .leftJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .leftJoin(
            "property_units",
            "s.houseId",
            "property_units.id"
          )
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
            "o.id AS surveyId",
            "o.serviceRequestId",
            // "status.descriptionEng AS Status",
            "o.surveyOrderStatus as Status",
            "status.statusCode AS surveyStatusCode",
            "u.id As createdUserId",
            "u.name AS appointedBy",
            "users.name AS assignedTo",
            "u.name AS createdBy",
            "o.appointedDate AS appointmentDate",
            "o.appointedTime AS appointmentTime",
            "o.createdAt AS createdAt",
            "teams.teamName as teamName",
            "assignUser.name  as Tenant Name",
            "o.displayId as SU No"
          )
          .where({
            "assigned_service_team.entityType":
              "survey_orders",
          })
          .whereIn("s.projectId", projectIds)
          .groupBy([
            "o.id",
            "s.id",
            "status.descriptionEng",
            "status.statusCode",
            "u.id",
            "users.id",
            "teams.teamId",
            "assigned_service_team.entityType",
            "assignUser.id",
            "user_house_allocation.id",
          ]);

        // For Get Rows In Pagination With Offset and Limit
        rows = await knex
          .select(
            "o.id as S Id",
            "s.description as Description",
            "o.appointedDate as Appointment Date",
            "o.appointedTime as Appointment Time",
            "users.name as Assigned To",
            "s.id as SR Id",
            "s.priority as Priority",
            "u.name as Created By",
            // "status.descriptionEng AS Status",
            "o.surveyOrderStatus as Status",
            "o.createdAt as Date Created",
            "teams.teamName as teamName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingDescription",
            "property_units.unitNumber",
            "incident_categories.descriptionEng as problemDescription",
            "requested_by.name as requestedBy",
            "assignUser.name  as Tenant Name",
            "o.displayId as SU No"
          )
          .from("survey_orders As o")
          .where((qb) => {
            qb.where(filterList);
            if (newCreatedDate || newCreatedDateTo) {
              qb.whereBetween("o.createdAt", [
                newCreatedDate,
                newCreatedDateTo,
              ]);
            }
            if (completedFromDate || completedToDate) {
              qb.whereBetween("o.completedOn", [
                completedFromDate,
                completedToDate,
              ]);
            }
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [
                dueFromDate,
                dueToDate,
              ]);
            }
            qb.where("o.orgId", req.orgId);
          })
          .where({
            "assigned_service_team.entityType":
              "survey_orders",
          })
          .innerJoin(
            "service_requests as s",
            "o.serviceRequestId",
            "s.id"
          )
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
          .leftJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin(
            "property_units",
            "s.houseId",
            "property_units.id"
          )
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
            "user_house_allocation",
            "s.houseId",
            "user_house_allocation.houseId"
          )
          .leftJoin(
            "users as assignUser",
            "user_house_allocation.userId",
            "assignUser.id"
          )
          .whereIn("s.projectId", projectIds)
          .orderBy("o.id", "desc")
          .offset(offset)
          .limit(per_page);
      } else if (
        servicePayload.isFilterActive == "false" &&
        servicePayload.serviceRequestId != ""
      ) {
        /* Get List of All survey order of particular service requests */

        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("survey_orders")
          .where({
            "survey_orders.serviceRequestId": serviceRequestId,
            "survey_orders.orgId": req.orgId,
            "assigned_service_team.entityType":
              "survey_orders",
          })
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin(
            "assigned_service_team",
            "survey_orders.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin(
            "users as u",
            "survey_orders.createdBy",
            "u.id"
          )
          .leftJoin(
            "teams",
            "assigned_service_team.teamId",
            "teams.teamId"
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

          .groupBy([
            "service_requests.id",
            "survey_orders.id",
            "assigned_service_team.id",
            "users.id",
            "u.id",
            "teams.teamId",
            "assigned_service_team.entityType",
            "assignUser.id",
            "user_house_allocation.id",
          ])
          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "survey_orders.appointedDate as Appointment Time",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "u.name as Created By",
            // "service_requests.serviceStatusCode as Status",
            "survey_orders.surveyOrderStatus as Status",
            "survey_orders.createdAt as Date Created",
            "teams.teamName as teamName",
            "assignUser.name  as Tenant Name",
            "survey_orders.displayId as SU No",
          ])
          .whereIn(
            "service_requests.projectId",
            projectIds
          );

        // For get the rows With pagination
        rows = await knex
          .from("survey_orders")
          .where({
            "survey_orders.serviceRequestId": serviceRequestId,
            "survey_orders.orgId": req.orgId,
            "assigned_service_team.entityType":
              "survey_orders",
          })
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin(
            "assigned_service_team",
            "survey_orders.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin(
            "users as u",
            "survey_orders.createdBy",
            "u.id"
          )
          .leftJoin(
            "service_status AS status",
            "service_requests.serviceStatusCode",
            "status.statusCode"
          )
          .leftJoin(
            "teams",
            "assigned_service_team.teamId",
            "teams.teamId"
          )
          .leftJoin(
            "user_house_allocation",
            "service_requests.houseId",
            "user_house_allocation.houseId"
          )
          .leftJoin(
            "users as assignUser",
            "user_house_allocation.userId",
            "assignUser.id"
          )

          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "survey_orders.appointedTime as Appointment Time",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "u.name as Created By",
            // "status.descriptionEng AS Status",
            "survey_orders.surveyOrderStatus as Status",
            "survey_orders.createdAt as Date Created",
            "teams.teamName as teamName",
            "assignUser.name  as Tenant Name",
            "survey_orders.displayId as SU No",
          ])
          .offset(offset)
          .whereIn("service_requests.projectId", projectIds)
          .limit(per_page);
      } else {
        /* Get List of All survey order With out Filter */

        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("survey_orders")
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin(
            "assigned_service_team",
            "survey_orders.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin(
            "users as u",
            "survey_orders.createdBy",
            "u.id"
          )
          .leftJoin(
            "service_status AS status",
            "service_requests.serviceStatusCode",
            "status.statusCode"
          )
          .leftJoin(
            "teams",
            "assigned_service_team.teamId",
            "teams.teamId"
          )
          .leftJoin(
            "user_house_allocation",
            "service_requests.houseId",
            "user_house_allocation.houseId"
          )
          .leftJoin(
            "users as assignUser",
            "user_house_allocation.userId",
            "assignUser.id"
          )

          .groupBy([
            "service_requests.id",
            "survey_orders.id",
            "assigned_service_team.entityType",
            "users.id",
            "u.id",
            "status.id",
            "teams.teamId",
            "assignUser.id",
            "user_house_allocation.id",
          ])
          .where({
            "survey_orders.orgId": req.orgId,
            "assigned_service_team.entityType":
              "survey_orders",
          })
          .whereIn("service_requests.projectId", projectIds)

          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "survey_orders.appointedTime as Appointment Time",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "u.name as Created By",
            "survey_orders.surveyOrderStatus as Status",
            // "status.descriptionEng AS Status",
            "survey_orders.createdAt as Date Created",
            "teams.teamName as teamName",
            "assignUser.name  as Tenant Name",
            "survey_orders.displayId as SU No",
            "service_requests.displayId as SR#",
          ]);

        // For get the rows With pagination
        rows = await knex
          .from("survey_orders")
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin(
            "assigned_service_team",
            "survey_orders.id",
            "assigned_service_team.entityId"
          )
          .leftJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin(
            "users as u",
            "survey_orders.createdBy",
            "u.id"
          )
          .leftJoin(
            "service_status AS status",
            "service_requests.serviceStatusCode",
            "status.statusCode"
          )
          .leftJoin(
            "teams",
            "assigned_service_team.teamId",
            "teams.teamId"
          )
          .leftJoin(
            "user_house_allocation",
            "service_requests.houseId",
            "user_house_allocation.houseId"
          )
          .leftJoin(
            "users as assignUser",
            "user_house_allocation.userId",
            "assignUser.id"
          )

          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "survey_orders.appointedTime as Appointment Time",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "u.name as Created By",
            "survey_orders.surveyOrderStatus as Status",
            // "status.descriptionEng AS Status",
            "survey_orders.createdAt as Date Created",
            "teams.teamName as teamName",
            "assignUser.name  as Tenant Name",
            "survey_orders.displayId as SU No",
            "service_requests.displayId as SR#",
          ])
          .where({
            "survey_orders.orgId": req.orgId,
            "assigned_service_team.entityType":
              "survey_orders",
          })
          .whereIn("service_requests.projectId", projectIds)

          .offset(offset)
          .limit(per_page);
      }

      let count = total.length;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = _.uniqBy(rows, "S Id");

      res.status(200).json({
        data: pagination,
        message: "Survey Orders List",
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getSurveyOrderListNew: async (req, res) => {
    try {
      let filterList = req.body;
      let total;
      let rows;
      const accessibleProjects =
        req.userProjectResources[0].projects;
      let projectIds = req.accessibleProjects;

      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let dueFromDate = filterList.dueDateFrom;
      console.log("duefromDate", dueFromDate);
      dueFromDate = new Date(dueFromDate).getTime();

      let dueToDate = filterList.dueDateTo;
      // console.log("duetoDate", compToDate);
      dueToDate = new Date(dueToDate).getTime();

      let filters = {};
      if (filterList.serviceRequestId) {
        filters["s.displayId"] =
          filterList.serviceRequestId;
      }
      if (filterList.surveyOrderId) {
        filters["o.displayId"] = filterList.surveyOrderId;
      }
      if (filterList.status) {
        filters["o.surveyOrderStatus"] = filterList.status;
      }
      if (filterList.company) {
        filters["o.companyId"] = filterList.company;
      }
      if (filterList.project) {
        filters["property_units.projectId"] =
          filterList.project;
      }

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("survey_orders as o")
          .where((qb) => {
            qb.where(filters);
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [
                dueFromDate,
                dueToDate,
              ]);
            }
            qb.where("o.orgId", req.orgId);
            if (filterList.description) {
              qb.where(
                "s.description",
                "ilike",
                `%${filterList.description}%`
              );
            }
            if (filterList.building) {
              qb.where(
                "buildings_and_phases.description",
                "ilike",
                `%${filterList.building}%`
              );
            }
            if (filterList.unitNo) {
              qb.where(
                "property_units.unitNumber",
                "ilike",
                `%${filterList.unitNo}%`
              );
            }
            if (filterList.tenantName) {
              qb.where(
                "assignUser.name",
                "ilike",
                `%${filterList.tenantName}%`
              );
            }
          })
          .innerJoin(
            "service_requests as s",
            "o.serviceRequestId",
            "s.id"
          )
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
          .leftJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .leftJoin(
            "property_units",
            "s.houseId",
            "property_units.id"
          )
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
            "companies",
            "o.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "property_units.projectId",
            "projects.id"
          )
          .where({
            "assigned_service_team.entityType":
              "survey_orders",
          })
          .whereIn("s.projectId", projectIds)
          .groupBy([
            "o.id",
            "s.id",
            "status.descriptionEng",
            "status.statusCode",
            "u.id",
            "users.id",
            "teams.teamId",
            "assigned_service_team.entityType",
            "companies.id",
            "projects.id",
          ]),
        knex
          .select(
            "o.id as S Id",
            "s.description as Description",
            "o.appointedDate as Appointment Date",
            "o.appointedTime as Appointment Time",
            "users.name as Assigned To",
            "s.id as SR Id",
            "s.priority as Priority",
            "u.name as Created By",
            "o.surveyOrderStatus as Status",
            "o.createdAt as Date Created",
            "teams.teamName as teamName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingDescription",
            "property_units.unitNumber",
            "incident_categories.descriptionEng as problemDescription",
            "requested_by.name as requestedBy",
            "o.displayId as SU#",
            "s.displayId as SR#",
            "companies.companyName",
            "companies.companyId",
            "projects.project",
            "projects.projectName"
          )
          .from("survey_orders As o")
          .where((qb) => {
            qb.where(filters);
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [
                dueFromDate,
                dueToDate,
              ]);
            }
            qb.where("o.orgId", req.orgId);
            if (filterList.description) {
              qb.where(
                "s.description",
                "ilike",
                `%${filterList.description}%`
              );
            }
            if (filterList.building) {
              qb.where(
                "buildings_and_phases.description",
                "ilike",
                `%${filterList.building}%`
              );
            }
            if (filterList.unitNo) {
              qb.where(
                "property_units.unitNumber",
                "ilike",
                `%${filterList.unitNo}%`
              );
            }
            if (filterList.tenantName) {
              qb.where(
                "assignUser.name",
                "ilike",
                `%${filterList.tenantName}%`
              );
            }
          })
          .where({
            "assigned_service_team.entityType":
              "survey_orders",
          })
          .innerJoin(
            "service_requests as s",
            "o.serviceRequestId",
            "s.id"
          )
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
          .leftJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin(
            "property_units",
            "s.houseId",
            "property_units.id"
          )
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
            "companies",
            "o.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "property_units.projectId",
            "projects.id"
          )
          .groupBy([
            "o.id",
            "s.id",
            "status.descriptionEng",
            "status.statusCode",
            "u.id",
            "users.id",
            "teams.teamId",
            "assigned_service_team.entityType",
            "companies.id",
            "projects.id",
            "buildings_and_phases.id",
            "property_units.id",
            "incident_categories.id",
            "requested_by.id",
          ])
          .whereIn("s.projectId", projectIds)
          .orderBy("o.createdAt", "desc")
          .offset(offset)
          .limit(per_page),
      ]);

      let count = total.length;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows;

      return res.status(200).json({
        data: pagination,
      });
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][addSurveyOrder] :  Error",
        err
      );
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getSurveyOrderDetails: async (req, res) => {
    try {
      let surveyOrder = null;
      let serviceRequest = null;

      //await knex.transaction(async (trx) => {
      let surveyOrderid = req.body.id;

      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });
      let result = Joi.validate(req.body, schema);
      console.log(
        "[controllers][surveyOrder][getSurveyOrderDetails]: JOi Result",
        result
      );

      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let results = await knex.raw(
        `select "survey_orders"."id" as "SId","service_requests"."description" as "description","survey_orders"."appointedDate" as "appointedDate","survey_orders"."appointedTime" as "appointedTime","users"."name" as "assignedTo","users"."email" as "email", "users"."mobileNo" as "mobileNo","teams"."teamName" as "teamName","service_requests"."id" as "SRId","service_requests"."priority" as "priority","survey_orders"."createdBy" as "createdBy", "survey_orders"."surveyOrderStatus" as "status","survey_orders"."createdAt" as "dateCreated" from "survey_orders" inner join "service_requests" on "survey_orders"."serviceRequestId" = "service_requests"."id" left join "assigned_service_team" on "survey_orders"."id" = "assigned_service_team"."entityId" left join "teams" on "assigned_service_team"."teamId" = "teams"."teamId" left join "users" on "assigned_service_team"."userId" = "users"."id" where "survey_orders"."orgId" = ${req.orgId} and "survey_orders"."id" = ${surveyOrderid} and "assigned_service_team"."entityType"='survey_orders'`
      );
      let othersUserData = await knex.raw(
        `select "assigned_service_additional_users"."userId" as "userId","users"."name" as "addUsers","users"."email" as "email", "users"."mobileNo" as "mobileNo" from "assigned_service_additional_users" left join "users" on "assigned_service_additional_users"."userId" = "users"."id" where "assigned_service_additional_users"."orgId" = ${req.orgId} and "assigned_service_additional_users"."entityId" = ${surveyOrderid} and "assigned_service_additional_users"."entityType"='survey_orders'`
      );

      console.log("results", results.rows);

      // surveyOrderResult = await knex
      //   .from("survey_orders")
      //   .select()
      //   .where({ id: surveyOrderid });
      // surveyOrder = surveyOrderResult[0];

      // serviceRequestResult = await knex("service_requests")
      //   .select()
      //   .where({ id: surveyOrder.serviceRequestId, orgId: req.orgId });
      // serviceRequest = serviceRequestResult[0];

      let additionalUsers = othersUserData.rows;
      let resultData = { ...results.rows, additionalUsers };

      return res.status(200).json({
        data: { resultData },
        message: "Survey Order Details",
      });

      //});
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][getSurveyOrderDetails] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getImageUploadUrl: async (req, res) => {
    const mimeType = req.body.mimeType;
    const filename = req.body.filename;
    const type = req.body.type;
    try {
      const uploadUrlData = await imageHelper.getUploadURL(
        mimeType,
        filename,
        type
      );

      res.status(200).json({
        data: {
          uploadUrlData: uploadUrlData,
        },
        message: "Upload Url generated succesfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][service][getImageUploadUrl] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  updateRemarksNotes: async (req, res) => {
    // Define try/catch block
    try {
      let surveyNotesResponse = null;
      let problemImagesData = [];
      let noteImagesData = [];
      let userId = req.me.id;

      await knex.transaction(async (trx) => {
        let upNotesPayload = _.omit(req.body, ["images"]);
        console.log(
          "[controllers][surveyOrder][updateRemarksNotes] : Request Body",
          upNotesPayload
        );

        // validate keys
        const schema = Joi.object().keys({
          entityId: Joi.number().required(),
          entityType: Joi.string().required(),
          description: Joi.string().required(),
        });

        // // validate params
        const result = Joi.validate(upNotesPayload, schema);

        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          res.status(400).json({
            errors: [
              {
                code: "VALIDATION ERRORS",
                message: result.message.error,
              },
            ],
          });
        }

        const currentTime = new Date().getTime();
        // Insert into remarks master table
        const insertData = {
          entityId: upNotesPayload.entityId,
          entityType: upNotesPayload.entityType,
          description: upNotesPayload.description,
          orgId: req.orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        console.log(
          "[controllers][surveyOrder][postRemarksNotes] : Insert Data",
          insertData
        );

        const resultRemarksNotes = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("remarks_master");
        notesData = resultRemarksNotes;
        remarkNoteId = notesData[0];

        let usernameRes = await knex("users")
          .where({ id: notesData[0].createdBy })
          .select("name");
        let username = usernameRes[0].name;
        notesData = {
          ...notesData[0],
          createdBy: username,
        };

        /*INSERT IMAGE TABLE DATA OPEN */

        if (req.body.images && req.body.images.length) {
          let imagesData = req.body.images;
          for (image of imagesData) {
            let d = await knex
              .insert({
                entityId: remarkNoteId.id,
                ...image,
                entityType: upNotesPayload.entityType,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"])
              .transacting(trx)
              .into("images");

            problemImagesData.push(d[0]);
          }
        }

        /*INSERT IMAGE TABLE DATA CLOSE */
        if (problemImagesData.length) {
          notesData = {
            ...notesData,
            s3Url: problemImagesData[0].s3Url,
          };
        } else {
          notesData = { ...notesData, s3Url: "" };
        }

        trx.commit;

        res.status(200).json({
          data: {
            remarksNotesResponse: {
              notesData: [notesData],
            },
          },
          message: "Remarks Notes updated successfully !",
        });
      });
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][addRemarks]:  : Error",
        err
      );

      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getRemarksNotesList: async (req, res) => {
    try {
      let remarksNotesList = null;
      let remarksData = req.body;

      const schema = Joi.object().keys({
        entityId: Joi.number().required(),
        entityType: Joi.string().required(),
      });

      let result = Joi.validate(remarksData, schema);
      console.log(
        "[controllers][surveyOrder][getRemarksNotes]: JOi Result",
        result
      );

      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let entityId = remarksData.entityId;
      let entityType = remarksData.entityType;

      let remarksNotesResult = await knex.raw(
        `select "remarks_master"."id","remarks_master"."description","remarks_master"."createdAt","remarks_master"."createdBy","users"."name" as "createdBy" from "remarks_master"  inner join "users" on "remarks_master"."createdBy" = "users"."id"  where "remarks_master"."orgId" = ${req.orgId} and "remarks_master"."entityId" = ${entityId} and "remarks_master"."entityType" = '${entityType}' and "remarks_master"."isActive" = 'true'  ORDER BY "remarks_master"."id"  DESC LIMIT 15 `
      );
      // let remarksNotesResult = await knex.raw(`select "remarks_master"."id","remarks_master"."description","remarks_master"."createdAt","remarks_master"."createdBy","images"."s3Url","users"."name" as "createdBy" from "remarks_master"  inner join "users" on "remarks_master"."createdBy" = "users"."id"  left join "images" on "remarks_master"."id" = "images"."entityId" where "remarks_master"."orgId" = ${req.orgId} and "remarks_master"."entityId" = ${entityId} and "remarks_master"."entityType" = '${entityType}' and "remarks_master"."isActive" = 'true' and "images"."entityType" = 'survey_order_notes' and "images"."orgId" = ${req.orgId} ORDER BY "remarks_master"."id"  DESC LIMIT 15 `)
      remarksNotesList = remarksNotesResult.rows;
      console.log("remakrs rows", remarksNotesList);

      const Parallel = require("async-parallel");
      remarksNotesList = await Parallel.map(
        remarksNotesList,
        async (item) => {
          let images = await knex.raw(
            `select * from "images" where "images"."entityId"= ${item.id} and "images"."entityType" = '${entityType}' and "images"."orgId" = ${req.orgId} `
          );
          item.images = images.rows;
          return item;
        }
      );

      console.log("remarksList", remarksNotesList);

      return res.status(200).json({
        data: remarksNotesList,
        message: "Remarks Notes Details",
      });
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][getRemarks]:  : Error",
        err
      );

      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  deleteRemarksNotes: async (req, res) => {
    try {
      await knex.transaction(async (trx) => {
        let currentTime = new Date().getTime();
        const remarkPayload = req.body;
        const schema = Joi.object().keys({
          remarkId: Joi.number().required(),
        });

        let result = Joi.validate(remarkPayload, schema);
        console.log(
          "[controllers][surveyOrder][deleteRemarks]: JOi Result",
          result
        );

        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        // Now soft delete and return
        let updatedRemark = await knex
          .update({
            isActive: "false",
            updatedAt: currentTime,
            orgId: req.orgId,
          })
          .where({
            id: remarkPayload.remarkId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("remarks_master");

        trx.commit;

        return res.status(200).json({
          data: {
            deletedRemark: updatedRemark,
          },
          message: "Remarks deleted successfully !",
        });
      });
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][deleteRemarks]:  : Error",
        err
      );

      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  exportSurveyOrder: async (req, res) => {
    try {
      let servicePayload = req.body;
      let serviceRequestId = req.body.serviceRequestId;
      let filterList = {};
      let newCreatedDate = "";
      let newCreatedDateTo = "";
      let completedFromDate = "";
      let completedToDate = "";
      let dueFromDate = "";
      let dueToDate = "";
      let compToDate = "";

      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (servicePayload.isFilterActive == "true") {
        // SURVEY ORDER ID

        if (
          servicePayload.surveyOrderId != "undefined" &&
          servicePayload.surveyOrderId != "" &&
          servicePayload.surveyOrderId
        ) {
          filterList["o.id"] = servicePayload.surveyOrderId;
        }

        // SERVICE ID
        if (
          serviceRequestId != "undefined" &&
          serviceRequestId != "" &&
          serviceRequestId
        ) {
          filterList["s.id"] = serviceRequestId;
        }

        // STATUS
        if (
          servicePayload.status != "undefined" &&
          servicePayload.status != "" &&
          servicePayload.status
        ) {
          filterList["o.surveyOrderStatus"] =
            servicePayload.status;
        }

        // PRIORITY
        if (
          servicePayload.priority != "undefined" &&
          servicePayload.priority
        ) {
          filterList["s.priority"] =
            servicePayload.priority;
        }

        // LOCATION
        if (
          servicePayload.location != "undefined" &&
          servicePayload.location
        ) {
          filterList["s.location"] =
            servicePayload.location;
        }

        // ARCHIVE
        if (
          servicePayload.archive != "undefined" &&
          servicePayload.archive
        ) {
          filterList["o.archive"] = servicePayload.archive;
        }

        // ASSIGNED BY
        if (
          (servicePayload.assignedBy != "undefined",
          servicePayload.assignedBy != "" &&
            servicePayload.assignedBy)
        ) {
          filterList["o.createdBy"] =
            servicePayload.assignedBy;
        }

        // CREATED BY
        if (
          (servicePayload.createdBy != "undefined",
          servicePayload.createdBy != "" &&
            servicePayload.createdBy)
        ) {
          filterList["o.createdBy"] =
            servicePayload.createdBy;
        }

        // REQUESTED BY
        if (
          servicePayload.requestedBy != "undefined" &&
          servicePayload.requestedBy != "" &&
          servicePayload.requestedBy
        ) {
          filterList["s.requestedBy"] =
            servicePayload.requestedBy;
        }

        // COMPLETED BY
        if (
          servicePayload.completedBy != "undefined" &&
          servicePayload.completedBy != "" &&
          servicePayload.completedBy
        ) {
          filterList["o.completedBy"] =
            servicePayload.completedBy;
        }

        // SURVEY BETWEEN DATES
        if (
          servicePayload.surveyFrom != "undefined" &&
          servicePayload.surveyFrom != "" &&
          servicePayload.surveyFrom &&
          servicePayload.surveyTo != "undefined" &&
          servicePayload.surveyTo != "" &&
          servicePayload.surveyTo
        ) {
          let myDate = servicePayload.surveyFrom;
          console.log("fromDate", myDate);
          newCreatedDate = new Date(myDate).getTime();

          let myDateTo = servicePayload.surveyTo;
          console.log("toDate", myDateTo);
          newCreatedDateTo = new Date(myDateTo).getTime();
        }
        // COMPLETED DATES BETWEEN
        if (
          servicePayload.completedFrom != "undefined" &&
          servicePayload.completedFrom &&
          servicePayload.completedTo != "undefined" &&
          servicePayload.completedTo
        ) {
          let compFromDate = servicePayload.completedFrom;
          console.log("comfromDate", compFromDate);
          completedFromDate = new Date(
            compFromDate
          ).getTime();

          let compToDate = servicePayload.completedTo;
          console.log("comptoDate", compToDate);
          completedToDate = new Date(compToDate).getTime();
        }

        // DUE DATE
        if (
          servicePayload.dueDateFrom != "undefined" &&
          servicePayload.dueDateFrom != "" &&
          servicePayload.dueDateFrom &&
          servicePayload.dueDateTo != "undefined" &&
          servicePayload.dueDateTo != "" &&
          servicePayload.dueDateTo
        ) {
          let dueFromDate = servicePayload.dueDateFrom;
          console.log("duefromDate", dueFromDate);
          dueFromDate = new Date(dueFromDate).getTime();

          let dueToDate = servicePayload.dueDateTo;
          console.log("duetoDate", compToDate);
          dueToDate = new Date(dueToDate).getTime();
        }
        /**
         * SURVEY ORDER FILTER BY ASSIGNED TO
         */

        if (
          servicePayload.assignedTo != "undefined" &&
          servicePayload.assignedTo != "" &&
          servicePayload.assignedTo
        ) {
          filterList["st.userId"] =
            servicePayload.assignedTo;
        }
        console.log("Filter Query", filterList);

        /* Get List of survey order List By Filter Data */

        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("survey_orders as o")
          .where((qb) => {
            qb.where(filterList);
            if (newCreatedDate || newCreatedDateTo) {
              qb.whereBetween("o.createdAt", [
                newCreatedDate,
                newCreatedDateTo,
              ]);
            }
            if (completedFromDate || completedToDate) {
              qb.whereBetween("o.completedOn", [
                completedFromDate,
                completedToDate,
              ]);
            }
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [
                dueFromDate,
                dueToDate,
              ]);
            }
            qb.where("orgId", req.orgId);
          })
          .innerJoin(
            "service_requests as s",
            "o.serviceRequestId",
            "s.id"
          )
          .leftJoin(
            "service_status AS status",
            "o.surveyOrderStatus",
            "status.statusCode"
          )
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .select(
            "o.id AS surveyId",
            "o.serviceRequestId",
            "status.descriptionEng AS surveyStatus",
            "status.statusCode AS surveyStatusCode",
            "u.id As createdUserId",
            "u.name AS appointedBy",
            "u.name AS createdBy",
            "o.appointedDate AS appointmentDate",
            "o.appointedTime AS appointmentTime",
            "o.createdAt AS createdAt"
          )
          .groupBy([
            "o.id",
            "s.id",
            "status.descriptionEng",
            "status.statusCode",
            "u.id",
          ]);

        // For Get Rows In Pagination With Offset and Limit
        rows = await knex
          .select(
            "o.id as S Id",
            "s.description as Description",
            "o.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "s.id as SR Id",
            "s.priority as Priority",
            "o.createdBy as Created by",
            "o.surveyOrderStatus as Status",
            "o.createdAt as Date Created"
          )
          .from("survey_orders As o")
          .where((qb) => {
            qb.where(filterList);
            if (newCreatedDate || newCreatedDateTo) {
              qb.whereBetween("o.createdAt", [
                newCreatedDate,
                newCreatedDateTo,
              ]);
            }
            if (completedFromDate || completedToDate) {
              qb.whereBetween("o.completedOn", [
                completedFromDate,
                completedToDate,
              ]);
            }
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [
                dueFromDate,
                dueToDate,
              ]);
            }
            qb.where("orgId", req.orgId);
          })
          .innerJoin(
            "service_requests as s",
            "o.serviceRequestId",
            "s.id"
          )
          .leftJoin(
            "service_status AS status",
            "o.surveyOrderStatus",
            "status.statusCode"
          )
          .innerJoin(
            "assigned_service_team",
            "s.id",
            "assigned_service_team.entityId"
          )
          .innerJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .offset(offset)
          .limit(per_page);
      } else if (
        servicePayload.isFilterActive == "false" &&
        servicePayload.serviceRequestId != ""
      ) {
        /* Get List of All survey order of particular service requests */

        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("survey_orders")
          .where({
            serviceRequestId: serviceRequestId,
            orgId: req.orgId,
          })
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .innerJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .innerJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .groupBy([
            "service_requests.id",
            "survey_orders.id",
            "assigned_service_team.id",
            "users.id",
          ])
          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "survey_orders.createdBy as Created by",
            "survey_orders.surveyOrderStatus as Status",
            "survey_orders.createdAt as Date Created",
          ]);

        // For get the rows With pagination
        rows = await knex
          .select()
          .from("survey_orders")
          .where({
            serviceRequestId: serviceRequestId,
            orgId: req.orgId,
          })
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .innerJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .innerJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "survey_orders.createdBy as Created by",
            "survey_orders.surveyOrderStatus as Status",
            "survey_orders.createdAt as Date Created",
          ])
          .offset(offset)
          .limit(per_page);
      } else {
        /* Get List of All survey order With out Filter */

        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("survey_orders")
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .innerJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .innerJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )
          .where({ orgId: req.orgId })
          .groupBy([
            "service_requests.id",
            "survey_orders.id",
            "assigned_service_team.id",
            "users.id",
          ])
          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "survey_orders.createdBy as Created by",
            "survey_orders.surveyOrderStatus as Status",
            "survey_orders.createdAt as Date Created",
          ]);

        // For get the rows With pagination
        rows = await knex
          .select()
          .from("survey_orders")
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .innerJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .innerJoin(
            "users",
            "assigned_service_team.userId",
            "users.id"
          )

          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "survey_orders.createdBy as Created by",
            "survey_orders.surveyOrderStatus as Status",
            "survey_orders.createdAt as Date Created",
          ])
          .where({ orgId: req.orgId })
          .offset(offset)
          .limit(per_page);
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, {
        bookType: "csv",
        bookSST: true,
        type: "base64",
      });
      let filename =
        "uploads/SurveyOrders-" + Date.now() + ".csv";
      let check = XLSX.writeFile(wb, filename);

      return res.status(200).json({
        data: rows,
        message: "Survey Order Data Export Successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  updateSurveyStatus: async (req, res) => {
    try {
      let surveyOrderId = req.body.data.surveyOrderId;
      let updateStatus = req.body.data.status;
      const currentTime = new Date().getTime();
      console.log(
        "REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7",
        req.body
      );

      const status = await knex("survey_orders")
        .update({
          surveyOrderStatus: updateStatus,
          updatedAt: currentTime,
        })
        .where({ id: surveyOrderId });
      return res.status(200).json({
        data: {
          status: updateStatus,
        },
        message:
          "Survey order status updated successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
};

module.exports = surveyOrderController;
