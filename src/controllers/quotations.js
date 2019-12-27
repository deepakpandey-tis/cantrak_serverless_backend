const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");

const knex = require("../db/knex");

const bcrypt = require("bcrypt");
const XLSX = require("xlsx");
const saltRounds = 10;
//const trx = knex.transaction();

const quotationsController = {
  generateQuotationId: async (req, res) => {
    try {
      let quotationId = null;

      await knex.transaction(async trx => {
        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);
        let orgId = req.orgId;
       
        const insertData = {
          moderationStatus: 0,
          isActive: "true",
          orgId: orgId,
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log(
          "[controllers][quotation][generateQuotation]: Insert Data",
          insertData
        );

        const quotationResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("quotations");

        quotationId = quotationResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          quotation: quotationId
        },
        message: "Quotation Id generated successfully !"
      });
    } catch (err) {
      console.log("[controllers][quotation][generateQuotation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updateQuotations: async (req, res) => {
    try {
      let assignedServiceTeam = null;
      let additionalUsersList = [];
      let orgId = req.orgId;
       
      await knex.transaction(async trx => {
        let images = [];

        let quotationPayload = _.omit(req.body, ["images"]);
        images = req.body.images;

        console.log(
          "[controllers][quotations][updateQuotation] : Quotation Body",quotationPayload
        );

        // validate keys
        const schema = Joi.object().keys({
          serviceRequestId: Joi.number().required(),
          quotationId: Joi.number().required(),
          checkedBy: Joi.string().required(),
          inspectedBy: Joi.string().required(),
          acknowledgeBy: Joi.string().required(),
          startDate: Joi.string().required(),
          finishDate: Joi.string().required(),
          dueDate: Joi.string().required(),
          onTime: Joi.string().required(),
          salesTax: Joi.string().required(),
          shippingCost: Joi.string().required(),
          serviceCharge: Joi.string().required(),
          additionalCost: Joi.string().required(),
          teamId: Joi.string().required(),
          mainUserId: Joi.string().required(),
          additionalUsers: Joi.array().required()
        });

        const result = Joi.validate(quotationPayload, schema);
        console.log(
          "[controllers][quotations][updateQuotation]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        
        // Insert in quotation table,
        const currentTime = new Date().getTime();

        const updateQuotationReq = await knex
          .update({
            serviceRequestId: quotationPayload.serviceRequestId,
            checkedBy: quotationPayload.checkedBy,
            inspectedBy: quotationPayload.inspectedBy,
            acknowledgeBy: quotationPayload.acknowledgeBy,
            startDate: quotationPayload.startDate,
            finishDate: quotationPayload.finishDate,
            onTime: quotationPayload.onTime,
            dueDate: quotationPayload.dueDate,
            updatedAt: currentTime,
            isActive: true,
            moderationStatus: 1
          })
          .where({ id: quotationPayload.quotationId })
          .returning(["*"])
          .transacting(trx)
          .into("quotations");

        console.log(
          "[controllers][quotations][updateQuotation]: Update Data",
          updateQuotationReq
        );

        quotationsData = updateQuotationReq[0];

        if (images && images.length) {
          images = req.body.images.map(image => ({
            ...image,
            createdAt: currentTime,
            updatedAt: currentTime,
            entityId: quotationsData.id,
            entityType: "quotations"
          }));
          let addedImages = await knex
            .insert(images)
            .returning(["*"])
            .transacting(trx)
            .into("images");
          images = addedImages;
        }

        //console.log(images)

        // Start quotation service charges table,

        let quotationCharges = await knex("quotation_service_charges")
          .where({ quotationId: quotationPayload.quotationId,orgId: orgId })
          .select("id");

        if (quotationCharges.length > 0) {
          // Update quotation service charges table,

          const updateChargesData = await knex
            .update({
              salesTax: quotationPayload.salesTax,
              shippingCost: quotationPayload.shippingCost,
              serviceCharge: quotationPayload.serviceCharge,
              additionalCost: quotationPayload.additionalCost,
              updatedAt: currentTime
            })
            .where({ quotationId: quotationPayload.quotationId })
            .returning(["*"])
            .transacting(trx)
            .into("quotation_service_charges");

          console.log(
            "[controllers][quotations][updateTeams]: Update Data",
            updateChargesData
          );

          quotationsData.charges = updateChargesData[0];
        } else {
          // Insert into quotation service charges table,

          const insertChargesData = {
            salesTax: quotationPayload.salesTax,
            shippingCost: quotationPayload.shippingCost,
            serviceCharge: quotationPayload.serviceCharge,
            additionalCost: quotationPayload.additionalCost,
            quotationId: quotationPayload.quotationId,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: orgId
          };

          console.log(
            "[controllers][quotation][addQuotationCharges]: Insert Data",
            insertChargesData
          );

          const serviceResult = await knex
            .insert(insertChargesData)
            .returning(["*"])
            .transacting(trx)
            .into("quotation_service_charges");

          quotationsData.charges = serviceResult;
        }

        // Insert into assigned teams table

        let assignedTeam = await knex("assigned_service_team")
          .where({
            entityId: quotationPayload.quotationId,
            entityType: "quotations"
          })
          .select("*");

        if (assignedTeam.length > 0) {
          // Update table "assigned_service_team from quotation section"

          const updateQuotationTeam = await knex
            .update({
              teamId: quotationPayload.teamId,
              userId: quotationPayload.mainUserId,
              updatedAt: currentTime
            })
            .where({
              entityId: quotationPayload.quotationId,
              entityType: "quotations"
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_team");

          console.log(
            "[controllers][quotations][updateTeams]: Update Data",
            updateQuotationTeam
          );

          assignedServiceTeam = updateQuotationTeam[0];
        } else {
          // Insert first entry into table "assigned_service_team from quotation section"

          const insertAssignedTeam = {
            teamId: quotationPayload.teamId,
            userId: quotationPayload.mainUserId,
            entityId: quotationPayload.quotationId,
            entityType: "quotations",
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: orgId
          };

          //console.log('[controllers][quotation][addQuotationTeam]: Insert Data', insertChargesData);

          const serviceResult = await knex
            .insert(insertAssignedTeam)
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_team");

          assignedServiceTeam = serviceResult[0];
        }

        // Insert into assigned additional users table

        // Here 3 operations will take place
        /*
          1. Select users based on entity id and entity type
          2. Remove Those users 
          3. Add new users                    
        */

        let assignedQuotationAddUsers = quotationPayload.additionalUsers;

        let selectedUsers = await knex
          .select()
          .where({
            entityId: quotationPayload.quotationId,
            entityType: "quotations"
          })
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_additional_users")
          .map(user => user.userId);

        if (_.isEqual(selectedUsers, assignedQuotationAddUsers)) {
          // trx.commit
          for (user of assignedQuotationAddUsers) {
            let userResult = await knex("assigned_service_additional_users")
              .where({
                entityId: quotationPayload.quotationId,
                entityType: "quotations"
              })
              .select("*");
            additionalUsersList.push(userResult[0]);
          }
          trx.commit;
          return res.status(200).json({
            data: {
              quotationsData,
              assignedServiceTeam,
              assignedAdditionalUsers: additionalUsersList,
              images: images
            },
            message: "Quotations updated successfully !"
          });
        } else {
          // Remove old users

          for (user of selectedUsers) {
            await knex
              .del()
              .where({
                entityId: quotationPayload.quotationId,
                entityType: "quotations"
              })
              .returning(["*"])
              .transacting(trx)
              .into("assigned_service_additional_users");
          }

          // Insert New Users

          for (user of assignedQuotationAddUsers) {
            let userResult = await knex
              .insert({
                userId: user,
                entityId: quotationPayload.quotationId,
                entityType: "quotations",
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: orgId
              })
              .returning(["*"])
              .transacting(trx)
              .into("assigned_service_additional_users");
            additionalUsersList.push(userResult[0]);
          }
          trx.commit;
          return res.status(200).json({
            data: {
              quotationsData,
              assignedServiceTeam,
              assignedAdditionalUsers: additionalUsersList,
              images: images
            },
            message: "Quotations updated successfully !"
          });
        }
      });
    } catch (err) {
      console.log("[controllers][quotation][updateQuotation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getQuotationDetails: async (req, res) => {
    try {
      let quotationRequestId = req.query.id;
      // Get Quotations Details
      quotationView = await knex("quotations")
        .innerJoin(
          "assigned_service_team as astm","astm.entityId","=","quotations.id",
          "astm.entityType","=","quotations"
        )
        .innerJoin("teams", "teams.teamId", "=", "astm.teamId")
        .innerJoin("users as astUser", "astUser.id", "=", "astm.userId")
        .innerJoin(
          "quotation_service_charges","quotation_service_charges.quotationId","=",
          "quotation_service_charges.quotationId"
        )
        .innerJoin("user_roles", "astm.userId", "=", "user_roles.userId")
        .innerJoin("roles", "user_roles.roleId", "=", "roles.id")
        .select(
          "quotations.id as quotationId",
          "quotations.checkedBy",
          "quotations.inspectedBy",
          "quotations.acknowledgeBy",
          "quotations.startDate",
          "quotations.finishDate",
          "quotations.dueDate",
          "quotations.onTime",
          "quotation_service_charges.*",
          "teams.teamName as assignTeam",
          "astUser.name as assignedMainUsers",
          "roles.name as userRole"
        )
        .where({ "quotations.id": quotationRequestId });
      console.log(
        "[controllers][teams][getTeamList] : Team List",
        quotationView
      );
      quotationsDetails = _.omit(
        quotationView[0],
        ["id"],
        ["isActive"],
        ["createdAt"],
        ["updatedAt"]
      );

      // Get addtional User list For Quotations
      addtionalUser = await knex("assigned_service_additional_users")
        .leftJoin(
          "users",
          "assigned_service_additional_users.userId",
          "=",
          "users.id"
        )
        .leftJoin(
          "user_roles",
          "assigned_service_additional_users.userId",
          "=",
          "user_roles.userId"
        )
        .leftJoin("roles", "user_roles.roleId", "=", "roles.id")
        .select("users.name as addtionalUsers", "roles.name as userRole")
        .where({
          "assigned_service_additional_users.entityId": quotationRequestId,
          "assigned_service_additional_users.entityType": "quotations"
        });
      console.log(
        "[controllers][teams][getTeamList] : Addtional Users List",
        addtionalUser
      );
      quotationsDetails.addtinalUserList = addtionalUser;
      quotationsDetails.parts = [];
      quotationsDetails.assets = [];
      quotationsDetails.charges = [];

      teamResult = { quotation: quotationsDetails };

      res.status(200).json({
        data: teamResult,
        message: "Quotations details !"
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  addQuotationPart: async (req, res) => {
    try {
      let part = null;
      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          quotationId: Joi.string().required(),
          partId: Joi.string().required(),
          unitCost: Joi.string().required(),
          quantity: Joi.string().required(),
          status: Joi.string().required()
        });

        let result = Joi.validate(payload, schema);
        console.log(
          "[controllers][quotation][addQuotationPart]: JOi Result",
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
        let insertData = {
          unitCost: payload.unitCost,
          quantity: payload.quantity,
          status: payload.status,
          partId: payload.partId,
          entityId: payload.quotationId,
          entityType: "quotations",
          updatedAt: currentTime,
          createdAt: currentTime
        };
        let partResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_parts");
        part = partResult[0];
        trx.commit;
      });

      return res.status(200).json({
        data: {
          part: part
        },
        message: "Part assigned to quotation successfully"
      });
    } catch (err) {
      console.log("[controllers][quotation][addQuotationPart] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  addQuotationAsset: async (req, res) => {
    try {
      let asset = null;
      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          assetId: Joi.string().required(),
          quotationId: Joi.string().required(),
          price: Joi.string().required(),
          status: Joi.string().required()
        });
        let result = Joi.validate(payload, schema);
        console.log(
          "[controllers][quotation][addQuotationAsset]: JOi Result",
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
        let insertData = {
          entityId: payload.quotationId,
          entityType: "quotations",
          assetId: payload.assetId,
          updatedAt: currentTime,
          createdAt: currentTime,
          price: payload.price,
          status: payload.status
        };
        let assetResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_assets");
        asset = assetResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          asset: asset
        },
        message: "Asset added to quotation successfully!"
      });
    } catch (err) {
      console.log("[controllers][quotation][addQuotationAsset] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getQuotationList: async (req, res) => {
    try {
      let reqData = req.query;
      //let filters = req.body;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let filters = {};
      let {
        quotationId,
        serviceId,
        quotationStatus,
        priority,
        archive,
        location,
        createdBy,
        assignedBy,
        requestedBy,
        quotationFrom,
        quotationTo,
        quotationDueFrom,
        quotationDueTo,
        completedBy,
        completedFrom,
        completedTo,
        assingedTo
      } = req.body;

      if (quotationId) {
        filters["quotations.id"] = quotationId;
      }
      if (serviceId) {
        filters["service_requests.id"] = serviceId;
      }
      if (quotationStatus) {
        filters["quotations.quotationStatus"] = quotationStatus;
      }
      if (priority) {
        filters["service_requests.priority"] = priority;
      }
      if (archive) {
        filters["service_requests.archive"] = archive;
      }
      if (location) {
        filters["service_requests.location"] = location;
      }
      if (createdBy) {
        filters["quotations.createdBy"] = createdBy;
      }
      if (assignedBy) {
        filters["quotations.createdBy"] = assignedBy;
      }

      if (requestedBy) {
        filters["service_requests.requestedBy"] = requestedBy;
      }
      if (quotationFrom && quotationTo) {
        quotationFrom = new Date(quotationFrom).getTime();
        quotationTo = new Date(quotationTo).getTime();
      }
      if (quotationDueFrom && quotationDueTo) {
        quotationDueFrom = quotationDueFrom;
        quotationDueTo = quotationDueTo;
      }
      if (completedBy) {
        filters["quotations.completedBy"] = completedBy;
      }
      if (completedFrom && completedTo) {
        completedFrom = completedFrom;
        completedTo = completedTo;
      }
      if (assingedTo) {
        filters["users.name"] = assingedTo;
      }

      if (_.isEmpty(filters)) {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("quotations")
            .innerJoin(
              "service_requests",
              "quotations.serviceRequestId",
              "service_requests.id"
            )
            .where("quotations.orgId", req.orgId)
            .groupBy(["quotations.id", "service_requests.id"]),
          knex
            .from("quotations")
            .innerJoin(
              "service_requests",
              "quotations.serviceRequestId",
              "service_requests.id"
            )
            .where("quotations.orgId", req.orgId)
            .select([
              "quotations.id as QId",
              "quotations.serviceRequestId as serviceRequestId",              
              "service_requests.description as Description",
              "service_requests.serviceType as Type",
              "service_requests.priority as Priority",
              "quotations.createdBy as CreatedBy",
              "quotations.quotationStatus as Status",
              "quotations.createdAt as DateCreated"
            ])
            .offset(offset)
            .limit(per_page)
        ]);
      } else {
        filters = _.omitBy(filters, val =>
          val === "" || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val)
            ? true
            : false
        );
        try {
          [total, rows] = await Promise.all([
            knex
              .count("* as count")
              .from("quotations")
              .innerJoin(
                "service_requests",
                "quotations.serviceRequestId",
                "service_requests.id"
              )
              .innerJoin(
                "assigned_service_team",
                "service_requests.id",
                "assigned_service_team.entityId"
              )
              .innerJoin("users", "assigned_service_team.userId", "users.id")

              .where(qb => {
                qb.where(filters);
                if (quotationFrom && quotationTo) {
                  qb.whereBetween("quotations.createdAt", [
                    quotationFrom,
                    quotationTo
                  ]);
                }
                qb.where("quotations.orgId", req.orgId)
              })
              .groupBy([
                "quotations.id",
                "service_requests.id",
                "assigned_service_team.id",
                "users.id"
              ]),
            knex
              .from("quotations")
              .innerJoin(
                "service_requests",
                "quotations.serviceRequestId",
                "service_requests.id"
              )
              .innerJoin(
                "assigned_service_team",
                "service_requests.id",
                "assigned_service_team.entityId"
              )
              .innerJoin("users", "assigned_service_team.userId", "users.id")
              .select([
                "quotations.id as QId",
                "quotations.serviceRequestId as serviceRequestId",
                "service_requests.description as Description",
                "service_requests.serviceType as Type",
                "service_requests.priority as Priority",
                "quotations.createdBy as Created By",
                "quotations.quotationStatus as Status",
                "quotations.createdAt as Date Created"
              ])
              .where(qb => {
                qb.where(filters);
                if (quotationFrom && quotationTo) {
                  qb.whereBetween("quotations.createdAt", [
                    quotationFrom,
                    quotationTo
                  ]);
                }
                qb.where("quotations.orgId", req.orgId)
              })
              .offset(offset)
              .limit(per_page)
          ]);
        } catch (e) {
          // Error
        }
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

      return res.status(200).json({
        data: {
          quotations: pagination
        },
        message: "Quotations List!"
      });
    } catch (err) {
      console.log("[controllers][quotation][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  exportQuotation: async (req, res) => {
    try {
      let reqData = req.query;
      //let filters = req.body;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let filters = {};
      let {
        quotationId,
        serviceId,
        quotationStatus,
        priority,
        archive,
        location,
        createdBy,
        assignedBy,
        requestedBy,
        quotationFrom,
        quotationTo,
        quotationDueFrom,
        quotationDueTo,
        completedBy,
        completedFrom,
        completedTo,
        assingedTo
      } = req.body;

      if (quotationId) {
        filters["quotations.id"] = quotationId;
      }
      if (serviceId) {
        filters["service_requests.id"] = serviceId;
      }
      if (quotationStatus) {
        filters["quotations.quotationStatus"] = quotationStatus;
      }
      if (priority) {
        filters["service_requests.priority"] = priority;
      }
      if (archive) {
        filters["service_requests.archive"] = archive;
      }
      if (location) {
        filters["service_requests.location"] = location;
      }
      if (createdBy) {
        filters["quotations.createdBy"] = createdBy;
      }
      if (assignedBy) {
        filters["quotations.createdBy"] = assignedBy;
      }

      if (requestedBy) {
        filters["service_requests.requestedBy"] = requestedBy;
      }
      if (quotationFrom && quotationTo) {
        quotationFrom = new Date(quotationFrom).getTime();
        quotationTo = new Date(quotationTo).getTime();
      }
      if (quotationDueFrom && quotationDueTo) {
        quotationDueFrom = quotationDueFrom;
        quotationDueTo = quotationDueTo;
      }
      if (completedBy) {
        filters["quotations.completedBy"] = completedBy;
      }
      if (completedFrom && completedTo) {
        completedFrom = completedFrom;
        completedTo = completedTo;
      }
      if (assingedTo) {
        filters["users.name"] = assingedTo;
      }

      if (_.isEmpty(filters)) {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("quotations")
            .innerJoin(
              "service_requests",
              "quotations.serviceRequestId",
              "service_requests.id"
            )
            .select(["quotations.id as id"])
            .groupBy(["quotations.id", "service_requests.id"]),
          knex
            .from("quotations")
            .innerJoin(
              "service_requests",
              "quotations.serviceRequestId",
              "service_requests.id"
            )
            .select([
              "quotations.id as Q Id",
              "service_requests.description as Description",
              "service_requests.serviceType as Type",
              "service_requests.priority as Priority",
              "quotations.createdBy as Created By",
              "quotations.quotationStatus as Status",
              "quotations.createdAt as Date Created"
            ])
            .offset(offset)
            .limit(per_page)
        ]);
      } else {
        filters = _.omitBy(filters, val =>
          val === "" || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val)
            ? true
            : false
        );
        try {
          [total, rows] = await Promise.all([
            knex
              .count("* as count")
              .from("quotations")
              .innerJoin(
                "service_requests",
                "quotations.serviceRequestId",
                "service_requests.id"
              )
              .innerJoin(
                "assigned_service_team",
                "service_requests.id",
                "assigned_service_team.entityId"
              )
              .innerJoin("users", "assigned_service_team.userId", "users.id")
              .select(["quotations.id as id"])
              .where(qb => {
                qb.where(filters);
                if (quotationFrom && quotationTo) {
                  qb.whereBetween("quotations.createdAt", [
                    quotationFrom,
                    quotationTo
                  ]);
                }
              })
              .groupBy([
                "quotations.id",
                "service_requests.id",
                "assigned_service_team.id",
                "users.id"
              ]),
            knex
              .from("quotations")
              .innerJoin(
                "service_requests",
                "quotations.serviceRequestId",
                "service_requests.id"
              )
              .innerJoin(
                "assigned_service_team",
                "service_requests.id",
                "assigned_service_team.entityId"
              )
              .innerJoin("users", "assigned_service_team.userId", "users.id")

              .select([
                "quotations.id as Q Id",
                "service_requests.description as Description",
                "service_requests.serviceType as Type",
                "service_requests.priority as Priority",
                "quotations.createdBy as Created By",
                "quotations.quotationStatus as Status",
                "quotations.createdAt as Date Created"
              ])
              .where(qb => {
                qb.where(filters);
                if (quotationFrom && quotationTo) {
                  qb.whereBetween("quotations.createdAt", [
                    quotationFrom,
                    quotationTo
                  ]);
                }
              })
              .offset(offset)
              .limit(per_page)
          ]);
        } catch (e) {
          // Error
        }
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "uploads/Quotation-" + Date.now() + ".csv";
      let check = XLSX.writeFile(wb, filename);

      return res.status(200).json({
        data: rows,
        message: "Quotation Data Export Successfully!"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = quotationsController;
