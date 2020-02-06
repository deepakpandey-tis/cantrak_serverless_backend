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
      let userId = req.me.id;

      await knex.transaction(async trx => {
        let images = [];

        let quotationPayload = _.omit(req.body, ["images"]);
        images = req.body.images;

        console.log(
          "[controllers][quotations][updateQuotation] : Quotation Body", quotationPayload
        );


        // // validate keys for part
        // const quotationSinglePart = Joi.object().keys({
        //   partName: Joi.string().required(),
        //   id: Joi.string().required(),
        //   partCode: Joi.string().required(),
        //   quantity: Joi.string().required(),
        //   unitCost: Joi.number().required(),
        // })
        // // validate keys for charges
        // const quotationSingleCharge = Joi.object().keys({
        //   chargeCode: Joi.string().required(),
        //   id: Joi.string().required(),
        //   calculationUnit: Joi.string().required(),
        //   rate: Joi.number().required(),
        //   totalHours: Joi.string().required(),
        // })



        // validate keys
        const schema = Joi.object().keys({
          serviceRequestId: Joi.string().allow('').optional(),
          company: Joi.number().required(),
          project: Joi.number().required(),
          building: Joi.number().required(),
          floor: Joi.number().required(),
          unit: Joi.number().required(),
          quotationId: Joi.number().required(),
          checkedBy: Joi.string().required(),
          inspectedBy: Joi.string().required(),
          acknowledgeBy: Joi.string().required()
          // quotationData: Joi.array().required()
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
        let serId = 0

        if (quotationPayload.serviceRequestId) {
          serId = quotationPayload.serviceRequestId
        }

        const updateQuotationReq = await knex
          .update({
            serviceRequestId: serId,
            companyId: quotationPayload.company,
            projectId: quotationPayload.project,
            buildingId: quotationPayload.building,
            floorId: quotationPayload.floor,
            unitId: quotationPayload.unit,
            checkedBy: quotationPayload.checkedBy,
            inspectedBy: quotationPayload.inspectedBy,
            acknowledgeBy: quotationPayload.acknowledgeBy,
            // invoiceData: JSON.stringify(quotationPayload.quotationData),
            updatedAt: currentTime,
            isActive: true,
            moderationStatus: 1,
            quotationStatus: 'Pending',
            createdBy: userId
          })
          .where({ id: quotationPayload.quotationId })
          .returning(["*"])
          .transacting(trx)
          .into("quotations");


        // Start Update Assigned Parts In Quotations

        // let partsLength = quotationPayload.quotationData[0].parts.length;
        // console.log("parts length", partsLength);

        // let partsData;
        // for (let i = 0; i < partsLength; i++) {
        //   console.log("partsArray", quotationPayload.quotationData[0].parts[i]);
        //   partsData = quotationPayload.quotationData[0].parts[i];
        //   updateAssignedParts = await knex
        //     .update({
        //       unitCost: partsData.unitCost,
        //       quantity: partsData.quantity,
        //       updatedAt: currentTime
        //     })
        //     .where({
        //       entityId: quotationPayload.quotationId,
        //       entityType: "quotations",
        //       partId: partsData.id
        //     })
        //     .returning(["*"])
        //     .transacting(trx)
        //     .into("assigned_parts");
        // }


        // Start Update Assigned Charges In Quotations

        // let chargesLength = quotationPayload.quotationData[0].charges.length;
        // console.log("charges length", chargesLength);

        // let chargesData;
        // for (let j = 0; j < chargesLength; j++) {
        //   console.log("chargesArray", quotationPayload.quotationData[0].charges[j]);
        //   chargesData = quotationPayload.quotationData[0].charges[j];
        //   updateAssignedCharges = await knex
        //     .update({
        //       chargeId: chargesData.id,
        //       totalHours: chargesData.totalHours,
        //       rate: chargesData.rate,
        //       updatedAt: currentTime
        //     })
        //     .where({
        //       entityId: quotationPayload.quotationId,
        //       entityType: "quotations",
        //       chargeId: chargesData.id
        //     })
        //     .returning(["*"])
        //     .transacting(trx)
        //     .into("assigned_service_charges");
        // }

        // console.log(
        //   "[controllers][quotations][updateQuotation]: Update Data",
        //   updateQuotationReq
        // );
        quotationsResponse = updateQuotationReq[0];
        trx.commit;

        return res.status(200).json({
          data: {
            quotationsResponse
          },
          message: "Quotations updated successfully !"
        });
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
      //let quotationRequestId = req.query.id;
      // Get Quotations Details

      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          quotationId: Joi.number().required()
        });

        let result = Joi.validate(payload, schema);
        console.log(
          "[controllers][quotation][Quotation Details]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let quotationRequestId = payload.quotationId;

        quotationView = await knex("quotations")
          .leftJoin('companies', 'quotations.companyId', 'companies.id')
          .leftJoin('projects', 'quotations.projectId', 'projects.id')
          .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
          .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
          .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
          .leftJoin(
            "assigned_service_team as astm", "astm.entityId", "=", "quotations.id",
            "astm.entityType", "=", "quotations"
          )
          .leftJoin("teams", "teams.teamId", "=", "astm.teamId")
          .leftJoin("users as astUser", "astUser.id", "=", "astm.userId")

          .leftJoin("users as authUser", "authUser.id", "=", "quotations.createdBy")
          .leftJoin("users as checkUser", "checkUser.id", "=", "quotations.checkedBy")
          .leftJoin("users as inspectedUser", "inspectedUser.id", "=", "quotations.inspectedBy")
          .leftJoin("users as acknowledgeUser", "acknowledgeUser.id", "=", "quotations.acknowledgeBy")
          .leftJoin(
            "quotation_service_charges", "quotation_service_charges.quotationId", "=",
            "quotation_service_charges.quotationId"
          )
          .leftJoin("organisation_user_roles", "astm.userId", "=", "organisation_user_roles.userId")
          .leftJoin("organisation_roles", "organisation_user_roles.roleId", "=", "organisation_roles.id")
          .select(
            "quotations.id as quotationId",
            "quotations.serviceRequestId as serviceRequestId",
            "checkUser.name as checkedBy",
            "inspectedUser.name as inspectedBy",
            "checkUser.id as checkedByUserId",
            "inspectedUser.id as inspectedByUserId",
            "acknowledgeUser.id as acknowledgeByUserId",
            "acknowledgeUser.name as acknowledgeBy",
            "quotations.createdAt",
            "quotations.quotationStatus",
            "companies.companyName",
            "projects.projectName",
            "buildings_and_phases.buildingPhaseCode",
            "floor_and_zones.floorZoneCode",
            "property_units.unitNumber",
            "companies.id as companyId",
            "projects.id as projectId",
            "buildings_and_phases.id as buildingId",
            "floor_and_zones.id as floorId",
            "property_units.id as unitId",
            "teams.teamName as assignTeam",
            "astUser.name as assignedMainUsers",
            "authUser.name as createdBy",
            "organisation_roles.name as userRole",
            "quotations.invoiceData as invoiceData"
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
          ["updatedAt"]
        );

        // Get addtional User list For Quotations
        addtionalUser = await knex("assigned_service_additional_users")
          .leftJoin("users", "assigned_service_additional_users.userId", "=", "users.id")
          .leftJoin("organisation_user_roles", "assigned_service_additional_users.userId", "=", "organisation_user_roles.userId")
          .leftJoin("organisation_roles", "organisation_user_roles.roleId", "=", "organisation_roles.id")
          .select("users.name as addtionalUsers", "organisation_roles.name as userRole")
          .where({
            "assigned_service_additional_users.entityId": quotationRequestId,
            "assigned_service_additional_users.entityType": "quotations"
          });
        console.log(
          "[controllers][teams][getTeamList] : Addtional Users List", addtionalUser
        );
        quotationsDetails.addtinalUserList = addtionalUser;
        quotationsDetails.parts = [];
        quotationsDetails.assets = [];
        quotationsDetails.charges = [];

        teamResult = { quotation: quotationsDetails };
      });

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
          quantity: Joi.number().required(),
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
          createdAt: currentTime,
          orgId: req.orgId
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
          status: payload.status,
          orgId: req.orgId
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
      const accessibleProjects = req.userProjectResources[0].projects

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
            .leftJoin('companies', 'quotations.companyId', 'companies.id')
            .leftJoin('projects', 'quotations.projectId', 'projects.id')
            .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
            .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
            .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
            .from("quotations")
            .leftJoin(
              "service_requests",
              "quotations.serviceRequestId",
              "service_requests.id"
            )
            .leftJoin(
              "assigned_service_team",
              "service_requests.id",
              "assigned_service_team.entityId"
            )
            .leftJoin("users", "quotations.createdBy", "users.id")
            .where("quotations.orgId", req.orgId)
            .whereIn('quotations.projectId', accessibleProjects)
            .havingNotNull('quotations.quotationStatus')
            .groupBy(["quotations.id", "service_requests.id", "assigned_service_team.id", "users.id", "companies.companyName",
              "projects.projectName",
              "buildings_and_phases.buildingPhaseCode",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",]),
          knex
            .from("quotations")
            .leftJoin('companies', 'quotations.companyId', 'companies.id')
            .leftJoin('projects', 'quotations.projectId', 'projects.id')
            .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
            .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
            .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
            .leftJoin(
              "service_requests",
              "quotations.serviceRequestId",
              "service_requests.id"
            )
            .leftJoin(
              "assigned_service_team",
              "service_requests.id",
              "assigned_service_team.entityId"
            )
            .leftJoin("users", "quotations.createdBy", "users.id")

            .where("quotations.orgId", req.orgId)
            .whereIn('quotations.projectId', accessibleProjects)
            .select([
              "quotations.id as QId",
              "quotations.serviceRequestId as serviceRequestId",
              "service_requests.description as Description",
              "service_requests.id as SRID",
              "service_requests.priority as Priority",
              "users.name as Created By",
              "companies.companyName",
              "projects.projectName",
              "buildings_and_phases.buildingPhaseCode",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",

              "quotations.quotationStatus as Status",
              "quotations.createdAt as Date Created"
            ])
            .havingNotNull('quotations.quotationStatus')
            .groupBy(["quotations.id", "service_requests.id", "assigned_service_team.id", "users.id", "companies.companyName",
              "projects.projectName",
              "buildings_and_phases.buildingPhaseCode",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",])
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
              .leftJoin('companies', 'quotations.companyId', 'companies.id')
              .leftJoin('projects', 'quotations.projectId', 'projects.id')
              .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
              .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
              .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
              .leftJoin(
                "service_requests",
                "quotations.serviceRequestId",
                "service_requests.id"
              )
              .leftJoin(
                "assigned_service_team",
                "service_requests.id",
                "assigned_service_team.entityId"
              )
              .leftJoin("users", "assigned_service_team.userId", "users.id")

              .where(qb => {
                qb.where(filters);
                if (quotationFrom && quotationTo) {
                  qb.whereBetween("quotations.createdAt", [
                    quotationFrom,
                    quotationTo
                  ]);
                }
                qb.where("quotations.orgId", req.orgId)
                qb.whereIn('quotations.projectId', accessibleProjects)

              })
              .havingNotNull('quotations.quotationStatus')
              .groupBy([
                "quotations.id",
                "service_requests.id",
                "assigned_service_team.id",
                "users.id", "companies.companyName",
                "projects.projectName",
                "buildings_and_phases.buildingPhaseCode",
                "floor_and_zones.floorZoneCode",
                "property_units.unitNumber",
              ]),
            knex
              .from("quotations")
              .leftJoin('companies', 'quotations.companyId', 'companies.id')
              .leftJoin('projects', 'quotations.projectId', 'projects.id')
              .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
              .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
              .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
              .leftJoin(
                "service_requests",
                "quotations.serviceRequestId",
                "service_requests.id"
              )
              .leftJoin(
                "assigned_service_team",
                "service_requests.id",
                "assigned_service_team.entityId"
              )
              .leftJoin("users", "quotations.createdBy", "users.id")
              .select([
                "quotations.id as QId",
                "quotations.serviceRequestId as serviceRequestId",
                "service_requests.description as Description",
                "service_requests.id as SRID",
                "service_requests.priority as Priority",
                "users.name as Created By",
                "companies.companyName",
                "projects.projectName",
                "buildings_and_phases.buildingPhaseCode",
                "floor_and_zones.floorZoneCode",
                "property_units.unitNumber",

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
                qb.whereIn('quotations.projectId', accessibleProjects)
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
  },
  updateQuotationNotes: async (req, res) => {
    // Define try/catch block
    try {
      let userId = req.me.id;
      let problemImagesData = [];


      await knex.transaction(async trx => {
        let upNotesPayload = _.omit(req.body, ["images"]);
        console.log(
          "[controllers][quotation][updateNotes] : Request Body",
          upNotesPayload
        );

        // validate keys
        const schema = Joi.object().keys({
          quotationId: Joi.number().required(),
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
          quotationId: upNotesPayload.quotationId,
          description: upNotesPayload.description,
          orgId: req.orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        console.log(
          "[controllers][quotation][quotationPostNotes] : Insert Data ",
          insertData
        );

        const resultSurveyNotes = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("quotation_post_update");
        notesData = resultSurveyNotes;
        quotationNoteId = notesData[0];

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
                entityId: quotationNoteId.id,
                ...image,
                entityType: "quotation_notes",
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId
              })
              .returning(["*"])
              .transacting(trx)
              .into("images");
            problemImagesData.push(d[0]);
          }
        }

        /*INSERT IMAGE TABLE DATA CLOSE */

        if (problemImagesData[0] && problemImagesData[0].s3Url) {
          notesData = { ...notesData, s3Url: problemImagesData[0].s3Url }
        }

        trx.commit;

        res.status(200).json({
          data: {
            quotationNotesResponse: {
              notesData: [notesData]
            }
          },
          message: "Quotation Note updated successfully !"
        });
      });
    } catch (err) {
      console.log("[controllers][quotation][quotationPostNotes] : Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getQuotationNoteList: async (req, res) => {
    try {
      let quotationNoteList = null;

      //await knex.transaction(async (trx) => {
      let quotation = req.body;

      const schema = Joi.object().keys({
        quotationId: Joi.number().required()
      });
      let result = Joi.validate(quotation, schema);
      console.log(
        "[controllers][quotation][getquotationPostNotes]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      let quotationId = quotation.quotationId;

      // surveyOrderNoteResult = await knex
      //   .from("survey_order_post_update")
      //   .select()
      //   .where({
      //     surveyOrderId: surveyOrder.surveyOrderId,
      //     isActive: "true",
      //     orgId: req.orgId
      //   });
      // surveyOrderNoteList = surveyOrderNoteResult;
      let quotationNoteResult = await knex.raw(`select "quotation_post_update".*,"images"."s3Url","users"."name" as "createdBy" from "quotation_post_update"  left join "users" on "quotation_post_update"."createdBy" = "users"."id"  left join "images" on "quotation_post_update"."id" = "images"."entityId"  where "quotation_post_update"."orgId" = ${req.orgId} and "quotation_post_update"."quotationId" = ${quotationId} and "quotation_post_update"."isActive" = 'true'`)

      quotationNoteList = quotationNoteResult.rows;

      return res.status(200).json({
        data: quotationNoteList,
        message: "Quotation Order Details"
      });

      //});
    } catch (err) {
      console.log(
        "[controllers][quotation][getQuotationDetails] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deleteQuotationRemark: async (req, res) => {
    try {
      let quotation = null;
      await knex.transaction(async trx => {
        let currentTime = new Date().getTime();
        const remarkPayload = req.body;
        const schema = Joi.object().keys({
          remarkId: Joi.number().required()
        });

        let result = Joi.validate(remarkPayload, schema);
        console.log("[controllers][quotation]: JOi Result", result);

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
          .into("quotation_post_update");

        trx.commit;

        return res.status(200).json({
          data: {
            deletedRemark: updatedRemark
          },
          message: "Quotation remarks deleted successfully !"
        });
      });
    } catch (err) {
      console.log("[controllers][quotation][remaks] :  Error", err);
      //trx.rollback
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getQuotationAssignedAssets: async (req, res) => {
    try {
      let { quotationId } = req.body;
      let reqData = req.query;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      [total, rows] = await Promise.all([
        knex("assigned_assets")
          .leftJoin(
            "asset_master",
            "assigned_assets.assetId",
            "asset_master.id"
          )
          .leftJoin(
            "asset_category_master",
            "asset_master.assetCategoryId",
            "asset_category_master.id"
          )

          .leftJoin("companies", "asset_master.companyId", "companies.id")
          .select([
            "asset_master.id as id",
            "asset_master.assetName as assetName",
            "asset_master.model as model",
            "asset_category_master.categoryName as categoryName",
            "companies.companyName as companyName"
          ])
          .where({
            entityType: "quotations",
            entityId: quotationId,
            "asset_master.orgId": req.orgId
          }),

        knex("assigned_assets")
          .leftJoin(
            "asset_master",
            "assigned_assets.assetId",
            "asset_master.id"
          )
          .leftJoin(
            "asset_category_master",
            "asset_master.assetCategoryId",
            "asset_category_master.id"
          )

          .leftJoin("companies", "asset_master.companyId", "companies.id")

          .select([
            "asset_master.id as id",

            "asset_master.assetName as assetName",
            "asset_master.model as model",
            "asset_category_master.categoryName as categoryName",
            "companies.companyName as companyName"
          ])
          .where({
            entityType: "quotations",
            entityId: quotationId,
            "asset_master.orgId": req.orgId
          })
          .limit(per_page)
          .offset(offset)
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
        data: {
          assets: pagination
        }
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  approveQuotation: async (req, res) => {
    try {
      let quotation = null;
      let message;
      let approveQuotation;
      await knex.transaction(async trx => {
        let currentTime = new Date().getTime();
        const quotationPayload = req.body;
        let userId = req.me.id;

        const schema = Joi.object().keys({
          quotationId: Joi.number().required(),
          status: Joi.string().required()
        });

        let result = Joi.validate(quotationPayload, schema);
        console.log("[controllers][quotation]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        if (quotationPayload.status == 'Approved') {
          // Now approved quotation
          approveQuotation = await knex
            .update({
              quotationStatus: quotationPayload.status,
              updatedAt: currentTime,
              updatedBy: userId,
              approvedBy: userId,
              orgId: req.orgId
            })
            .where({
              id: quotationPayload.quotationId
            })
            .returning(["*"])
            .transacting(trx)
            .into("quotations");

          message = "Quotation approved successfully !";
        } else if (quotationPayload.status == 'Canceled') {
          // Now canceled quotation
          approveQuotation = await knex
            .update({
              quotationStatus: quotationPayload.status,
              updatedAt: currentTime,
              updatedBy: userId,
              cancelledBy: userId,
              orgId: req.orgId
            })
            .where({
              id: quotationPayload.quotationId
            })
            .returning(["*"])
            .transacting(trx)
            .into("quotations");

          message = "Quotation has been canceled !";
        }

        trx.commit;

        return res.status(200).json({
          data: {
            quotation: approveQuotation
          },
          message: message
        });
      });
    } catch (err) {
      console.log("[controllers][quotation][remaks] :  Error", err);
      //trx.rollback
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getQuotationInvoice: async (req, res) => {
    try {
      let { quotationId } = req.body;
      let rows;
      let userInfo;
      let requesterInfo;
      let orgId = req.orgId;

      let pagination = {};
      [rows] = await Promise.all([
        knex("quotations")
          .leftJoin(
            "taxes",
            "quotations.vatId",
            "taxes.id"
          )
          .select([
            "taxes.taxCode as taxCode",
            "quotations.*"
          ])
          .where({
            "quotations.id": quotationId,
            "quotations.orgId": req.orgId
          })
      ]);


      let quotationMaster = await knex("quotations")
        .leftJoin("users", "quotations.createdBy", "=", "users.id")
        .select(
          "quotations.serviceRequestId",
          "users.name as quotationsCreated",
          "quotations.unitId",
          "quotations.createdAt"
          
        )
        .where({ "quotations.id": quotationId, "quotations.orgId": orgId }).first();

      let serviceRequestId = quotationMaster.serviceRequestId;
      console.log("serviceRequestId", serviceRequestId);

      const DataResult = await knex("service_requests").where({
        id: serviceRequestId,
        isActive: "true"
      }).first();


      requesterInfo = await knex("service_requests")
        .leftJoin("requested_by", "service_requests.requestedBy", "=", "requested_by.id")
        .leftJoin("source_of_request", "service_requests.serviceType", "=", "source_of_request.id")
        .select(
          "requested_by.name",
          "source_of_request.requestCode",
          "service_requests.createdAt",
          "service_requests.description",
          "service_requests.location"
        )
        .where({
          "service_requests.id": serviceRequestId
        }).first();
      requesterData = requesterInfo;
      console.log("requestedByDetails", requesterData);


      tenantInfo = await knex("user_house_allocation")
        .leftJoin("users", "user_house_allocation.userId", "=", "users.id")
        .select(
          "users.name",
          "users.mobileNo",
          "users.email",
          "users.location"
        )
        .where({
          "user_house_allocation.houseId": quotationMaster.unitId
        }).first();
      tenantData = tenantInfo;
      console.log("tenantDataInfo", tenantData);

      propertyInfo = await knex("property_units")
        .leftJoin("companies", "property_units.companyId", "=", "companies.id")
        .leftJoin("projects", "property_units.projectId", "=", "projects.id")
        .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "=", "buildings_and_phases.id")
        .leftJoin("floor_and_zones", "property_units.floorZoneId", "=", "floor_and_zones.id")
        .select(
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
          "buildings_and_phases.buildingPhaseCode",
          "buildings_and_phases.description as buildingPhaseDescription",
          "floor_and_zones.floorZoneCode",
          "floor_and_zones.description as floorZoneDescription",
          "property_units.unitNumber as unitNumber",
          "property_units.description as unitDescription",
          "property_units.houseId as houseId",
          "companies.logoFile"
        )
        .where({
          "property_units.id": quotationMaster.unitId
        }).first();

        console.log("PropertyInfo",propertyInfo);

      userInfo = { ...tenantInfo, requesterInfo, propertyInfo, serviceMaster: quotationMaster }
      pagination.data = rows;
      pagination.tenant = userInfo;
      // pagination.propertyDetails = userInfo;
      // pagination.companyData = companyInfo;

      return res.status(200).json({
        data: {
          quotation: pagination
        }
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateQuotationsInvoice: async (req, res) => {
    try {
      let orgId = req.orgId;
      let userId = req.me.id;
      let quotationPayload = req.body;
      let updateAssignedParts;
      let updateAssignedCharges;
      await knex.transaction(async trx => {
        // validate keys
        const quotationSinglePart = Joi.object().keys({
          partName: Joi.string().required(),
          id: Joi.string().required(),
          partCode: Joi.string().required(),
          quantity: Joi.string().required(),
          unitCost: Joi.number().required(),
        })
        const quotationSingleCharge = Joi.object().keys({
          chargeCode: Joi.string().required(),
          id: Joi.string().required(),
          calculationUnit: Joi.string().required(),
          rate: Joi.number().required(),
          totalHours: Joi.string().required(),
        })

        const quotationSingle = Joi.object().keys({
          parts: Joi.array().items(quotationSinglePart),
          charges: Joi.array().items(quotationSingleCharge),
          subTotal: Joi.number().required(),
          grandTotal: Joi.number().required(),
          vatId: Joi.number().required(),
          vatRate: Joi.number().required(),
        })
        const schema = Joi.object().keys({
          serviceRequestId: Joi.string().allow('').optional(),
          quotationId: Joi.number().required(),
          quotationData: Joi.array().items(quotationSingle)
        });

        // const result = Joi.validate(JSON.parse(quotationPayload), schema);
        const result = schema.validate(quotationPayload)

        console.log(
          "[controllers][quotations][updateQuotationInvoice]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Update in quotation update table,
        const currentTime = new Date().getTime();
        let srId = 0

        if (quotationPayload.serviceRequestId) {
          srId = quotationPayload.serviceRequestId
        }

        const updateQuotationReq = await knex
          .update({
            serviceRequestId: srId,
            invoiceData: JSON.stringify(quotationPayload.quotationData),
            updatedAt: currentTime
          })
          .where({ id: quotationPayload.quotationId })
          .returning(["*"])
          .transacting(trx)
          .into("quotations");

        // Start Update Assigned Parts In Quotations

        let partsLength = quotationPayload.quotationData[0].parts.length;
        console.log("parts length", partsLength);

        let partsData;
        for (let i = 0; i < partsLength; i++) {
          console.log("partsArray", quotationPayload.quotationData[0].parts[i]);
          partsData = quotationPayload.quotationData[0].parts[i];
          updateAssignedParts = await knex
            .update({
              unitCost: partsData.unitCost,
              quantity: partsData.quantity,
              updatedAt: currentTime
            })
            .where({
              entityId: quotationPayload.quotationId,
              entityType: "quotations",
              partId: partsData.id
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_parts");
        }


        // Start Update Assigned Charges In Quotations

        let chargesLength = quotationPayload.quotationData[0].charges.length;
        console.log("charges length", chargesLength);

        let chargesData;
        for (let j = 0; j < chargesLength; j++) {
          console.log("chargesArray", quotationPayload.quotationData[0].charges[j]);
          chargesData = quotationPayload.quotationData[0].charges[j];
          updateAssignedCharges = await knex
            .update({
              chargeId: chargesData.id,
              totalHours: chargesData.totalHours,
              rate: chargesData.rate,
              updatedAt: currentTime
            })
            .where({
              entityId: quotationPayload.quotationId,
              entityType: "quotations",
              chargeId: chargesData.id
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_charges");
        }

        console.log(
          "[controllers][quotations][updateQuotationInvoice]: Update Data",
          updateQuotationReq
        );
        quotationsResponse = updateQuotationReq[0];
        trx.commit;

        return res.status(200).json({
          data: {
            quotationsResponse
          },
          message: "Quotations invoice updated successfully !"
        });
      });
    } catch (err) {
      console.log("[controllers][quotation][updateQuotation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // deleteQuotation:async (req,res) => {
  //   try {
  //     const id = req.body.id;
  //     const deletedRow = await knex('quotations').where({id}).del().returning(['*'])
  //     return res.status(200).json({
  //       data: {
  //         deletedRow,
  //         message: 'Deleted row successfully!'
  //       }
  //     })
  //   } catch(err) {
  //     return res.status(500).json({
  //       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
  //     });
  //   }
  // },
  deleteQuotation: async (req, res) => {
    try {
      const id = req.body.id;
      const deletedRow = await knex('quotations').where({ id }).del().returning(['*'])
      return res.status(200).json({
        data: {
          deletedRow,
          message: 'Deleted row successfully!'
        }
      })
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateQuotationsStatus: async (req, res) => {
    try {
      let quotationId = req.body.data.quotationId;
      //let serviceOrderId = req.body.data.serviceOrderId;
      let updateStatus = req.body.data.status;
      let invoiceDataRow = null 
      let assignedParts = null
     // let finalParts = [];
      const currentTime = new Date();
      console.log('REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7', req.body)
      let status;
      if (updateStatus == 'Approved') {
        let serviceRequestIdRow = await knex('quotations').where({id:quotationId}).select('serviceRequestId').first()
        let serviceOrderIdRow = await knex('service_orders').select('id').where({ serviceRequestId: serviceRequestIdRow.serviceRequestId}).first()
        status = await knex("quotations")
      .update({ quotationStatus: updateStatus, approvedOn: currentTime, approvedBy: req.me.id })
      .where({ id: quotationId });

      
        if (serviceOrderIdRow){
        
              // Add the invoice Data to SO
                 invoiceDataRow = await knex('quotations').select('invoiceData').where({id:quotationId}).first()
                let data = JSON.stringify(invoiceDataRow.invoiceData)
                await knex('service_orders').update({ invoiceData: data }).where({ id: serviceOrderIdRow.id})
        
              // Get assigned parts to quotation
                 assignedParts = await knex('assigned_parts').select('*').where({entityId:quotationId,entityType:'quotations'})
                 assignedCharges = await knex('assigned_service_charges').select([

                   "chargeId",
                   "entityId",
                   "entityType",
                   "createdAt",
                   "updatedAt",
                   "isActive",
                   "orgId",
                   "status",
                   "totalHours",
                   "rate",

                 ]).where({entityId:quotationId,entityType:'quotations'})
                  
                 if(assignedCharges && assignedCharges.length){
                   for (let p of assignedCharges) {
                     await knex('assigned_service_charges').insert({ ...p, status: 'in progress', orgId: req.orgId, createdAt: currentTime.getTime(), updatedAt: currentTime.getTime(), entityId: serviceOrderIdRow.id, entityType: 'service_orders' })
                   }
                 }

                  if(assignedParts && assignedParts.length){
                    //finalParts = assignedParts.map(v => v.partId)
                    for (let p of assignedParts){
                      await knex('assigned_parts').insert({ unitCost:p.unitCost,quantity:p.quantity,status:'in progress',orgId:req.orgId,createdAt:currentTime.getTime(),updatedAt:currentTime.getTime(),partId:p.partId,entityId: serviceOrderIdRow.id,entityType:'service_orders'})
                    }
                  }

      }

      } else if (updateStatus == 'Cancelled') {
        status = await knex("quotations")
          .update({ quotationStatus: updateStatus, cancelledOn: currentTime, cancelledBy: req.me.id })
          .where({ id: quotationId });
      }

      return res.status(200).json({
        data: {
          status: updateStatus
        },
        message: "Quotation status updated successfully!"
      });

    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = quotationsController;
