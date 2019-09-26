const Joi = require("@hapi/joi");
const _ = require("lodash");

const knex = require("../db/knex");

const trx = knex.transaction();

const surveyOrderController = {
  addSurveyOrder: async (req, res) => {
    try {
      let surveyOrder = null;
      let additionalUsers = [];

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
              createdAt: currentTime,
              updatedAt: currentTime
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_additional_users");
          additionalUsers.push(userResult[0]);
        }

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
      trx.rollback;
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
          updatedAt: currentTime,
          isActive: true
        };
        // Update into survey_orders table
        let surveyOrderResult = await knex
          .update(insertSurveyOrderData)
          .where({ id: id })
          .returning(["*"])
          .transacting(trx)
          .into("survey_orders");
        surveyOrder = surveyOrderResult[0];

        // Update into assigned_service_team table

        let assignedServiceTeamPayload = {
          teamId: surveyOrderPayload.teamId,
          userId: surveyOrderPayload.mainUserId,
          updatedAt: currentTime
        };
        const assignedServiceTeamResult = await knex
          .update(assignedServiceTeamPayload)
          .where({ entityId: id, entityType: "survey_orders" })
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
          .where({ entityId: id, entityType: "survey_orders" })
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
              .where({ entityId: id, entityType: "survey_orders" })
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
      trx.rollback;
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
        total = await knex.count('* as count').from("survey_orders As o")
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
            })
            .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
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
            .groupBy(["o.id","s.id","status.descriptionEng","status.statusCode","u.id"])
       
        // For Get Rows In Pagination With Offset and Limit
        rows = await knex
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
          })
          .innerJoin("service_requests as s", "o.serviceRequestId", "s.id")
          .leftJoin(
            "service_status AS status",
            "o.surveyOrderStatus",
            "status.statusCode"
          )
          .leftJoin("users AS u", "o.createdBy", "u.id")
          .offset(offset).limit(per_page);

      } else if (
        servicePayload.isFilterActive == "false" &&
        servicePayload.serviceRequestId != ""
      ) {

        /* Get List of All survey order of particular service requests */

        // For get the totalCount
        total = await knex.count('* as count').from("survey_orders")
          .where({ serviceRequestId: serviceRequestId })
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .groupBy(["service_requests.id","survey_orders.id"])
          .select([
            "survey_orders.id as so_id",
            "service_requests.id as sr_id",
            "survey_orders.updatedAt as updatedAt",
            "survey_orders.createdAt as createdAt",
            "survey_orders.appointedDate as appointedDate",
            "service_requests.description as description",
            "service_requests.priority as priority",
            "survey_orders.isActive as status"
          ]);

          // For get the rows With pagination
        rows =  await knex
          .select()
          .from("survey_orders")
          .where({ serviceRequestId: serviceRequestId })
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .select([
            "survey_orders.id as so_id",
            "service_requests.id as sr_id",
            "survey_orders.updatedAt as updatedAt",
            "survey_orders.createdAt as createdAt",
            "survey_orders.appointedDate as appointedDate",
            "service_requests.description as description",
            "service_requests.priority as priority",
            "survey_orders.isActive as status"
          ])
          .offset(offset).limit(per_page);


      } else {
        /* Get List of All survey order With out Filter */

        // For get the totalCount
        total = await knex.count('* as count').from("survey_orders")
            .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
            )
            .groupBy(["service_requests.id","survey_orders.id"])          
            .select([
            "survey_orders.id as so_id",
            "service_requests.id as sr_id",
            "survey_orders.updatedAt as updatedAt",
            "survey_orders.createdAt as createdAt",
            "survey_orders.appointedDate as appointedDate",
            "service_requests.description as description",
            "service_requests.priority as priority",
            "survey_orders.isActive as status"
            ]);

            // For get the rows With pagination
        rows =  await knex
            .select()
            .from("survey_orders")
            .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
            )
            .select([
            "survey_orders.id as so_id",
            "service_requests.id as sr_id",
            "survey_orders.updatedAt as updatedAt",
            "survey_orders.createdAt as createdAt",
            "survey_orders.appointedDate as appointedDate",
            "service_requests.description as description",
            "service_requests.priority as priority",
            "survey_orders.isActive as status"
            ])
            .offset(offset).limit(per_page);
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
      let id = req.body.id;

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

      surveyOrderResult = await knex
        .from("survey_orders")
        .select()
        .where({ id: id });
      surveyOrder = surveyOrderResult[0];
      serviceRequestResult = await knex("service_requests")
        .select()
        .where({ id: surveyOrder.serviceRequestId });
      serviceRequest = serviceRequestResult[0];
      return res.status(200).json({
        data: { surveyOrder, serviceRequest },
        message: "Survey Order Details"
      });

      //});
    } catch (err) {
      console.log(
        "[controllers][surveyOrder][getSurveyOrderDetails] :  Error",
        err
      );
      trx.rollback;
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = surveyOrderController;
