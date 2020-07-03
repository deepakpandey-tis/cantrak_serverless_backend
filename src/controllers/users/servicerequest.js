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

const AWS = require("aws-sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const https = require("https");

const imageHelper = require("../../helpers/image");


const serviceRequestController = {
  addServiceRequest: async (req, res) => {
    try {
      let serviceRequestId = null;

      await knex.transaction(async trx => {
        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        const insertData = {
          moderationStatus: 0,
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime,
          serviceStatusCode: 'O'
        };

        console.log(
          "[controllers][service][requestId]: Insert Data",
          insertData
        );

        const serviceResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("service_requests");

        serviceRequestId = serviceResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          service: serviceRequestId
        },
        message: "Service Request added successfully !"
      });
    } catch (err) {
      console.log("[controllers][service][requestId] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  addServiceProblems: async (req, res) => {
    try {
      let serviceProblem = null;
      let images = null;

      await knex.transaction(async trx => {
        let orgId = req.orgId;
        const serviceProblemPayload = _.omit(req.body, ["images"]);
        let payload = req.body;
        console.log("[controllers][service][problem]", serviceProblemPayload);

        // validate keys
        const schema = Joi.object().keys({
          serviceRequestId: Joi.string().required(),
          problemId: Joi.string().required(),
          categoryId: Joi.string().required(),
          description: Joi.string().allow("").optional(),
          images: Joi.array().items(Joi.object().keys().min(1))
        });

        const result = Joi.validate(serviceProblemPayload, schema);
        console.log("[controllers][service][problem]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Insert in users table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...serviceProblemPayload,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: orgId
        };

        console.log("[controllers][service][problem]: Insert Data", insertData);

        const problemResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("service_problems");

        serviceProblem = problemResult[0];

        // Add to images with serviceRequestId and service_requests
        if (req.body.images && req.body.images.length) {
          let imagesData = req.body.images;
          for (image of imagesData) {
            let d = await knex
              .insert({
                entityId: payload.serviceRequestId,
                ...image,
                entityType: "service_problems",
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: orgId
              })
              .returning(["*"])
              .transacting(trx)
              .into("images");
            //images.push(d[0])
          }

          // images = req.body.images.map(image => ({
          //   ...image,
          //   createdAt: currentTime,
          //   updatedAt: currentTime,
          //   entityId: serviceProblem.id,
          //   entityType: "service_problems"
          // }));
          // let addedImages = await knex
          //   .insert(images)
          //   .returning(["*"])
          //   .transacting(trx)
          //   .into("images");
          // images = addedImages;
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          serviceProblem: { ...serviceProblem, images }
        },
        message: "Service problem added successfully !"
      });
    } catch (err) {
      console.log("[controllers][service][problem] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  updateImages: async (req, res) => {
    try {
      let serviceRequest = null;

      await knex.transaction(async trx => {
        const imagesPayload = req.body;
        console.log("[controllers][service][images]", imagesPayload);
      });
    } catch (err) {
      console.log("[controllers][service][request] :  Error", err);
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
      const uploadUrlData = await imageHelper.getUploadURL(mimeType, filename, type);

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


  addServiceRequestPart: async (req, res) => {
    try {
      let assignedPart = null;

      await knex.transaction(async trx => {
        let assignedPartPayload = req.body;
        let schema = Joi.object().keys({
          partId: Joi.string().required(),
          unitCost: Joi.string().required(),
          quantity: Joi.string().required(),
          status: Joi.string().required(),
          serviceRequestId: Joi.string().required()
        });

        let result = Joi.validate(assignedPartPayload, schema);
        console.log("[controllers][service][request]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Insert in assigned_parts table,
        const currentTime = new Date().getTime();

        let assignedPartInsertPayload = _.omit(assignedPartPayload, [
          "serviceRequestId"
        ]);

        let insertData = {
          ...assignedPartInsertPayload,
          entityId: assignedPartPayload.serviceRequestId,
          entityType: "service_requests",
          createdAt: currentTime,
          updatedAt: currentTime
        };
        let partResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_parts");
        assignedPart = partResult[0];
        trx.commit;
      });
      res.status(200).json({
        data: {
          assignedPart: assignedPart
        },
        message: "Part added to Service request successfully !"
      });
    } catch (err) {
      console.log("[controllers][service][request] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  addServiceRequestAsset: async (req, res) => {
    try {
      let assignedAsset = null;

      await knex.transaction(async trx => {
        let assignedAssetPayload = req.body;
        let schema = Joi.object().keys({
          assetId: Joi.string().required(),
          price: Joi.string().required(),
          status: Joi.string().required(),
          serviceRequestId: Joi.string().required()
        });

        let result = Joi.validate(assignedAssetPayload, schema);
        console.log("[controllers][service][request]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Insert in assigned_parts table,
        const currentTime = new Date().getTime();

        let assignedAssetInsertPayload = _.omit(assignedAssetPayload, [
          "serviceRequestId"
        ]);

        let insertData = {
          ...assignedAssetInsertPayload,
          entityId: assignedAssetPayload.serviceRequestId,
          entityType: "service_requests",
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        };
        let assetResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_assets");
        assignedAsset = assetResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          assignedAsset: assignedAsset
        },
        message: "Asset added to Service request successfully !"
      });
    } catch (err) {
      console.log("[controllers][service][request] :  Error", err);
      //trx.rollback
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  deleteServiceRequestPart: async (req, res) => {
    try {
      let serviceRequest = null;
      let partResult = null;
      await knex.transaction(async trx => {
        let currentTime = new Date().getTime();
        const partPayload = req.body;
        const schema = Joi.object().keys({
          serviceRequestId: Joi.string().required(),
          partId: Joi.string().required()
        });

        let result = Joi.validate(partPayload, schema);
        console.log("[controllers][service][order]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Now, check whether this service order is completed or not. If completed, we will soft delete the part from assigned_parts table
        let serviceRequestResult = await knex
          .select()
          .where({ id: partPayload.serviceRequestId })
          .returning(["*"])
          .transacting(trx)
          .into("service_requests");

        serviceRequest = serviceRequestResult[0];
        if (String(serviceRequest.serviceStatusCode).toUpperCase() === "CMTD") {
          // Now soft delete and return
          let updatedPart = await knex
            .update({ status: "CMTD", updatedAt: currentTime })
            .where({
              partId: partPayload.partId,
              entityId: partPayload.serviceRequestId,
              entityType: "service_requests"
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_parts");
          //partResult = updatedPartResult[0]
          trx.commit;
          return res.status(200).json({
            data: {
              updatedPart: updatedPart
            },
            message: "Assigned part status updated successfully !"
          });
        }
        trx.commit;
        return res.status(200).json({
          data: {
            updatedPart: null
          },
          message:
            "Part status for this service request can not be updated because this service order is not completed yet."
        });
      });
    } catch (err) {
      console.log("[controllers][service][order] :  Error", err);
      //trx.rollback
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  deleteServiceRequestAsset: async (req, res) => {
    try {
      let serviceOrder = null;
      let partResult = null;
      await knex.transaction(async trx => {
        let currentTime = new Date().getTime();
        const assetPayload = req.body;
        const schema = Joi.object().keys({
          serviceRequestId: Joi.string().required(),
          assetId: Joi.string().required()
        });

        let result = Joi.validate(assetPayload, schema);
        console.log("[controllers][service][order]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Now, check whether this service order is completed or not. If completed, we will soft delete the asset from assigned_parts table
        let serviceRequestResult = await knex
          .select()
          .where({ id: assetPayload.serviceRequestId })
          .returning(["*"])
          .transacting(trx)
          .into("service_requests");

        serviceRequest = serviceRequestResult[0];
        if (String(serviceRequest.serviceStatusCode).toUpperCase() === "CMTD") {
          // Now soft delete and return
          let updatedAsset = await knex
            .update({ status: "CMTD", updatedAt: currentTime })
            .where({
              assetId: assetPayload.assetId,
              entityId: assetPayload.serviceRequestId,
              entityType: "service_requests"
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_assets");
          //partResult = updatedPartResult[0]
          trx.commit;
          return res.status(200).json({
            data: {
              updatedAsset: updatedAsset
            },
            message: "Assigned asset status updated successfully !"
          });
        }
        trx.commit;
        return res.status(200).json({
          data: {
            updatedAsset: null
          },
          message:
            "Asset status for this service order can not be updated because this service order is not completed yet."
        });
      });
    } catch (err) {
      console.log("[controllers][service][order] :  Error", err);
      //trx.rollback
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  getServiceRequestList: async (req, res) => {
    // We will get service request list
    try {
      let reqData = req.query;
      let {
        assignedTo,
        closingDate,
        completedBy,
        description,
        dueDateFrom,
        dueDateTo,
        location,
        priority,
        requestedBy,
        serviceFrom,
        serviceId,
        serviceTo,
        serviceType,
        status,
        unit
      } = req.body;
      let total, rows;

      console.log("customerInfo", req.me.id);
      console.log("customerHouseInfo", req.me.houseIds);
      let houseIds = req.me.houseIds;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let filters = {};
      if (description) {
        filters["service_requests.description"] = description;
      }

      // completedOn -> null means due
      // serviceFrom -serviceTo = createdAt

      // Service ID
      if (serviceId) {
        filters["service_requests.displayId"] = serviceId;
      }

      // Location
      if (location) {
        filters["service_requests.location"] = location;
      }
      //  Service Status
      if (status) {
        filters["service_requests.serviceStatusCode"] = status;
      }

      // Service From Data & to Date
      let serviceFromDate, serviceToDate;
      if (serviceFrom && serviceTo) {
        serviceFromDate = new Date(serviceFrom).getTime();
        serviceToDate = new Date(serviceTo).getTime();
      } else if (serviceFrom && !serviceTo) {
        serviceFromDate = new Date(serviceFrom).getTime();
        serviceToDate = new Date("2030-01-01").getTime();
      } else if (!serviceFrom && serviceTo) {
        serviceFromDate = new Date("2000-01-01").getTime();
        serviceToDate = new Date(serviceTo).getTime();
      }

      if (closingDate) {
        filters["service_requests.completedOn"] = closingDate;
      }

      if (priority) {
        filters["service_requests.priority"] = priority;
      }

      if (unit) {
        filters["property_units.id"] = unit;
      }

      if (serviceType) {
        filters["service_requests.serviceType"] = serviceType;
      }

      if (completedBy) {
        filters["service_requests.closedBy"] = completedBy;
      }

      if (assignedTo) {
        filters["assigned_service_team.userId"] = assignedTo;
      }

      if (requestedBy) {
        filters["service_requests.requestedBy"] = requestedBy;
      }
      let dueFrom, dueTo;
      if (dueDateFrom && dueDateTo) {
        dueFrom = new Date(dueDateFrom).getTime()
        dueTo = new Date(dueDateTo).getTime()
      }

      if (_.isEmpty(filters) && _.isEmpty(serviceFrom && serviceTo) && _.isEmpty(dueDateFrom && dueDateTo)) {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("service_requests")
            .leftJoin(
              "property_units",
              "service_requests.houseId",
              "property_units.id"
            )
            .leftJoin(
              "requested_by",
              "service_requests.requestedBy",
              "requested_by.id"
            )

            .leftJoin(
              "service_status AS status",
              "service_requests.serviceStatusCode",
              "status.statusCode"
            )
            .select([
              "service_requests.id as S Id",
              "service_requests.houseId as houseId",
              "service_requests.description as Description",
              "service_requests.priority as Priority",
              "status.descriptionEng as Status",
              "property_units.unitNumber as Unit No",
              "requested_by.name as Requested By",
              "service_requests.createdAt as Date Created",
              "service_requests.displayId as SR#"
            ])
            .groupBy([
              "service_requests.id",
              "property_units.id",
              "status.id",
              "requested_by.id"
            ])
            .where({ "service_requests.orgId": req.orgId })
            .whereIn("service_requests.houseId", houseIds)
            .orWhere("service_requests.createdBy", req.me.id)
            .distinct('service_requests.displayId'),

          knex
            .from("service_requests")
            .leftJoin(
              "property_units",
              "service_requests.houseId",
              "property_units.id"
            )
            .leftJoin(
              "requested_by",
              "service_requests.requestedBy",
              "requested_by.id"
            )
            .leftJoin(
              "service_status AS status",
              "service_requests.serviceStatusCode",
              "status.statusCode"
            )

            .select([
              "service_requests.id as S Id",
              "service_requests.houseId as houseId",
              "service_requests.description as Description",
              "service_requests.priority as Priority",
              "status.descriptionEng as Status",
              "property_units.unitNumber as Unit No",
              "requested_by.name as Requested By",
              "service_requests.createdAt as Date Created",
              "service_requests.displayId as SR#"
            ])
            .offset(offset)
            .limit(per_page)
            .where({ "service_requests.orgId": req.orgId })
            .whereIn("service_requests.houseId", houseIds)
            .orWhere("service_requests.createdBy", req.me.id)
            .distinct('service_requests.displayId')

        ]);

      } else {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("service_requests")
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
              "requested_by",
              "service_requests.requestedBy",
              "requested_by.id"
            )
            .leftJoin(
              "service_status AS status",
              "service_requests.serviceStatusCode",
              "status.statusCode"
            )
            .select([
              "service_requests.id as S Id",
              "service_requests.description as Description",
              "service_requests.priority as Priority",
              "status.descriptionEng as Status",
              "property_units.unitNumber as Unit No",
              "requested_by.name as Requested By",
              "service_requests.createdAt as Date Created",
              "service_requests.displayId as SR#"
            ])
            .where({ "service_requests.orgId": req.orgId })
            .where(qb => {

              if(serviceId){
                qb.where('service_requests.displayId',serviceId)
              }

              if(status){
                qb.where('service_requests.serviceStatusCode',status)
              }

              if (location) {
                qb.where('service_requests.location', 'iLIKE', `%${location}%`)
              }

              if (priority) {
                qb.where("service_requests.priority",priority);
              }

              if (description) {
                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
              }
              if (serviceFromDate && serviceToDate) {
                qb.whereBetween("service_requests.createdAt", [
                  serviceFromDate,
                  serviceToDate
                ]);
              }
              if (dueDateFrom && dueDateTo) {
                console.log("dsfsdfsdfsdfsdfffffffffffffffffff=========")
                qb.whereBetween("service_requests.createdAt", [
                  dueFrom,
                  dueTo
                ]);
                qb.where({ closedBy: "" })
              }
              //qb.where(filters);
            })
            .whereIn("service_requests.houseId", houseIds)
            .orWhere("service_requests.createdBy", req.me.id)
            .groupBy([
              "service_requests.id",
              "requested_by.id",
              "status.id",
              // "service_problems.id",
              // "incident_categories.id",
              "property_units.id"
            ])
            .distinct('service_requests.displayId'),
          knex
            .from("service_requests")
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
              "requested_by",
              "service_requests.requestedBy",
              "requested_by.id"
            )
            .leftJoin(
              "service_status AS status",
              "service_requests.serviceStatusCode",
              "status.statusCode"
            )

            .select([
              "service_requests.id as S Id",
              "service_requests.description as Description",
              "service_requests.priority as Priority",
              "status.descriptionEng as Status",
              "property_units.unitNumber as Unit No",
              "requested_by.name as Requested By",
              "service_requests.createdAt as Date Created",
              "service_requests.displayId as SR#"
            ])
            .where({ "service_requests.orgId": req.orgId })
            .where(qb => {
              if(serviceId){
                qb.where('service_requests.displayId',serviceId)
              }

              if(status){
                qb.where('service_requests.serviceStatusCode',status)
              }

              if (location) {
                qb.where('service_requests.location', 'iLIKE', `%${location}%`)
              }

              if (description) {
                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
              }

              if (priority) {
                qb.where("service_requests.priority",priority);
              }

              if (serviceFromDate && serviceToDate) {
                qb.whereBetween("service_requests.createdAt", [
                  serviceFromDate,
                  serviceToDate
                ]);
              }

              if (dueDateFrom && dueDateTo) {
                qb.whereBetween("service_requests.createdAt", [
                  dueFrom,
                  dueTo
                ]);
                qb.where({ closedBy: "" })
              }
              //qb.where(filters);
            })
            .whereIn("service_requests.houseId", houseIds)
            .orWhere("service_requests.createdBy", req.me.id)
            .offset(offset)
            .limit(per_page)
            .distinct('service_requests.displayId')

        ]);
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
          service_requests: pagination
        },
        message: "Service Request List!"
      });
    } catch (err) {
      console.log("[controllers][service][request] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  getPropertyUnits: async (req, res) => {
    try {
      let ids = req.body;
      let filters = {};
      if (ids.companyId) {
        filters["property_units.companyId"] = ids.companyId;
      }
      if (ids.projectId) {
        filters["property_units.projectId"] = ids.projectId;
      }
      if (ids.buildingPhaseId) {
        filters["property_units.buildingPhaseId"] = ids.buildingPhaseId;
      }
      if (ids.floorZoneId) {
        filters["property_units.floorZoneId"] = ids.floorZoneId;
      }
      if (ids.unitNumber) {
        filters["property_units.unitNumber"] = ids.unitNumber;
      }
      if (ids.houseId) {
        filters["property_units.id"] = ids.houseId;
      }
      const units = await knex
        .from("property_units")
        .innerJoin("companies", "property_units.id", "companies.id")
        .innerJoin("projects", "property_units.projectId", "projects.id")
        .innerJoin(
          "buildings_and_phases",
          "property_units.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .innerJoin(
          "floor_and_zones",
          "property_units.floorZoneId",
          "floor_and_zones.id"
        )
        .where(filters)
        .select([
          "property_units.companyId as companyId",
          "companies.companyName as companyName",
          "property_units.projectId as projectId",
          "projects.projectName as projectName",
          "property_units.buildingPhaseId as buildingPhaseId",
          "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
          "property_units.floorZoneId as floorZoneId",
          "floor_and_zones.floorZoneCode as floorZoneCode",
          "property_units.unitNumber as unitNumber",
          "property_units.id as houseId"
        ]);
      return res.status(200).json({
        data: {
          units
        },
        message: "Property units"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Service Request
  getServiceRequestReportData: async (req, res) => {
    try {
      // We need to extract service requests on monthly basis
      // service requests with completed status
      // based on today's date get the service request of current month
      const payload = req.body;

      // let currentDate = new Date().getTime()

      const schema = Joi.object().keys({
        selectedMonth: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      console.log("[controllers][service][problem]: JOi Result", result);

      let [startDate, plusOneMonth] = getStartAndEndDate(
        payload.selectedMonth,
        "M"
      );
      // Now get the data of the selected month
      const selectG = await knex("service_requests")
        .count("id as count")
        .where({ serviceStatusCode: "G" })
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<", Number(plusOneMonth));
      const selectR = await knex("service_requests")
        .count("id as count")
        .where({ serviceStatusCode: "R" })
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<", Number(plusOneMonth));
      const selectC = await knex("service_requests")
        .count("id as count")
        .where({ serviceStatusCode: "C" })
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<", Number(plusOneMonth));
      const selectA = await knex("service_requests")
        .count("id as count")
        .where({ serviceStatusCode: "A" })
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<", Number(plusOneMonth));

      const selectUS = await knex("service_requests")
        .count("id as count")
        .where({ serviceStatusCode: "US" })
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<", Number(plusOneMonth));
      const selectIP = await knex("service_requests")
        .count("id as count")
        .where({ serviceStatusCode: "IP" })
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<", Number(plusOneMonth));
      const selectOH = await knex("service_requests")
        .count("id as count")
        .where({ serviceStatusCode: "OH" })
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<", Number(plusOneMonth));
      const selectCMTD = await knex("service_requests")
        .count("id as count")
        .where({ serviceStatusCode: "CMTD" })
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<", Number(plusOneMonth));

      //us,ip,oh,cmtd

      return res.status(200).json({
        srConfirm: selectG[0].count,
        srReject: selectR[0].count,
        srCancel: selectC[0].count,
        srApprove: selectA[0].count,
        srUnderSurvey: selectUS[0].count,
        srInProgress: selectIP[0].count,
        srOnHold: selectOH[0].count,
        srCompleted: selectCMTD[0].count
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  getServiceRequestByMonth: async (req, res) => { },


  getUrl: imageHelper.getUploadURL,


  getServiceRequestAssignedAssets: async (req, res) => {
    try {
      let { serviceRequestId } = req.body;
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
          // .leftJoin(
          //   "assigned_assets",
          //   "asset_master.id",
          //   "assigned_assets.assetId"
          // )
          .leftJoin("companies", "asset_master.companyId", "companies.id")
          .select([
            "asset_master.id as id",
            "asset_master.assetName as assetName",
            "asset_master.model as model",
            "asset_category_master.categoryName as categoryName",
            "companies.companyName as companyName"
          ])
          .where({
            entityType: "service_requests",
            entityId: serviceRequestId,
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
          // .leftJoin(
          //   "asset_category_master",
          //   "asset_master.assetCategoryId",
          //   "asset_category_master.id"
          // )
          // .leftJoin(
          //   "assigned_assets",
          //   "asset_master.id",
          //   "assigned_assets.entityId"
          // )
          // .leftJoin("companies", "asset_master.companyId", "companies.id")
          .select([
            "asset_master.id as id",

            "asset_master.assetName as assetName",
            "asset_master.model as model",
            "asset_category_master.categoryName as categoryName",
            "companies.companyName as companyName"
          ])
          .where({
            entityType: "service_requests",
            entityId: serviceRequestId,
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


  /**CREATE SERVICE REQUEST */
  createServiceRequest: async (req, res) => {
    try {
      let result;
      let orgId = req.orgId;
      let payload = _.omit(req.body, ["images", "isSo", "mobile", "email", "name"]);

      await knex.transaction(async trx => {

        const schema = Joi.object().keys({
          serviceRequestId: Joi.number().required(),
          areaName: Joi.string().allow("").optional(),
          building: Joi.string().required(),
          commonArea: Joi.string().allow("").optional(),
          company: Joi.string().required(),
          serviceStatusCode: Joi.string().required(),
          description: Joi.string().required(),
          floor: Joi.string().required(),
          house: Joi.string().allow('').optional(),
          location: Joi.string().allow("").optional(),
          locationTags: Joi.array().items(Joi.string().optional()),
          project: Joi.string().required(),
          serviceType: Joi.string().allow("").optional(),
          unit: Joi.string().required(),
          userId: Joi.string().allow("").optional(),
          priority: Joi.string().allow("").optional(),
          // name: Joi
          //   .allow("")
          //   .optional(),
          // mobile: Joi
          //   .allow("")
          //   .optional(),
          // email: Joi.string()
          //   .allow("")
          //   .optional(),
          uid: Joi.string().allow("").optional()
        });

        const result = Joi.validate(payload, schema);
        console.log("[controllers][service][problem]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        const currentTime = new Date().getTime();


        // Insert into requested by
        let userInfo = await knex('users').where({ id: req.me.id }).select('name', 'email', 'mobileNo').first();;

        const requestedByResult = await knex('requested_by')
          .insert({
            name: userInfo.name,
            mobile: userInfo.mobileNo,
            email: userInfo.email
          }).returning(['*'])


        let serviceTypeInfo = await knex('source_of_request')
          .where('source_of_request.requestCode', 'iLIKE', `%${'Web-app'}%`, 'source_of_request.descriptionEng', 'iLIKE', `%${'Web app'}%`)
          .select('id')
          .first();

        /*UPDATE SERVICE REQUEST DATA OPEN */
        let common;
        let priority;
        if (payload.priority) {
          priority = payload.priority;
        } else {
          priority = "HIGH";
        }


        let propertyUnit = await knex
          .select(['companyId', 'projectId'])
          .where({ id: payload.house })
          .into("property_units").first();


        let insertData;
        if (payload.commonArea) {
          insertData = {
            description: payload.description,
            projectId: payload.project,
            companyId: propertyUnit.companyId,
            houseId: payload.house,
            commonId: payload.commonArea,
            // requestedBy: payload.userId,
            requestedBy: requestedByResult[0].id,
            serviceType: serviceTypeInfo.id,
            location: payload.location,
            priority: priority,
            serviceStatusCode: payload.serviceStatusCode,
            orgId: orgId,
            createdAt: currentTime,
            updatedAt: currentTime,
            isCreatedFromSo: req.body.isSo ? true : false,
            state: req.body.isSo ? 2 : 1,
            createdBy: req.me.id
          };
        } else {
          insertData = {
            description: payload.description,
            projectId: payload.project,
            companyId: propertyUnit.companyId,
            houseId: payload.house,
            requestedBy: requestedByResult[0].id,
            // requestedBy: payload.userId,
            serviceType: serviceTypeInfo.id,
            location: payload.location,
            priority: priority,
            serviceStatusCode: payload.serviceStatusCode,
            orgId: orgId,
            createdAt: currentTime,
            updatedAt: currentTime,
            isCreatedFromSo: req.body.isSo ? true : false,
            state: req.body.isSo ? 2 : 1,
            createdBy: req.me.id
          };
        }
        let serviceResult = await knex
          .update(insertData)
          .where({ id: payload.serviceRequestId })
          .returning(["*"])
          .transacting(trx)
          .into("service_requests");
        /*UPDATE SERVICE REQUEST DATA CLOSE */

        /*INSERT LOCATION TAGS DATA OPEN */
        let locationTagIds = []
        for (let locationTag of payload.locationTags) {
          let result = await knex('location_tags_master').select('id').where({ title: locationTag })
          if (result && result.length) {
            locationTagIds.push(result[0].id)
          } else {
            result = await knex('location_tags_master').insert({ title: locationTag, orgId: req.orgId, createdBy: req.me.id, descriptionEng: locationTag }).returning(['*'])
            locationTagIds.push(result[0].id)
          }
        }
        for (let locationId of locationTagIds) {
          const insertLocation = {
            entityId: payload.serviceRequestId,
            entityType: "service_requests",
            locationTagId: locationId,
            orgId: orgId,
            createdAt: currentTime,
            updatedAt: currentTime
          };
          let locationResult = await knex
            .insert(insertLocation)
            .returning(["*"])
            .transacting(trx)
            .into("location_tags");
        }
        /*INSERT LOCATION TAGS DATA CLOSE*/

        /*INSERT IMAGE TABLE DATA OPEN */

        if (req.body.images && req.body.images.length) {
          let imagesData = req.body.images;
          for (image of imagesData) {
            let d = await knex
              .insert({
                entityId: payload.serviceRequestId,
                ...image,
                entityType: "service_requests",
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: orgId
              })
              .returning(["*"])
              .transacting(trx)
              .into("images");
          }
        }
        /*INSERT IMAGE TABLE DATA CLOSE */

        /*USER DETAIL UPDATE OPEN */
        if (payload.uid) {
          let userUpdateData = {
            name: payload.name,
            mobileNo: payload.mobile,
            email: payload.email
          };
          let userResult = await knex
            .update(userUpdateData)
            .where({ id: payload.uid })
            .returning(["*"])
            .transacting(trx)
            .into("users");
        }
        /*USER DETAIL UPDATE CLOSE */

        trx.commit;
      });

      await knex
        .update({ moderationStatus: true })
        .where({ id: payload.serviceRequestId })
        .into("service_requests");


      return res.status(200).json({
        //data:result,
        message: "Service Request created successfully"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  updateServiceRequest: async (req, res) => {
    try {
      let serviceRequest = null;
      let images = null;
      const serviceRequestPayload = _.omit(req.body, ["images"]);


      await knex.transaction(async trx => {
        images = req.body.images;
        console.log("[controllers][service][request]", serviceRequestPayload);

        // validate keys
        const schema = Joi.object().keys({
          id: Joi.number().required(),
          description: Joi.string().required(),
          requestFor: Joi.string().required(),
          houseId: Joi.string().required(),
          commonId: Joi.string().required(),
          serviceType: Joi.string().required(),
          requestedBy: Joi.string().required(),
          priority: Joi.string().required(),
          location: Joi.string().required(),
          recurrenceType: Joi.string().required(),
          serviceDate: Joi.array().required()
        });

        const result = Joi.validate(serviceRequestPayload, schema);
        console.log("[controllers][service][request]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Insert in service request table,
        const currentTime = new Date().getTime();


        let propertyUnit = await knex
          .select(['companyId', 'projectId'])
          .where({ id: serviceRequestPayload.houseId })
          .into("property_units").first();

        const updateServiceReq = await knex
          .update({
            description: serviceRequestPayload.description,
            requestFor: serviceRequestPayload.requestFor,
            houseId: serviceRequestPayload.houseId,
            projectId: propertyUnit.projectId,
            companyId: propertyUnit.companyId,
            commonId: serviceRequestPayload.commonId,
            serviceType: serviceRequestPayload.serviceType,
            requestedBy: serviceRequestPayload.requestedBy,
            priority: serviceRequestPayload.priority,
            location: serviceRequestPayload.location,
            updatedAt: currentTime,
            isActive: true,
            moderationStatus: true,
            serviceStatusCode: "O"
          })
          .where({ id: serviceRequestPayload.id })
          .returning(["*"])
          .transacting(trx)
          .into("service_requests");

        console.log(
          "[controllers][service][request]: Update Data",
          updateServiceReq
        );

        serviceRequest = updateServiceReq[0];
        serviceOrders = [];

        //
        if (images && images.length) {
          images = req.body.images.map(image => ({
            ...image,
            createdAt: currentTime,
            updatedAt: currentTime,
            entityId: serviceRequestPayload.id,
            entityType: "service_requests"
          }));
          let addedImages = await knex
            .insert(images)
            .returning(["*"])
            .transacting(trx)
            .into("images");
          images = addedImages;
        }

        // Insert into service orders table with selected recrence date
        let dates = serviceRequestPayload.serviceDate;
        console.log("dates", dates);
        let countDates = dates.length;
        console.log("countDates", countDates);

        for (i = 0; i < countDates; i++) {
          let newdate = dates[i]
            .split("-")
            .reverse()
            .join("-");
          let serviceDateExist = await knex("service_orders").where({
            orderDueDate: newdate
          });
          if (serviceDateExist <= 0) {
            let serviceOrderResult = await knex
              .insert({
                serviceRequestId: serviceRequestPayload.id,
                recurrenceType: serviceRequestPayload.recurrenceType,
                orderDueDate: newdate,
                createdAt: currentTime,
                updatedAt: currentTime
              })
              .returning(["*"])
              .transacting(trx)
              .into("service_orders");
            serviceOrders.push(serviceOrderResult[0]);
          }
        }
        trx.commit;
      });

      await knex
        .update({ moderationStatus: true })
        .where({ id: serviceRequestPayload.id })
        .into("service_requests");

      let returnResponse = { serviceRequest, serviceOrder: serviceOrders };

      res.status(200).json({
        data: {
          response: { ...returnResponse, serviceRequestImages: images }
        },
        message: "Service request updated successfully !"
      });
    } catch (err) {
      console.log("[controllers][service][request] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  /**GET COMPANY ,PROJECT , BUILDING ,FLOOR BY HOUSE ID */
  getHouseDetailData: async (req, res) => {
    try {
      let unitResult;
      let userResult;
      await knex.transaction(async trx => {
        let houseId = req.query.houseId;
        let orgId = req.orgId;
        let company, project, propertyType, building, floor;
        let result = await knex
          .from("property_units")
          .select("*")
          .where({ "property_units.id": houseId, orgId: orgId });

        unitResult = result[0];
        let houseResult = await knex
          .from("user_house_allocation")
          .select("userId")
          .where({ "user_house_allocation.houseId": houseId, orgId: orgId });

        if (houseResult && houseResult.length) {
          let user = await knex
            .from("users")
            .select("name", "email", "mobileNo", "id as userId")
            .where({ "users.id": houseResult[0].userId });
          userResult = user[0];
        }
      });
      return res.status(200).json({
        data: {
          unit: unitResult,
          users: userResult
        },
        message: "House Details"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*GET HOUSE ID BY UNIT NO. */
  getHouseIdByUnitNo: async (req, res) => {
    try {
      let unitResult;
      let userResult;
      await knex.transaction(async trx => {
        let orgId = req.orgId;
        let unitId = req.query.unitId;
        let result = await knex
          .from("property_units")
          .select("*")
          .where({ "property_units.id": unitId, orgId: orgId });

        unitResult = result[0];
        let houseResult = await knex
          .from("user_house_allocation")
          .select("userId")
          .where({
            "user_house_allocation.houseId": result[0].houseId,
            orgId: orgId
          });

        if (houseResult && houseResult.length) {
          let user = await knex
            .from("users")
            .select("name", "email", "mobileNo", "id as userId")
            .where({ "users.id": houseResult[0].userId });
          userResult = user[0];
        }
      });
      return res.status(200).json({
        data: {
          houseData: unitResult,
          users: userResult
        },
        message: "House Id Successfully!"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*GET SERVICE REQUEST DETAILS BY SERVICE REQUEST ID. */
  getServiceRequestDetailById: async (req, res) => {
    try {
      let serviceResult;
      let locationTags;
      let problemResult;
      await knex.transaction(async trx => {
        let orgId = req.orgId;
        let id = req.query.id;
        let result = await knex
          .from("service_requests")
          .leftJoin(
            "property_units",
            "service_requests.houseId",
            "property_units.id"
          )
          .leftJoin(
            'requested_by',
            'service_requests.requestedBy',
            'requested_by.id'
          )
          .select(
            "service_requests.houseId as house",
            "service_requests.commonId as commonArea",
            "service_requests.description",
            "service_requests.location",
            "service_requests.priority",
            "service_requests.serviceType",
            "requested_by.name as requestedByName",
            "requested_by.email as requestedByEmail",
            "requested_by.mobile as requestedByMobile",
            "requested_by.id as requestedById",
            "property_units.companyId as company",
            "property_units.buildingPhaseId as building",
            "property_units.floorZoneId as floor",
            "property_units.projectId as project",
            "property_units.id as unit",
            "property_units.type as type"
            //'property_units.',
            //'property_units.',
          )
          .where({ "service_requests.id": id });
        serviceResult = result[0];

        serviceResult.uploadedImages = await knex.from('images')
          .where({ "entityId": id, "entityType": "service_requests" })
          .select('s3Url', 'title', 'name', 'id');

        let problem = await knex("service_problems")
          .leftJoin("incident_categories", "service_problems.categoryId", "=", "incident_categories.id")
          .leftJoin("incident_sub_categories", "service_problems.problemId", "=", "incident_sub_categories.id")
          .select(
            "incident_categories.categoryCode ",
            "incident_categories.descriptionEng as category",
            "incident_categories.id as categoryId",
            "incident_sub_categories.id as subCategoryId",
            // "incident_sub_categories.categoryCode as subCategoryCode",
            "incident_sub_categories.descriptionEng as subCategory",
            "service_problems.description",
            "service_problems.id",
          )
          .where({
            "service_problems.serviceRequestId": id,
            "service_problems.orgId": req.orgId
          });

        problemResult = problem;

        const Parallel = require('async-parallel');
        problemResult = await Parallel.map(problemResult, async pd => {
          imagesResult = await knex.from('images')
            .where({ "entityId": id, "entityType": "service_problems" })
            .select('s3Url', 'title', 'name', 'id');
          return {
            ...pd,
            uploadedImages: imagesResult
          };
        });


        let location = await knex("location_tags")
          .innerJoin('location_tags_master', 'location_tags.locationTagId', 'location_tags_master.id')
          .select(["location_tags.locationTagId", 'location_tags_master.title'])
          .where({ entityId: id, entityType: "service_requests" });
        locationTags = _.uniqBy(location, 'title')
      });

      return res.status(200).json({
        data: {
          serviceData: {
            ...serviceResult,
            locationTags: locationTags,
            problemResult
          }
        },
        message: "Service Request Details Successful!"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*UPDATE SERVICE REQUEST */
  editServiceRequest: async (req, res) => {
    try {
      let result;
      let orgId = req.orgId;
      await knex.transaction(async trx => {
        let payload = _.omit(req.body, ["images", "name", "mobile", "email"]);
        const schema = Joi.object().keys({
          serviceRequestId: Joi.number().required(),
          areaName: Joi.string()
            .allow("")
            .optional(),
          building: Joi.string().required(),
          commonArea: Joi.string()
            .allow("")
            .optional(),
          company: Joi.string().required(),
          description: Joi.string().required(),
          floor: Joi.string().required(),
          house: Joi.string().required(),
          location: Joi.string()
            .allow("")
            .optional(),
          locationTags: Joi.array().items(Joi.string().optional()),
          project: Joi.string().required(),
          serviceType: Joi.string().allow("").optional(),
          unit: Joi.string().required(),
          userId: Joi.string().allow('').optional(),
          priority: Joi.string()
            .allow("")
            .optional(),
          // name: Joi.string()
          //   .allow("")
          //   .optional(),
          // mobile: Joi.string()
          //   .allow("")
          //   .optional(),
          // email: Joi.string()
          //   .allow("")
          //   .optional(),
          uid: Joi.string()
            .allow("")
            .optional(),
          teamId: Joi.string()
            .allow("")
            .optional(),
          additionalUsers: Joi.array().items(Joi.number().optional()),
          mainUserId: Joi.string()
            .allow("")
            .optional()
        });

        const result = Joi.validate(payload, schema);
        console.log("[controllers][service][problem]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        const currentTime = new Date().getTime();

        let currentServiceRequestData = await knex('service_requests')
          .select('*')
          .where({ 'id': payload.serviceRequestId })
          .first();
        // Insert into requested by
        let userInfo = await knex('users').where({ id: req.me.id }).select('name', 'email', 'mobileNo').first();;

        await knex('requested_by')
          .update({ name: userInfo.name, mobile: userInfo.mobileNo, email: userInfo.email })
          .where({ id: currentServiceRequestData.requestedBy });


        /*UPDATE SERVICE REQUEST DATA OPEN */
        let common;
        let priority;
        if (payload.priority) {
          priority = payload.priority;
        } else {
          priority = "HIGH";
        }
        let insertData;
        if (payload.commonArea) {
          insertData = {
            description: payload.description,
            projectId: payload.project,
            houseId: payload.house,
            commonId: payload.commonArea,
            // requestedBy: payload.userId,
            serviceType: payload.serviceType,
            location: payload.location,
            priority: priority,
            serviceStatusCode: "O",
            createdBy: req.me.id,
            orgId: orgId,
            createdAt: currentTime,
            updatedAt: currentTime,
            createdBy: req.me.id
          };
        } else {
          insertData = {
            description: payload.description,
            projectId: payload.project,
            houseId: payload.house,
            // requestedBy: payload.userId,
            serviceType: payload.serviceType,
            location: payload.location,
            createdBy: req.me.id,
            priority: priority,
            serviceStatusCode: "O",
            orgId: orgId,
            createdAt: currentTime,
            updatedAt: currentTime,
            createdBy: req.me.id
          };
        }

        let serviceResult = await knex
          .update(insertData)
          .where({ id: payload.serviceRequestId })
          .returning(["*"])
          .transacting(trx)
          .into("service_requests");
        /*UPDATE SERVICE REQUEST DATA CLOSE */

        let locationTagIds = []
        let finalLocationTags = _.uniq(payload.locationTags)

        for (let locationTag of finalLocationTags) {
          let result = await knex('location_tags_master').select('id').where({ title: locationTag })
          if (result && result.length) {
            locationTagIds.push(result[0].id)
          } else {
            result = await knex('location_tags_master').insert({ title: locationTag, orgId: req.orgId, createdBy: req.me.id, descriptionEng: locationTag }).returning(['*'])
            locationTagIds.push(result[0].id)
          }
        }
        for (let locationId of locationTagIds) {
          const insertLocation = {
            entityId: payload.serviceRequestId,
            entityType: "service_requests",
            locationTagId: locationId,
            orgId: orgId,
            createdAt: currentTime,
            updatedAt: currentTime
          };
          let locationResult = await knex
            .insert(insertLocation)
            .returning(["*"])
            .transacting(trx)
            .into("location_tags");
        }
        /*INSERT LOCATION TAGS DATA CLOSE*/

        /*INSERT IMAGE TABLE DATA OPEN */

        if (req.body.images && req.body.images.length) {
          let imagesData = req.body.images;
          for (image of imagesData) {
            let d = await knex
              .insert({
                entityId: payload.serviceRequestId,
                ...image,
                entityType: "service_requests",
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: orgId
              })
              .returning(["*"])
              .transacting(trx)
              .into("images");
          }
        }
        /*INSERT IMAGE TABLE DATA CLOSE */

        /*USER DETAIL UPDATE OPEN */
        if (payload.uid) {
          let userUpdateData = {
            name: payload.name,
            mobileNo: payload.mobile,
            email: payload.email
          };
          let userResult = await knex
            .update(userUpdateData)
            .where({ id: payload.uid })
            .returning(["*"])
            .transacting(trx)
            .into("users");
        }
        /*USER DETAIL UPDATE CLOSE */

        trx.commit;
      });
      return res.status(200).json({
        //data:result,
        message: "Service Request updated successfully"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  declineServiceRequest: async (req, res) => {
    try {
      const serviceRequestId = req.body.serviceRequestId;
      const status = await knex("service_requests")
        .update({ serviceStatusCode: "DECLINE" })
        .where({ id: serviceRequestId });
      return res.status(200).json({
        data: {
          status: "DECLINE"
        },
        message: "Service Declined Successfully!"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  approveServiceRequest: async (req, res) => {
    try {
      let serviceRequestId = req.body.data.serviceRequestId;
      let updateStatus = req.body.data.status;
      const currentTime = new Date().getTime();
      console.log('REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7', req.body)

      const status = await knex("service_requests")
        .update({ serviceStatusCode: updateStatus, updatedAt: currentTime, updatedBy: req.me.id })
        .where({ id: serviceRequestId });
      return res.status(200).json({
        data: {
          status: updateStatus
        },
        message: "Service status updated successfully!"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },



  // User Panel Master APIS

  getCompanyListHavingPropertyUnits: async (req, res) => {
    try {
      let pagination = {};
      let result;
      let companyHavingPU1
      let companyArr1 = []

      console.log("customerHouseInfo", req.me.houseIds);
      let houseIds = req.me.houseIds;

      if (req.query.areaName === 'common') {

        companyBuildingPhase1 = await knex('property_units').select(['buildingPhaseId'])
          .where({ orgId: req.orgId, isActive: true })
          .whereIn('property_units.id', houseIds)
        console.log("BuildingIds", companyBuildingPhase1);
        buildingArr1 = companyBuildingPhase1.map(v => v.buildingPhaseId)

        companyHavingPU1 = await knex('property_units').select(['companyId'])
          .where({ orgId: req.orgId, isActive: true, type: 2 })
          .whereIn('property_units.buildingPhaseId', buildingArr1)
        console.log("CompanyIds", companyHavingPU1);

        companyArr1 = companyHavingPU1.map(v => v.companyId)
        result = await knex("companies")
          .innerJoin('property_units', 'companies.id', 'property_units.companyId')
          .select("companies.id", "companies.companyId", "companies.companyName as CompanyName")
          .where({ 'companies.isActive': true, 'companies.orgId': req.orgId, 'property_units.type': 2 })
          .whereIn('companies.id', companyArr1)
          .groupBy(['companies.id', 'companies.companyName', 'companies.companyId'])
          .orderBy('companies.companyName', 'asc')


      } else {

        companyHavingPU1 = await knex('property_units').select(['companyId'])
          .where({ orgId: req.orgId, isActive: true, type: 1 })
          .whereIn('property_units.id', houseIds)

        companyArr1 = companyHavingPU1.map(v => v.companyId)
        result = await knex("companies")
          .innerJoin('property_units', 'companies.id', 'property_units.companyId')
          .select("companies.id", "companies.companyId", "companies.companyName as CompanyName")
          .where({ 'companies.isActive': true, 'companies.orgId': req.orgId, 'property_units.type': 1 })
          .whereIn('companies.id', companyArr1)
          .groupBy(['companies.id', 'companies.companyName', 'companies.companyId'])
          .orderBy('companies.companyName', 'asc')
      }

      pagination.data = result;
      return res.status(200).json({
        data: {
          companies: pagination
        },
        message: "Companies List!"
      });
    } catch (err) {
      console.log(
        "[controllers][propertysetup][getCompanyListHavingPropertyUnits] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateServiceRequestProjectId: async (req, res) => {
    try {
      const { projectId, serviceRequestId } = req.body;
      let result = await knex('service_requests').update({ projectId: projectId }).where({ id: serviceRequestId }).returning(['*'])
      return res.status(200).json({
        data: {
          updated: true,
          result
        }
      })
    } catch (err) {
      return res.status(200).json({
        data: {
          update: false
        }
      })
    }
  },
  getBuildingPhaseAllListHavingPropertyUnits: async (req, res) => {
    try {
      let projectId = req.query.projectId;
      let orgId = req.orgId;

      let buildingData = {};
      //console.log(orgId);

      let companyHavingProjects = []
      let companyArr1 = []
      let rows = []

      if (req.query.areaName === 'common') {
        companyHavingProjects = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingProjects.map(v => v.companyId)
        rows = await knex("buildings_and_phases")
          .innerJoin(
            "projects",
            "buildings_and_phases.projectId",
            "projects.id"
          )
          .innerJoin(
            "property_types",
            "buildings_and_phases.propertyTypeId",
            "property_types.id"
          )
          .innerJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
          .where({
            "buildings_and_phases.isActive": true,
            "buildings_and_phases.projectId": projectId,
            "buildings_and_phases.orgId": orgId,
            'property_units.type': 2
          })
          .select([
            "buildings_and_phases.id as id",
            "buildings_and_phases.buildingPhaseCode",
            "property_types.propertyType",
            "buildings_and_phases.description",
            "property_types.propertyTypeCode",
          ])
          .whereIn('projects.companyId', companyArr1)
          .groupBy(["buildings_and_phases.id",
            "buildings_and_phases.buildingPhaseCode",
            "property_types.propertyType",
            "buildings_and_phases.description",
            "property_types.propertyTypeCode",])


      } else {
        companyHavingProjects = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingProjects.map(v => v.companyId)
        rows = await knex("buildings_and_phases")
          .innerJoin(
            "projects",
            "buildings_and_phases.projectId",
            "projects.id"
          )
          .innerJoin(
            "property_types",
            "buildings_and_phases.propertyTypeId",
            "property_types.id"
          )
          .innerJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
          .where({
            "buildings_and_phases.isActive": true,
            "buildings_and_phases.projectId": projectId,
            "buildings_and_phases.orgId": orgId,
            'property_units.type': 1
          })
          .select([
            "buildings_and_phases.id as id",
            "buildings_and_phases.buildingPhaseCode",
            "property_types.propertyType",
            "buildings_and_phases.description",
            "property_types.propertyTypeCode",
          ])
          .whereIn('projects.companyId', companyArr1)
          .groupBy(["buildings_and_phases.id",
            "buildings_and_phases.buildingPhaseCode",
            "property_types.propertyType",
            "buildings_and_phases.description",
            "property_types.propertyTypeCode",])


        console.log('BUILDING LIST:******************************************************************* ', rows)
      }


      buildingData.data = rows;

      return res.status(200).json({
        data: {
          buildingPhases: buildingData
        },
        message: "Building Phases List!"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getFloorZoneListByBuildingIdHavingPropertyUnits: async (req, res) => {
    try {
      let orgId = req.orgId;

      const { buildingPhaseId } = req.body;

      let floor;

      companyHavingProjects = await knex('floor_and_zones').select(['companyId']).where({ orgId: req.orgId, isActive: true })
      companyArr1 = companyHavingProjects.map(v => v.companyId)

      if (req.query.areaName === 'common') {
        if (buildingPhaseId) {
          floor = await knex("floor_and_zones")
            .innerJoin('property_units', 'floor_and_zones.id', 'property_units.floorZoneId')
            .select("floor_and_zones.*")
            .where({
              'floor_and_zones.buildingPhaseId': buildingPhaseId, 'floor_and_zones.isActive': true, 'floor_and_zones.orgId': orgId, 'property_units.type': 2
            })
            .whereIn('floor_and_zones.companyId', companyArr1)
            .groupBy(['floor_and_zones.id'])

        } else {
          floor = await knex("floor_and_zones")
            .innerJoin('property_units', 'floor_and_zones.id', 'property_units.floorZoneId')
            .select([
              'floor_and_zones.floorZoneCode as Floor/Zone',
              'floor_and_zones.id as id'
            ])
            .where({ isActive: true, orgId: orgId, "property_units.type": 1 })
            .whereIn('floor_and_zones.companyId', companyArr1)
            .groupBy(['floor_and_zones.id'])


        }

      } else {
        floor = await knex("floor_and_zones")
          .innerJoin('property_units', 'floor_and_zones.id', 'property_units.floorZoneId')
          .select("floor_and_zones.*")
          .where({
            'floor_and_zones.buildingPhaseId': buildingPhaseId, 'floor_and_zones.isActive': true, 'floor_and_zones.orgId': orgId
          })
          .whereIn('floor_and_zones.companyId', companyArr1)
          .groupBy(['floor_and_zones.id'])

      }


      return res.status(200).json({
        data: {
          floor
        },
        message: "Floor zone list"
      });
    } catch (err) {
      console.log(
        "[controllers][propertysetup][getFloorZoneListByBuildingIdHavingPropertyUnits] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPropertyUnitListByFloor: async (req, res) => {
    try {
      let orgId = req.orgId;
      let houseId = req.me.houseIds[0];


      const { floorZoneId, type } = req.body;
      const unit = await knex("property_units")
        .select("*")
        .where({ floorZoneId, orgId: orgId, isActive: true, type: type, id: houseId });
      return res.status(200).json({
        data: {
          unit
        },
        message: "Unit list"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewpropertyUnit] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectListHavingPropertyUnits: async (req, res) => {
    try {
      let companyId = req.query.companyId;

      let pagination = {}
      console.log("companyId", companyId);
      let companyHavingProjects = []
      let companyArr1 = []
      let rows = []

      if (req.query.areaName === 'common') {

        companyHavingProjects = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingProjects.map(v => v.companyId)
        rows = await knex("projects")
          .innerJoin('companies', 'projects.companyId', 'companies.id')
          .innerJoin('property_units', 'projects.id', 'property_units.projectId')
          .where({ "projects.companyId": companyId, "projects.isActive": true, 'property_units.type': 2 })
          .whereIn('projects.companyId', companyArr1)
          .select([
            "projects.id as id",
            "projects.projectName",
            "companies.companyName",
            "companies.id as cid",
            "companies.companyId",
            "projects.project as projectId"
          ]).groupBy(["projects.id",
            "projects.projectName",
            "companies.companyName",
            "companies.id",
            "companies.companyId",
            "projects.project"])
          .orderBy('projects.projectName', 'asc')
      } else {

        companyHavingProjects = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingProjects.map(v => v.companyId)
        rows = await knex("projects")
          .innerJoin('companies', 'projects.companyId', 'companies.id')
          .innerJoin('property_units', 'projects.id', 'property_units.projectId')
          .where({ "projects.companyId": companyId, "projects.isActive": true, 'property_units.type': 1 })
          .whereIn('projects.companyId', companyArr1)
          .select([
            "projects.id as id",
            "projects.projectName",
            "companies.companyName",
            "companies.id as cid",
            "companies.companyId",
            "projects.project as projectId"
          ]).groupBy(["projects.id",
            "projects.projectName",
            "companies.companyName",
            "companies.id",
            "companies.companyId",
            "projects.project"])
          .orderBy('projects.projectName', 'asc')
      }

      console.log("rows", rows);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          projects: pagination
        },
        message: "projects List!"
      });
    } catch (err) {
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getIncidentCategories: async (req, res) => {
    try {
      let orgId = req.orgId
      //const incidentCategoryId = req.body.incidentCategoryId;
      const categories = await knex.from('incident_categories').where({ orgId: orgId, isActive: true })
      return res.status(200).json({
        data: {
          categories
        },
        message: 'Categories list'
      })
    } catch (err) {
      console.log('[controllers][quotation][list] :  Error', err);
      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getSubcategories: async (req, res) => {
    try {
      let incidentCategoryId = req.body.incidentCategoryId;
      const subCategories = await knex('incident_sub_categories').select('*').where({ incidentCategoryId, isActive: true })
      return res.status(200).json({
        data: {
          subCategories
        },
        message: 'List of sub categories'
      })
    } catch (err) {
      console.log('[controllers][subcategory][subcategoryList] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deleteImage: async (req, res) => {
    try {

      const s3 = new AWS.S3();
      const id = req.body.id
      let filename = await knex('images').select('s3Url').where({ id }).first()
      let s3Url = filename.s3Url.split('/');
      let fileId = s3Url.pop()
      let path = s3Url.pop()
      const deletedImage = await knex.del().from('images').where({ id: id })
      // Remove it from S3
      var params = { Bucket: 'sls-app-resources-bucket', Key: path + '/' + fileId };
      s3.deleteObject(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);  // error
        }
        else {
          return res.status(200).json({
            deletedImage: !!deletedImage,
            data
          })
        }
      })
    } catch (err) {
      console.log('[controllers][deleteImage][serviceRequest] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  uploadImageByEntity: async (req, res) => {
    try {
      const payload = req.body;
      const uploadedImage = await knex('images').insert(payload).returning(['*']);
      return res.status(200).json({
        data: uploadedImage,
        message: 'Image uploaded!'
      })
    } catch (err) {
      console.log('[controllers][deleteImage][serviceRequest] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deleteServiceProblem: async (req, res) => {
    try {
      const id = req.body.id;
      const deletedProblem = await knex('service_problems').where({ id: id }).del().returning(['*'])
      return res.status(200).json({
        data: {
          message: 'Deleted successfully!',
          deletedProblem
        }
      })
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getInvoiceDetails: async (req, res) => {
    try {

      let payload = { entityId: req.query.entityId, entityType: req.query.entityType };

      console.log('[controllers][invoice][getInvoiceDetails]:  Payloads:', payload);

      const schema = Joi.object().keys({
        entityId: Joi.number().required(),
        entityType: Joi.string().required()
      });

      let result = Joi.validate(payload, schema);
      console.log(
        "[controllers][invoice][getInvoiceDetails]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }

      let { entityType, entityId } = payload;
      let invoiceDetail = null;

      if (entityType == 'quotations') {
        invoiceDetail = await knex("quotations").where({
          id: entityId
        }).select('invoiceData', 'id').first();
      }

      if (entityType == 'service_orders') {
        invoiceDetail = await knex("service_orders").where({
          id: entityId
        }).select('invoiceData', 'id').first();
      }

      if (entityType == 'service_requests') {
        invoiceDetail = await knex("service_orders").where({
          serviceRequestId: entityId
        }).select('invoiceData', 'id').first();
      }

      res.status(200).json({
        data: invoiceDetail,
        message: "Invoice details !"
      });
    } catch (err) {
      console.log("[controllers][invoice][getInvoiceDetails]: Error", err)
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // Get List of Taxes

  getTaxesList: async (req, res) => {
    try {
      let reqData = req.query;
      let total;
      let rows;
      let pagination = {};

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("taxes")
          .leftJoin("users", "users.id", "taxes.createdBy")
          .where({ "taxes.orgId": req.orgId })
          //.offset(offset)
          //.limit(per_page)
          .first(),
        knex
          .from("taxes")
          .leftJoin("users", "users.id", "taxes.createdBy")
          .where({ "taxes.orgId": req.orgId })
          .select([
            "taxes.id",
            "taxes.taxCode as Tax Code",
            "taxes.taxPercentage as Tax Percentage",
            "taxes.isActive as Status",
            "users.name as Created By",
            "taxes.createdAt as Date Created",
            "taxes.descriptionEng",
            "taxes.descriptionThai",
          ])
          .orderBy('taxes.id', 'desc')
      ]);

      let count = total.count;
      pagination.total = count;
      pagination.data = rows;

      res.status(200).json({
        data: {
          taxes: pagination
        },
        message: "Tax list successfully !"
      });
    } catch (err) {
      console.log("[controllers][tax][gettax] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getMainAndAdditionalUsersByTeamId: async (req, res) => {
    try {
      let teamId = req.body.teamId;
      let mainUsers = await knex('team_users').innerJoin('users', 'team_users.userId', 'users.id').select(['users.id as id', 'users.name as name']).where({ 'team_users.teamId': teamId, 'users.orgId': req.orgId })
      let additionalUsers = await knex('users').select(['id', 'name']).where({ orgId: req.orgId })
      //additionalUsers = additionalUsers.map(user => _.omit(user, ['password','username']))

      const Parallel = require('async-parallel')
      const usersWithRoles = await Parallel.map(additionalUsers, async user => {
        const roles = await knex('organisation_user_roles').select('roleId').where({ userId: user.id, orgId: req.orgId });
        const roleNames = await Parallel.map(roles, async role => {
          const roleNames = await knex('organisation_roles').select('name').where({ id: role.roleId, orgId: req.orgId }).whereNotIn('name', ['superAdmin', 'admin', 'customer'])
          return roleNames.map(role => role.name).join(',')
        })
        return { ...user, roleNames: roleNames.filter(v => v).join(',') };
      })

      res.status(200).json({
        data: {
          mainUsers,
          additionalUsers: mainUsers
        }
      });

    } catch (err) {
      console.log('[controllers][teams][getAssignedTeams] : Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ]
      });
    }
  },
  getAssignedTeamAndUsers: async (req, res) => {
    try {
      const entityId = req.body.entityId;
      const entityType = req.body.entityType;

      console.log('entityId:', entityId, 'entityType:', entityType);

      const team = await knex('assigned_service_team')
        .select(['assigned_service_team.teamId', 'teams.teamName as Team', 'users.name as MainUser', 'assigned_service_team.userId as mainUserId'])
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .leftJoin("users", "assigned_service_team.userId", "users.id")
        .where({ entityId: entityId, entityType: entityType })


      // let additionalUsers = await knex('assigned_service_additional_users')
      //   .select(['userId']).where({ entityId: entityId, entityType: entityType })

      let othersUserData = await knex.raw(`select "assigned_service_additional_users"."userId" as "userId","users"."name" as "addUsers","users"."email" as "email", "users"."mobileNo" as "mobileNo" from "assigned_service_additional_users" left join "users" on "assigned_service_additional_users"."userId" = "users"."id" where "assigned_service_additional_users"."orgId" = ${req.orgId} and "assigned_service_additional_users"."entityId" = ${entityId} and "assigned_service_additional_users"."entityType"='${entityType}'`)
      let additionalUsers = othersUserData.rows;


      return res.status(200).json({
        data: {
          team,
          additionalUsers
        }
      })

    } catch (err) {
      console.error('Error:', err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getTeamByEntity: async (req, res) => {
    try {
      const { entityId, entityType } = req.body;
      let so
      let sr
      switch (entityType) {
        case 'service_requests':
          sr = await knex('service_requests').select('projectId').where({ id: entityId }).first()
          if (sr) {
            let resourceData = await knex.from("role_resource_master")
              .select('roleId')
              .where("role_resource_master.resourceId", '2')

            let roleIds = resourceData.map(v => v.roleId) //

            teamResult = await knex('team_roles_project_master')
              .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
              .select([
                'teams.teamName',
                'teams.teamId'
              ])
              .where({ 'team_roles_project_master.projectId': sr.projectId, 'teams.isActive': true })
              .whereIn("team_roles_project_master.roleId", roleIds).returning('*')

            return res.status(200).json({
              data: {
                teams: teamResult
              }
            })
          } else {
            return res.status(200).json({
              data: {
                teams: []
              }
            })
          }
        case 'service_orders':
          so = await knex('service_orders')
            .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
            .select('service_requests.projectId')
            .where({ 'service_orders.id': entityId })
            .first()


          if (so) {
            let resourceData = await knex.from("role_resource_master")
              .select('roleId')
              .where("role_resource_master.resourceId", '2')

            let roleIds = resourceData.map(v => v.roleId) //

            teamResult = await knex('team_roles_project_master')
              .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
              .select([
                'teams.teamName',
                'teams.teamId'
              ])
              .where({ 'team_roles_project_master.projectId': so.projectId, 'teams.isActive': true })
              .whereIn("team_roles_project_master.roleId", roleIds).returning('*')

            return res.status(200).json({
              data: {
                teams: teamResult
              }
            })
          } else {
            return res.status(200).json({
              data: {
                teams: []
              }
            })
          }
        case 'survey_orders':
          so = await knex('survey_orders')
            .innerJoin('service_requests', 'survey_orders.serviceRequestId', 'service_requests.id')
            .select('service_requests.projectId')
            .where({ 'survey_orders.id': entityId })
            .first()

          if (so) {
            let resourceData = await knex.from("role_resource_master")
              .select('roleId')
              .where("role_resource_master.resourceId", '2')

            let roleIds = resourceData.map(v => v.roleId) //

            teamResult = await knex('team_roles_project_master')
              .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
              .select([
                'teams.teamName',
                'teams.teamId'
              ])
              .where({ 'team_roles_project_master.projectId': so.projectId, 'teams.isActive': true })
              .whereIn("team_roles_project_master.roleId", roleIds).returning('*')

            return res.status(200).json({
              data: {
                teams: teamResult
              }
            })
          } else {
            return res.status(200).json({
              data: {
                teams: []
              }
            })
          }
        default:
          return res.status(200).json({
            data: {
              teams: []
            }
          })
      }

    } catch (err) {
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*GET ALL STATUS LIST FOR DROP DOWN */
  getAllStatus: async (req, res) => {
    try {

      let orgId = req.orgId;
      let result = await knex.from('service_status')
        .select('id', "statusCode", "descriptionEng")
        .where({ 'isActive': true })
      return res.status(200).json({
        data: result,
        message: "All Status list"
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*GET ALL PROPERTY UNIT LIST FOR DROP DOWN */
  getAllPropertyUnit: async (req, res) => {
    try {
      let orgId = req.orgId;
      let result = await knex.from('property_units')
        .select('id', "unitNumber", 'description')
        .where({ orgId })
      return res.status(200).json({
        data: result,
        message: "All property unit list"
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }


};

// Y, M, D
function getStartAndEndDate(startDate, perWhat) {
  let selectedDate = moment(startDate).valueOf();
  let plusOneMOnth = moment(selectedDate)
    .add(1, perWhat)
    .valueOf();
  return [selectedDate, plusOneMOnth].map(v => Number(v));
}

module.exports = serviceRequestController;
