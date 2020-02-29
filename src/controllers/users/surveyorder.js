const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;



const surveyOrderController = {
  addSurveyOrder: async (req, res) => {
    try {
      let surveyOrder = null;
      let additionalUsers = [];
      let userId = req.me.id;

      await knex.transaction(async trx => {
        let surveyOrderPayload = req.body;
        let initialSurveyOrderPayload = _.omit(surveyOrderPayload, [
          "additionalUsers",
          "teamId",
          "mainUserId"
        ]);
        const schema = Joi.object().keys({
          serviceRequestId: Joi.string().required(),
          appointedDate: Joi.string().required(),
          appointedTime: Joi.string().required()
        });
        let result = Joi.validate(initialSurveyOrderPayload, schema);
        console.log(
          "[controllers][surveyOrder][addSurveyOrder]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let currentTime = new Date().getTime();
        let insertSurveyOrderData = {
          ...initialSurveyOrderPayload,
          orgId: req.orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime,
          isActive: true
        };
        // Insert into survey_orders table
        let surveyOrderResult = await knex
          .insert(insertSurveyOrderData)
          .returning(["*"])
          .transacting(trx)
          .into("survey_orders");
        surveyOrder = surveyOrderResult[0];

        // Insert into assigned_service_team table

        let assignedServiceTeamPayload = {
          teamId: surveyOrderPayload.teamId,
          userId: surveyOrderPayload.mainUserId,
          entityId: surveyOrder.id,
          orgId: req.orgId,
          entityType: "survey_orders",
          createdAt: currentTime,
          updatedAt: currentTime
        };
        const assignedServiceTeamResult = await knex
          .insert(assignedServiceTeamPayload)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_team");
        assignedServiceTeam = assignedServiceTeamResult[0];

        // Insert into assigned_service_additional_users

        let assignedServiceAdditionalUsers = surveyOrderPayload.additionalUsers;
        for (user of assignedServiceAdditionalUsers) {
          let userResult = await knex
            .insert({
              userId: user,
              entityId: surveyOrder.id,
              entityType: "survey_orders",
              orgId: req.orgId,
              createdAt: currentTime,
              updatedAt: currentTime
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_additional_users");
          additionalUsers.push(userResult[0]);
        }


        await knex('service_requests')
          .update({ serviceStatusCode: 'US' })
          .where({ id: surveyOrderPayload.serviceRequestId })
          .returning(['*'])



        trx.commit;
        res.status(200).json({
          data: {
            surveyOrder,
            assignedServiceTeam,
            assignedAdditionalUsers: additionalUsers
          },
          message: "Survey Order added successfully !"
        });
      });
    } catch (err) {
      console.log("[controllers][surveyOrder][addSurveyOrder] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateSurveyOrder: async (req, res) => {
    try {
      let surveyOrder = null;
      let additionalUsers = [];

      await knex.transaction(async trx => {
        let surveyOrderPayload = req.body;
        let id = req.body.id;

        let initialSurveyOrderPayload = _.omit(surveyOrderPayload, [
          "additionalUsers",
          "teamId",
          "mainUserId",
          "id"
        ]);

        const schema = Joi.object().keys({
          appointedDate: Joi.string().required(),
          appointedTime: Joi.string().required()
        });

        let result = Joi.validate(initialSurveyOrderPayload, schema);
        console.log("[controllers][surveyOrder][addSurveyOrder]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let currentTime = new Date().getTime();
        let insertSurveyOrderData = {
          ...initialSurveyOrderPayload,
          updatedAt: currentTime,
          isActive: true
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
        let resultRequest = await knex("survey_orders").where({
          isActive: "true",
          id: incidentRequestPayload.id,
          orgId: orgId
        })

        serviceRequestId = resultRequest[0].serviceRequestId;

        let updateSRStatus = await knex
          .update({ serviceStatusCode: "US", updatedAt: currentTime })
          .where({ id: serviceRequestId, orgId: req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("service_request");

        // Update into assigned_service_team table

        let assignedServiceTeamPayload = {
          teamId: surveyOrderPayload.teamId,
          userId: surveyOrderPayload.mainUserId,
          updatedAt: currentTime
        };
        const assignedServiceTeamResult = await knex
          .update(assignedServiceTeamPayload)
          .where({
            entityId: id,
            entityType: "survey_orders",
            orgId: req.orgId
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
        let assignedServiceAdditionalUsers = surveyOrderPayload.additionalUsers;

        let selectedUsers = await knex
          .select()
          .where({
            entityId: id,
            entityType: "survey_orders",
            orgId: req.orgId
          })
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_additional_users")
          .map(user => user.userId);

        if (_.isEqual(selectedUsers, assignedServiceAdditionalUsers)) {
          // trx.commit
          trx.commit;
          return res.status(200).json({
            data: {
              surveyOrder,
              assignedServiceTeam,
              assignedAdditionalUsers: additionalUsers
            },
            message: "Survey Order updated successfully !"
          });
        } else {
          // Remove old users

          for (user of selectedUsers) {
            await knex
              .del()
              .where({
                entityId: id,
                entityType: "survey_orders",
                orgId: req.orgId
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
                updatedAt: currentTime
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
              assignedAdditionalUsers: additionalUsers
            },
            message: "Survey Order updated successfully !"
          });
        }
      });
    } catch (err) {
      console.log("[controllers][surveyOrder][addSurveyOrder] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
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

      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      console.log("customerInfo", req.me.id);
      console.log("customerHouseInfo", req.me.houseIds);
      let houseIds = req.me.houseIds;

      let serviceRequestData = await knex.from("service_requests")
        .select('id')
        .whereIn("service_requests.houseId", houseIds)

      let serviceRequestIds = serviceRequestData.map(v => v.id)//[userHouseId.houseId];


      console.log("allIds#########33", serviceRequestIds);
      console.log("SRData", serviceRequestData);


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
          filterList["o.surveyOrderStatus"] = servicePayload.status;
        }

        // PRIORITY
        if (servicePayload.priority != "undefined" && servicePayload.priority) {
          filterList["s.priority"] = servicePayload.priority;
        }

        // LOCATION
        if (servicePayload.location != "undefined" && servicePayload.location) {
          filterList["s.location"] = servicePayload.location;
        }

        // ARCHIVE
        if (servicePayload.archive != "undefined" && servicePayload.archive) {
          filterList["o.archive"] = servicePayload.archive;
        }

        // ASSIGNED BY
        if (
          (servicePayload.assignedBy != "undefined",
            servicePayload.assignedBy != "" && servicePayload.assignedBy)
        ) {
          filterList["o.createdBy"] = servicePayload.assignedBy;
        }

        // CREATED BY
        if (
          (servicePayload.createdBy != "undefined",
            servicePayload.createdBy != "" && servicePayload.createdBy)
        ) {
          filterList["o.createdBy"] = servicePayload.createdBy;
        }

        // REQUESTED BY
        if (
          servicePayload.requestedBy != "undefined" &&
          servicePayload.requestedBy != "" &&
          servicePayload.requestedBy
        ) {
          filterList["s.requestedBy"] = servicePayload.requestedBy;
        }

        // COMPLETED BY
        if (
          servicePayload.completedBy != "undefined" &&
          servicePayload.completedBy != "" &&
          servicePayload.completedBy
        ) {
          filterList["o.completedBy"] = servicePayload.completedBy;
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
          completedFromDate = new Date(compFromDate).getTime();

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
          filterList["st.userId"] = servicePayload.assignedTo;
        }
        console.log("Filter Query", filterList);

        /* Get List of survey order List By Filter Data */

        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("survey_orders as o")
          .where(qb => {
            qb.where(filterList);
            if (newCreatedDate || newCreatedDateTo) {
              qb.whereBetween("o.createdAt", [
                newCreatedDate,
                newCreatedDateTo
              ]);
            }
            if (completedFromDate || completedToDate) {
              qb.whereBetween("o.completedOn", [
                completedFromDate,
                completedToDate
              ]);
            }
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [dueFromDate, dueToDate]);
            }
            qb.where("o.orgId", req.orgId);
          })
          .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
          .whereIn("s.id", serviceRequestIds)
          .leftJoin(
            "service_status AS status",
            "s.serviceStatusCode",
            "status.statusCode"
          )
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .select(
            "o.id AS surveyId",
            "o.serviceRequestId",
            "status.descriptionEng AS Status",
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
            "u.id"
          ]);

        // For Get Rows In Pagination With Offset and Limit
        rows = await knex
          .select(
            "o.id as S Id",
            "s.description as Description",
            "o.appointedDate as Appointment Date",
            "u.name as Assigned To",
            "s.id as SR Id",
            "s.priority as Priority",
            "u.name as Created By",
            "status.descriptionEng AS Status",
            "o.createdAt as Date Created"
          )
          .from("survey_orders As o")
          .where(qb => {
            qb.where(filterList);
            if (newCreatedDate || newCreatedDateTo) {
              qb.whereBetween("o.createdAt", [
                newCreatedDate,
                newCreatedDateTo
              ]);
            }
            if (completedFromDate || completedToDate) {
              qb.whereBetween("o.completedOn", [
                completedFromDate,
                completedToDate
              ]);
            }
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [dueFromDate, dueToDate]);
            }
            qb.where("o.orgId", req.orgId);
          })
          .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
          .whereIn("s.id", serviceRequestIds)
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .leftJoin(
            "service_status AS status",
            "s.serviceStatusCode",
            "status.statusCode"
          )
          .leftJoin(
            "assigned_service_team",
            "s.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("users", "assigned_service_team.userId", "users.id")
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
          .where({ "survey_orders.orgId": req.orgId })
          .whereIn("service_requests.id", serviceRequestIds)
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin("users as u", "survey_orders.createdBy", "u.id")

          .groupBy([
            "service_requests.id",
            "survey_orders.id",
            "assigned_service_team.id",
            "users.id",
            "u.id"
          ])
          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "u.name as Created By",
            "service_requests.serviceStatusCode as Status",
            "survey_orders.createdAt as Date Created"
          ]);

        // For get the rows With pagination
        rows = await knex
          .from("survey_orders")
          .where({ "survey_orders.orgId": req.orgId })
          .whereIn("service_requests.id", serviceRequestIds)
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .leftJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin("users as u", "survey_orders.createdBy", "u.id")
          .leftJoin(
            "service_status AS status",
            "service_requests.serviceStatusCode",
            "status.statusCode"
          )
          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "u.name as Created By",
            "status.descriptionEng AS Status",
            "survey_orders.createdAt as Date Created"
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
          .leftJoin(
            "assigned_service_team",
            "service_requests.id",
            "assigned_service_team.entityId"
          )
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin("users as u", "survey_orders.createdBy", "u.id")
          .leftJoin(
            "service_status AS status",
            "service_requests.serviceStatusCode",
            "status.statusCode"
          )
          .groupBy([
            "service_requests.id",
            "survey_orders.id",
            "assigned_service_team.id",
            "users.id",
            "u.id"
          ])
          .where({ "survey_orders.orgId": req.orgId })
          .whereIn("service_requests.id", serviceRequestIds)
          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "u.name as Created By",
            "status.descriptionEng AS Status",
            "survey_orders.createdAt as Date Created"
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
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .leftJoin("users as u", "survey_orders.createdBy", "u.id")
          .leftJoin(
            "service_status AS status",
            "service_requests.serviceStatusCode",
            "status.statusCode"
          )
          .whereIn("service_requests.id", serviceRequestIds)
          .select([
            "survey_orders.id as S Id",
            "service_requests.description as Description",
            "survey_orders.appointedDate as Appointment Date",
            "users.name as Assigned To",
            "service_requests.id as SR Id",
            "service_requests.priority as Priority",
            "u.name as Created By",
            "status.descriptionEng AS Status",
            "survey_orders.createdAt as Date Created"
          ])
          .where({ "survey_orders.orgId": req.orgId })
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
      pagination.data = rows;

      res.status(200).json({
        data: pagination,
        message: "Survey Orders List"
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
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
        id: Joi.string().required()
      });

      let result = Joi.validate(req.body, schema);
      console.log(
        "[controllers][surveyOrder][getSurveyOrderDetails]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      let results = await knex.raw(`select "survey_orders"."id" as "SId","service_requests"."description" as "description","survey_orders"."appointedDate" as "appointedDate", "survey_orders"."appointedTime" as "appointedTime","users"."name" as "assignedTo","service_requests"."id" as "SRId","service_requests"."priority" as "priority","survey_orders"."createdBy" as "createdBy", "survey_orders"."surveyOrderStatus" as "status","survey_orders"."createdAt" as "dateCreated" from "survey_orders" inner join "service_requests" on "survey_orders"."serviceRequestId" = "service_requests"."id" left join "assigned_service_team" on "survey_orders"."id" = "assigned_service_team"."entityId" left join "users" on "assigned_service_team"."userId" = "users"."id" where "survey_orders"."orgId" = ${req.orgId} and "survey_orders"."id" = ${surveyOrderid} and "assigned_service_team"."entityType"='survey_orders'`)

      console.log("results", results.rows);

      let resultData = results.rows;

      return res.status(200).json({
        data: { resultData },
        message: "Survey Order Details"
      });

      //});
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][getSurveyOrderDetails] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getImageUploadUrl: async (req, res) => {
    const mimeType = req.body.mimeType;
    const filename = req.body.filename;
    const type = req.body.type;
    try {
      const uploadUrlData = await getUploadURL(mimeType, filename, type);

      res.status(200).json({
        data: {
          uploadUrlData: uploadUrlData
        },
        message: "Upload Url generated succesfully!"
      });
    } catch (err) {
      console.log("[controllers][service][getImageUploadUrl] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updateSurveyOrderNotes: async (req, res) => {
    // Define try/catch block
    try {
      let surveyNotesResponse = null;
      let problemImagesData = [];
      let noteImagesData = [];
      let userId = req.me.id;

      await knex.transaction(async trx => {
        let upNotesPayload = _.omit(req.body, ["images"]);
        console.log(
          "[controllers][survey][updateNotes] : Request Body",
          upNotesPayload
        );

        // validate keys
        const schema = Joi.object().keys({
          surveyOrderId: Joi.number().required(),
          description: Joi.string().required()
        });

        // let problemImages = upNotesPayload.problemsImages;
        // let noteImages = upNotesPayload.notesImages;
        // // validate params
        const result = Joi.validate(upNotesPayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          res.status(400).json({
            errors: [
              { code: "VALIDATON ERRORS", message: result.message.error }
            ]
          });
        }

        const currentTime = new Date().getTime();
        // Insert into survey order post update table
        const insertData = {
          surveyOrderId: upNotesPayload.surveyOrderId,
          description: upNotesPayload.description,
          orgId: req.orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        console.log(
          "[controllers][survey][surveyPostNotes] : Insert Data ",
          insertData
        );

        const resultSurveyNotes = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("survey_order_post_update");
        notesData = resultSurveyNotes;
        surveyNoteId = notesData[0];

        // const Parallel = require('async-parallel');
        //  let notesResData = await Parallel.map(notesData, async item => {
        //       let username = await knex('users').where({ id: item.createdBy }).select('name');
        //       username = username[0].name;
        //       return notesData;
        //   });
        let usernameRes = await knex('users').where({ id: notesData[0].createdBy }).select('name')
        let username = usernameRes[0].name;
        notesData = { ...notesData[0], createdBy: username }

        /*INSERT IMAGE TABLE DATA OPEN */

        if (req.body.images && req.body.images.length) {
          let imagesData = req.body.images;
          for (image of imagesData) {
            let d = await knex
              .insert({
                entityId: surveyNoteId.id,
                ...image,
                entityType: "survey_order_notes",
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId
              })
              .returning(["*"])
              .transacting(trx)
              .into("images");
          }
        }
        /*INSERT IMAGE TABLE DATA CLOSE */

        // // Insert Problems Images
        // for (prodImg of problemImages) {
        //   let insertProblemData = {
        //     entityId: surveyNoteId.id,
        //     entityType: "survey_order_post_update",
        //     s3Url: prodImg.s3Url,
        //     name: prodImg.name,
        //     title: prodImg.title,
        //     orgId: req.orgId,
        //     createdAt: currentTime,
        //     updatedAt: currentTime
        //   };
        //   let resultProblemsImg = await knex
        //     .insert(insertProblemData)
        //     .returning(["*"])
        //     .transacting(trx)
        //     .into("images");
        //   console.log("problemImageResponse", resultProblemsImg);
        //   problemImagesData.push(resultProblemsImg[0]);
        // }

        // Insert Problems Images
        // for (noteImg of noteImages) {
        //   let insertNoteData = {
        //     entityId: upNotesPayload.surveyOrderId,
        //     entityType: "survey_order",
        //     s3Url: noteImg.s3Url,
        //     name: noteImg.name,
        //     title: noteImg.title,
        //     orgId: req.orgId,
        //     createdAt: currentTime,
        //     updatedAt: currentTime
        //   };
        //   let resultSurveyNotesImg = await knex
        //     .insert(insertNoteData)
        //     .returning(["*"])
        //     .transacting(trx)
        //     .into("images");
        //   noteImagesData.push(resultSurveyNotesImg[0]);
        // }
        trx.commit;

        res.status(200).json({
          data: {
            surveyNotesResponse: {
              notesData: [notesData]
            }
          },
          message: "Survey Note updated successfully !"
        });
      });
    } catch (err) {
      console.log("[controllers][survey][surveyPostNotes] : Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getSurveyOrderNoteList: async (req, res) => {
    try {
      let surveyOrderNoteList = null;

      //await knex.transaction(async (trx) => {
      let surveyOrder = req.body;

      const schema = Joi.object().keys({
        surveyOrderId: Joi.number().required()
      });
      let result = Joi.validate(surveyOrder, schema);
      console.log(
        "[controllers][surveyOrder][getsurveyPostNotes]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      let surveyOrderId = surveyOrder.surveyOrderId;

      // surveyOrderNoteResult = await knex
      //   .from("survey_order_post_update")
      //   .select()
      //   .where({
      //     surveyOrderId: surveyOrder.surveyOrderId,
      //     isActive: "true",
      //     orgId: req.orgId
      //   });
      // surveyOrderNoteList = surveyOrderNoteResult;
      let surveyOrderNoteResult = await knex.raw(`select "survey_order_post_update".*,"users"."name" as "createdBy" from "survey_order_post_update"  left join "users" on "survey_order_post_update"."createdBy" = "users"."id" where "survey_order_post_update"."orgId" = ${req.orgId} and "survey_order_post_update"."surveyOrderId" = ${surveyOrderId} and "survey_order_post_update"."isActive" = 'true'`)

      surveyOrderNoteList = surveyOrderNoteResult.rows;

      return res.status(200).json({
        data: surveyOrderNoteList,
        message: "Survey Order Details"
      });

      //});
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][getSurveyOrderDetails] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deleteSurveyRemark: async (req, res) => {
    try {
      let serviceOrder = null;
      await knex.transaction(async trx => {
        let currentTime = new Date().getTime();
        const remarkPayload = req.body;
        const schema = Joi.object().keys({
          remarkId: Joi.number().required()
        });

        let result = Joi.validate(remarkPayload, schema);
        console.log("[controllers][survey][order]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Now soft delete and return
        let updatedRemark = await knex
          .update({
            isActive: "false",
            updatedAt: currentTime,
            orgId: req.orgId
          })
          .where({
            id: remarkPayload.remarkId
          })
          .returning(["*"])
          .transacting(trx)
          .into("survey_order_post_update");
        trx.commit;

        return res.status(200).json({
          data: {
            deletedRemark: updatedRemark
          },
          message: "Survey order remarks deleted successfully !"
        });
      });
    } catch (err) {
      console.log("[controllers][survey][remaks] :  Error", err);
      //trx.rollback
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateSurveyStatus: async (req, res) => {
    try {
      let surveyOrderId = req.body.data.surveyOrderId;
      let updateStatus = req.body.data.status;
      const currentTime = new Date().getTime();
      console.log('REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7', req.body)

      const status = await knex("survey_orders")
        .update({ surveyOrderStatus: updateStatus, updatedAt: currentTime })
        .where({ id: surveyOrderId });
      return res.status(200).json({
        data: {
          status: updateStatus
        },
        message: "Survey order status updated successfully!"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getSurveyOrderListFilter: async (req, res) => {
    try {
      let filterList = req.body;
      let total
      let rows
      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      console.log("customerInfo", req.me.id);
      console.log("customerHouseInfo", req.me.houseIds);
      let houseIds = req.me.houseIds;

      let serviceRequestData = await knex.from("service_requests")
        .select('id')
        .whereIn("service_requests.houseId", houseIds)

      let serviceRequestIds = serviceRequestData.map(v => v.id)//[userHouseId.houseId];

      let dueFromDate = filterList.dueDateFrom;
      console.log("duefromDate", dueFromDate);
      dueFromDate = new Date(dueFromDate).getTime();

      let dueToDate = filterList.dueDateTo;
      // console.log("duetoDate", compToDate);
      dueToDate = new Date(dueToDate).getTime();

      let filters = {}
      if (filterList.serviceRequestId) {
        filters['s.id'] = filterList.serviceRequestId;
      }
      if (filterList.surveyOrderId) {
        filters['o.id'] = filterList.surveyOrderId
      }
      if (filterList.status) {
        filters['o.surveyOrderStatus'] = filterList.status;
      }


      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("survey_orders as o")
          .where(qb => {
            qb.where(filters);
            if (dueFromDate || dueToDate) {
              qb.whereBetween("o.appointedDate", [dueFromDate, dueToDate]);
            }
            qb.where("o.orgId", req.orgId)
            if (filterList.description) {
              qb.where('s.description', 'ilike', `%${filterList.description}%`)
            }          
          })
          .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
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
          .leftJoin("users AS u", "o.createdBy", "u.id")
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
            "o.id AS surveyId",
            "o.serviceRequestId",
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
            "assignUser.name  as Tenant Name"
          )
          .where({ "assigned_service_team.entityType": "survey_orders" })
          .whereIn("o.serviceRequestId", serviceRequestIds)
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
            "user_house_allocation.id"
          ]), knex
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
              "assignUser.name  as Tenant Name"
            )
            .from("survey_orders As o")
            .where(qb => {
              qb.where(filters);
              if (dueFromDate || dueToDate) {
                qb.whereBetween("o.appointedDate", [dueFromDate, dueToDate]);
              }
              qb.where("o.orgId", req.orgId);
              if (filterList.description) {
                qb.where('s.description', 'ilike', `%${filterList.description}%`)
              }
              if (filterList.building) {
                qb.where('buildings_and_phases.description', 'ilike', `%${filterList.building}%`)
              }
              if (filterList.unitNo) {
                qb.where('property_units.unitNumber', 'ilike', `%${filterList.unitNo}%`)
              }
              if (filterList.tenantName) {
                qb.where('assignUser.name', 'ilike', `%${filterList.tenantName}%`)
              }
            }).where({ "assigned_service_team.entityType": "survey_orders" })
            .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
            .whereIn("o.serviceRequestId", serviceRequestIds)
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
            .orderBy('o.id', 'desc')
            .offset(offset)
            .limit(per_page)
      ])

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
        data: pagination
      })

    } catch (err) {
      console.log("[controllers][surveyOrder][addSurveyOrder] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

};

module.exports = surveyOrderController;
