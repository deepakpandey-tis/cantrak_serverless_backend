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

if (process.env.IS_OFFLINE) {
  AWS.config.update({
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER"
  });
} else {
  AWS.config.update({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  });
}

AWS.config.update({ region: process.env.REGION || "us-east-2" });

const getUploadURL = async (mimeType, filename, type = "") => {
  let re = /(?:\.([^.]+))?$/;
  let ext = re.exec(filename)[1];
  let uploadFolder = type + "/";
  const actionId = uuidv4();
  const s3Params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${uploadFolder}${actionId}.${ext}`,
    ContentType: mimeType,
    ACL: "public-read"
  };
  return new Promise(async (resolve, reject) => {
    const s3 = new AWS.S3();
    let uploadURL = await s3.getSignedUrl("putObject", s3Params);
    if (Boolean(process.env.IS_OFFLINE)) {
      uploadURL = uploadURL
        .replace("https://", "http://")
        .replace(".com", ".com:8000");
    }
    resolve({
      isBase64Encoded: false,
      headers: { "Access-Control-Allow-Origin": "*" },
      uploadURL: uploadURL,
      photoFilename: `${actionId}.${ext}`
    });
  });
};

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
  updateServiceRequest: async (req, res) => {
    try {
      let serviceRequest = null;
      let images = null;

      await knex.transaction(async trx => {
        const serviceRequestPayload = _.omit(req.body, ["images"]);
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

        const updateServiceReq = await knex
          .update({
            description: serviceRequestPayload.description,
            requestFor: serviceRequestPayload.requestFor,
            houseId: serviceRequestPayload.houseId,
            commonId: serviceRequestPayload.commonId,
            serviceType: serviceRequestPayload.serviceType,
            requestedBy: serviceRequestPayload.requestedBy,
            priority: serviceRequestPayload.priority,
            location: serviceRequestPayload.location,
            updatedAt: currentTime,
            createdBy: req.me.id,
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
      const uploadUrlData = await getUploadURL(mimeType, filename, type);

      res.status(200).json({
        data: {
          uploadUrlData: uploadUrlData
        },
        message: "Upload Url generated successfully!"
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
        const currentTime = new Date().getTime();


        // CHANGE ASSET LOCATION OPEN

        const sr = await knex('service_requests').select('houseId').where({ id: req.body.serviceRequestId }).first()
        let ids = null
        if (sr) {
          ids = await knex('property_units').select(['companyId', 'projectId', 'buildingPhaseId', 'floorZoneId', 'houseId']).where({ id: sr.houseId }).first()
        }

        await knex('asset_location').insert({ assetId: req.body.assetId, companyId: ids.companyId, projectId: ids.projectId, buildingId: ids.buildingPhaseId, floorId: ids.floorZoneId, houseId: ids.houseId, unitId: sr.houseId, orgId: req.orgId, startDate: currentTime, serviceRequestId: req.body.serviceRequestId })

        // CHANGE ASSET LOCATION END

        // Insert in assigned_parts table,

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

      //console.log('USER**************************************',req.userProjectResources)
      const accessibleProjects = req.userProjectResources[0].projects

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
        filters["service_requests.id"] = serviceId;
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
            // .count("* as count")
            .from("service_requests")
            .leftJoin(
              "property_units",
              "service_requests.houseId",
              "property_units.id"
            )
            .leftJoin(
              "service_status AS status",
              "service_requests.serviceStatusCode",
              "status.statusCode"
            )
            .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            .leftJoin(
              "service_problems",
              "service_requests.id",
              "service_problems.serviceRequestId"
            )
            .leftJoin(
              "requested_by",
              "service_requests.requestedBy",
              "requested_by.id"
            )
            .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
            .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            .leftJoin(
              "incident_categories",
              "service_problems.categoryId",
              "incident_categories.id"
            )
            // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")

            .select([
              "service_requests.id as S Id",
              "service_requests.houseId as houseId",
              "service_requests.description as Description",
              "service_requests.priority as Priority",
              // "assignUser.name as Tenant Name",
              "status.descriptionEng as Status",
              "property_units.unitNumber as Unit No",
              "u.name as Requested By",
              "service_requests.createdAt as Date Created",
              "service_orders.id as SO Id",
              "property_units.id as unitId"
            ])
            .groupBy([
              "service_requests.id",
              "status.id",
              "u.id",
              "property_units.id",
              "buildings_and_phases.id",
              "service_problems.id",
              "requested_by.id",
              "assigned_service_team.id",
              "teams.teamId",
              "mainUsers.id",
              "incident_categories.id",
              // "assignUser.id",
              // "user_house_allocation.id",
              "service_orders.id"
            ])
            .where({ "service_requests.orgId": req.orgId })
            .whereIn('service_requests.projectId', accessibleProjects)
            .where({'service_requests.isCreatedFromSo':false})
            .distinct('service_requests.id')
          ,



          knex.from("service_requests")
            .leftJoin(
              "property_units",
              "service_requests.houseId",
              "property_units.id"
            )
            .leftJoin(
              "service_status AS status",
              "service_requests.serviceStatusCode",
              "status.statusCode"
            )
            .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            .leftJoin(
              "service_problems",
              "service_requests.id",
              "service_problems.serviceRequestId"
            )
            .leftJoin(
              "requested_by",
              "service_requests.requestedBy",
              "requested_by.id"
            )
            .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
            .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            .leftJoin(
              "incident_categories",
              "service_problems.categoryId",
              "incident_categories.id"
            )
            // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")

            .select([
              "service_requests.id as S Id",
              "service_requests.houseId as houseId",
              "service_requests.description as Description",
              "service_requests.priority as Priority",
              // "assignUser.name as Tenant Name",
              "status.descriptionEng as Status",
              "property_units.unitNumber as Unit No",
              "requested_by.name as Requested By",
              "service_requests.createdAt as Date Created",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description as buildingDescription",
              "incident_categories.descriptionEng as problemDescription",
              "requested_by.email as requestedByEmail",
              "teams.teamName",
              "teams.teamCode",
              "mainUsers.name as mainUser",
              "service_orders.id as SO Id",
              "property_units.id as unitId"

            ])
            .groupBy([
              "service_requests.id",
              "status.id",
              "u.id",
              "property_units.id",
              "buildings_and_phases.id",
              "service_problems.id",
              "requested_by.id",
              "assigned_service_team.id",
              "teams.teamId",
              "mainUsers.id",
              "incident_categories.id",
              // "assignUser.id",
              // "user_house_allocation.id",
              "service_orders.id"

            ])
            .where({ "service_requests.orgId": req.orgId })
            .whereIn('service_requests.projectId', accessibleProjects)
            // .where({'service_requests.isCreatedFromSo':false})
            .distinct('service_requests.id')
            .orderBy('service_requests.id', 'desc')
            .offset(offset)
            .limit(per_page)

          //

          // knex
          //   .from("service_requests")
          //   .leftJoin(
          //     "property_units",
          //     "service_requests.houseId",
          //     "property_units.id"
          //   )
          //   .leftJoin(
          //     "service_status AS status",
          //     "service_requests.serviceStatusCode",
          //     "status.statusCode"
          //   )
          //   .leftJoin("users as u", "service_requests.requestedBy", "u.id")
          //   .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
          //   .leftJoin(
          //     "service_problems",
          //     "service_requests.id",
          //     "service_problems.serviceRequestId"
          //   )
          //   .leftJoin(
          //     "requested_by",
          //     "service_requests.requestedBy",
          //     "requested_by.id"
          //   )
          //   .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
          //   .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
          //   .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
          //   .select([
          //     "service_requests.id as S Id",
          //     "service_requests.houseId as houseId",
          //     "service_requests.description as Description",
          //     // "incident_categories.descriptionEng as Category",
          //     // "incident_sub_categories.descriptionEng as Problem",
          //     "service_requests.priority as Priority",
          //     "status.descriptionEng as Status",
          //     "property_units.unitNumber as Unit No",
          //     "requested_by.name as Requested By",
          //     "service_requests.createdAt as Date Created",
          //     "buildings_and_phases.buildingPhaseCode",
          //     "buildings_and_phases.description as buildingDescription",
          //     "service_problems.description as problemDescription",
          //     "requested_by.email as requestedByEmail",
          //     "teams.teamName",
          //     "teams.teamCode",
          //     "mainUsers.name as mainUser"
          //   ])
          //   .offset(offset)
          //   .limit(per_page)
          //   .where({ "service_requests.orgId": req.orgId })
          //   .whereIn('service_requests.projectId', accessibleProjects)
          //   .orderBy('service_requests.id', 'desc')
          //   .groupBy([
          //     "service_requests.id",
          //     "status.id",
          //     "u.id",
          //     "property_units.id",
          //     "buildings_and_phases.id",
          //     "service_problems.id",
          //     "requested_by.id",
          //     "assigned_service_team.id",
          //     "teams.teamId",
          //     "mainUsers.id"
          //   ])
          //   .distinct('service_requests.id')
        ]);




      } else {
        //console.log('IN else: ')
        //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
        [total, rows] = await Promise.all([
          knex
            // .count("* as count")
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
              "service_status AS status",
              "service_requests.serviceStatusCode",
              "status.statusCode"
            )
            .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            .leftJoin(
              "service_problems",
              "service_requests.id",
              "service_problems.serviceRequestId"
            )
            .leftJoin(
              "requested_by",
              "service_requests.requestedBy",
              "requested_by.id"
            )
            .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            .leftJoin(
              "incident_categories",
              "service_problems.categoryId",
              "incident_categories.id"
            )
            // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")

            .select([
              "service_requests.id as S Id",
              "service_requests.description as Description",
              // "incident_categories.descriptionEng as Category",
              // "incident_sub_categories.descriptionEng as Problem",
              "service_requests.priority as Priority",
              // "assignUser.name as Tenant Name",
              "status.descriptionEng as Status",
              "property_units.unitNumber as Unit No",
              "u.name as Requested By",
              "service_requests.createdAt as Date Created",
              "service_orders.id as SO Id",
              "property_units.id as unitId"

            ])
            .where({ "service_requests.orgId": req.orgId })
            .where({'service_requests.isCreatedFromSo':false})
            .where(qb => {
              if (location) {
                qb.where('service_requests.location', 'iLIKE', `%${location}%`)
              }
              if (priority) {
                qb.where('service_requests.priority', 'iLIKE', `%${priority}%`)
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
              qb.where(filters);
              qb.whereIn('service_requests.projectId', accessibleProjects)
            })
            
            .groupBy([
              "service_requests.id",
              "status.id",
              "u.id",
              "property_units.id",
              "buildings_and_phases.id",
              "service_problems.id",
              "requested_by.id",
              "assigned_service_team.id",
              "teams.teamId",
              "mainUsers.id",
              "incident_categories.id",
              // "assignUser.id",
              // "user_house_allocation.id",
              "service_orders.id"
            ])
            .distinct('service_requests.id')
          ,
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
              "service_status AS status",
              "service_requests.serviceStatusCode",
              "status.statusCode"
            )
            .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            .leftJoin(
              "service_problems",
              "service_requests.id",
              "service_problems.serviceRequestId"
            )
            .leftJoin(
              "requested_by",
              "service_requests.requestedBy",
              "requested_by.id"
            )
            .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            .leftJoin(
              "incident_categories",
              "service_problems.categoryId",
              "incident_categories.id"
            )
            // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")

            .select([
              "service_requests.id as S Id",
              "service_requests.description as Description",
              "service_requests.priority as Priority",
              "status.descriptionEng as Status",
              "property_units.unitNumber as Unit No",
              // "assignUser.name as Tenant Name",
              "requested_by.name as Requested By",
              "service_requests.createdAt as Date Created",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description as buildingDescription",
              "incident_categories.descriptionEng as problemDescription",
              "requested_by.email as requestedByEmail",
              "teams.teamName",
              "teams.teamCode",
              "mainUsers.name as mainUser",
              "service_orders.id as SO Id",
              "property_units.id as unitId"

            ])
            .orderBy('service_requests.id', 'desc')
            .where({ "service_requests.orgId": req.orgId })
            .where({'service_requests.isCreatedFromSo':false})
            .where(qb => {
              if (location) {
                qb.where('service_requests.location', 'iLIKE', `%${location}%`)
              }
              if (priority) {
                qb.where('service_requests.priority', 'iLIKE', `%${priority}%`)
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
                qb.whereBetween("service_requests.createdAt", [
                  dueFrom,
                  dueTo
                ]);
                qb.where({ closedBy: "" })
              }
              qb.where(filters);
              qb.whereIn('service_requests.projectId', accessibleProjects)


            })
            .offset(offset)
            .limit(per_page)
            .groupBy([
              "service_requests.id",
              "status.id",
              "u.id",
              "property_units.id",
              "buildings_and_phases.id",
              "service_problems.id",
              "requested_by.id",
              "assigned_service_team.id",
              "teams.teamId",
              "mainUsers.id",
              "incident_categories.id",
              // "assignUser.id",
              // "user_house_allocation.id",
              "service_orders.id"
            ])
            .distinct('service_requests.id')
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

      const Parallel = require('async-parallel');

      // rows.tenantName = await Parallel.map(rows, async item => {

      //   let userId = await knex('assigned_service_additional_users').where({ entityId: item["S Id"] ,'entityType':'service_requests'}).select('userId').first();

      //   let tenantName =null;   
      //   if(userId){
      //   tenantName = await knex('users').where({ id: userId }).select('name').first();
      //   tenantName="assssssssssss"
      //   }

      //   return userId;

      // });

      // let Parallel = require('async-parallel');
      pagination.data = await Parallel.map(rows, async pd => {

        let houseResult = await knex.from('user_house_allocation').select('userId').where({ houseId: pd.unitId }).first().orderBy('id', 'desc')

        if (houseResult) {
          let tetantResult = await knex.from('users').select('name').where({ id: houseResult.userId }).first()
          return {
            ...pd,
            "Tenant Name": tetantResult.name
          }
        } else {
          return {
            ...pd,
            "Tenant Name": ''
          }
        }



      })

     // pagination.data = _.uniqBy(rows,'S Id');



      return res.status(200).json({
        data: {
          service_requests: pagination,
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
  exportServiceRequest: async (req, res) => {
    try {
      let reqData = req.query;
      let {
        description,
        completedOn,
        serviceFrom,
        serviceTo,
        id,
        location,
        serviceStatus,
        priority,
        unitNo,
        createdBy,
        serviceType,
        recuring,
        completedBy,
        assignedTo
      } = req.body;
      let total, rows;

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

      if (id) {
        filters["service_requests.id"] = id;
      }
      if (location) {
        filters["service_requests.location"] = location;
      }
      if (serviceStatus) {
        filters["service_requests.serviceStatusCode"] = serviceStatus;
      }

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

      if (completedOn) {
        filters["service_requests.completedOn"] = completedOn;
      }

      if (priority) {
        filters["service_requests.priority"] = priority;
      }

      if (unitNo) {
        filters["property_units.unitNumber"] = unitNo;
      }

      if (createdBy) {
        filters["service_requests.createdBy"] = createdBy;
      }

      if (serviceType) {
        filters["service_requests.serviceType"] = serviceType;
      }

      if (completedBy) {
        filters["service_requests.closedby"] = completedBy;
      }

      if (assignedTo) {
        filters["service_requests.assignedTo"] = assignedTo;
      }

      //    if(recuring){
      //     filters['service_requests.recuring'] = recuring
      //    }

      if (_.isEmpty(filters)) {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("service_requests")
            .innerJoin(
              "service_problems",
              "service_requests.id",
              "service_problems.serviceRequestId"
            )
            .innerJoin(
              "incident_categories",
              "service_problems.categoryId",
              "incident_categories.id"
            )
            .innerJoin(
              "incident_sub_categories",
              "incident_categories.id",
              "incident_sub_categories.incidentCategoryId"
            )
            .innerJoin(
              "property_units",
              "service_requests.houseId",
              "property_units.id"
            )

            .select([
              "service_requests.id as S Id",
              "service_requests.description as Description",
              "incident_categories.descriptionEng as Category",
              "incident_sub_categories.descriptionEng as Problem",
              "service_requests.priority as Priority",
              "service_requests.serviceStatusCode as Status",
              "property_units.unitNumber as Unit No",
              "service_requests.requestedBy as Requested By",
              "service_requests.createdAt as Date Created"
            ])
            .groupBy([
              "service_requests.id",
              "service_problems.id",
              "incident_categories.id",
              "incident_sub_categories.id",
              "property_units.id"
            ]),
          knex
            .from("service_requests")
            .innerJoin(
              "service_problems",
              "service_requests.id",
              "service_problems.serviceRequestId"
            )
            .innerJoin(
              "incident_categories",
              "service_problems.categoryId",
              "incident_categories.id"
            )
            .innerJoin(
              "incident_sub_categories",
              "incident_categories.id",
              "incident_sub_categories.incidentCategoryId"
            )
            .innerJoin(
              "property_units",
              "service_requests.houseId",
              "property_units.id"
            )
            .select([
              "service_requests.id as S Id",
              "service_requests.description as Description",
              "incident_categories.descriptionEng as Category",
              "incident_sub_categories.descriptionEng as Problem",
              "service_requests.priority as Priority",
              "service_requests.serviceStatusCode as Status",
              "property_units.unitNumber as Unit No",
              "service_requests.requestedBy as Requested By",
              "service_requests.createdAt as Date Created"
            ])
            .offset(offset)
            .limit(per_page)
        ]);
      } else {
        //console.log('IN else: ')
        //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("service_requests")
            .innerJoin(
              "service_problems",
              "service_requests.id",
              "service_problems.serviceRequestId"
            )
            .innerJoin(
              "incident_categories",
              "service_problems.categoryId",
              "incident_categories.id"
            )
            .innerJoin(
              "incident_sub_categories",
              "incident_categories.id",
              "incident_sub_categories.incidentCategoryId"
            )
            .innerJoin(
              "property_units",
              "service_requests.houseId",
              "property_units.id"
            )
            .select([
              "service_requests.id as S Id",
              "service_requests.description as Description",
              "incident_categories.descriptionEng as Category",
              "incident_sub_categories.descriptionEng as Problem",
              "service_requests.priority as Priority",
              "service_requests.serviceStatusCode as Status",
              "property_units.unitNumber as Unit No",
              "service_requests.requestedBy as Requested By",
              "service_requests.createdAt as Date Created"
            ])
            .where(qb => {
              qb.where(filters);
              if (serviceFromDate && serviceToDate) {
                qb.whereBetween("service_requests.createdAt", [
                  serviceFromDate,
                  serviceToDate
                ]);
              }
            })
            .groupBy([
              "service_requests.id",
              "service_problems.id",
              "incident_categories.id",
              "incident_sub_categories.id",
              "property_units.id"
            ]),
          knex
            .from("service_requests")
            .innerJoin(
              "service_problems",
              "service_requests.id",
              "service_problems.serviceRequestId"
            )
            .innerJoin(
              "incident_categories",
              "service_problems.categoryId",
              "incident_categories.id"
            )
            .innerJoin(
              "incident_sub_categories",
              "incident_categories.id",
              "incident_sub_categories.incidentCategoryId"
            )
            .innerJoin(
              "property_units",
              "service_requests.houseId",
              "property_units.id"
            )
            .select([
              "service_requests.id as S Id",
              "service_requests.description as Description",
              "incident_categories.descriptionEng as Category",
              "incident_sub_categories.descriptionEng as Problem",
              "service_requests.priority as Priority",
              "service_requests.serviceStatusCode as Status",
              "property_units.unitNumber as Unit No",
              "service_requests.requestedBy as Requested By",
              "service_requests.createdAt as Date Created"
            ])
            .where(qb => {
              qb.where(filters);
              if (serviceFromDate && serviceToDate) {
                qb.whereBetween("service_requests.createdAt", [
                  serviceFromDate,
                  serviceToDate
                ]);
              }
            })
            .offset(offset)
            .limit(per_page)
        ]);
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "ServiceRequest-" + Date.now() + ".csv";
      let filepath = "uploads/" + filename;

      let check = XLSX.writeFile(wb, filepath);

      const s3 = new AWS.S3({
        accessKeyId: "S3RVER",
        secretAccessKey: "S3RVER",
        s3ForcePathStyle: false
      });
      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: "service-request/" + filename,
        ContentType: "application/vnd.ms-excel",
        ACL: "public-read-write"
      };
      //  let uploadURL = await s3.getSignedUrl('putObject', s3Params);
      //if (Boolean(process.env.IS_OFFLINE)) {
      //  uploadURL = uploadURL.replace("https://", "http://").replace(".com", ".com:8000");
      //}
      //console.log("++++++++++",uploadURL,"+====================")
      await s3.putObject(s3Params, function (err, data) {
        if (err) {
          console.log("Error==", err, "Error");
        } else {
          console.log("data==", data, "data");
        }
      });

      return res.status(200).json({
        data: rows,
        message: "Service Request Data Export Successfully!"
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  importServiceRequest: async (req, res) => {
    try {
      if (req.file) {
        let file_path = appRoot + "/uploads/" + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: "binary" });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, {
          type: "string",
          header: "A",
          raw: false
        });
        let result = null;
        if (data[0].B === "Description" && data[0].F === "Priority") {
          if (data.length > 0) {
            const currentTime = new Date().getTime();
            data.forEach(async (inservalue, key) => {
              console.log(inservalue, "+++++++++++");
              const insertData = {
                description: inservalue.B,
                priority: inservalue.F,
                serviceStatusCode: inservalue.G,
                createdAt: currentTime
              };
              console.log(
                "[controllers][service][requestId]: Insert Data",
                insertData
              );
              const serviceResult = await knex
                .insert(insertData)
                .returning(["*"])
                .into("service_requests");
              result = serviceResult[0];
            });

            return res.status(200).json({
              data: result,
              message: "Service Request Data Import Successfully!"
            });
          }
        } else {
          return res.status(500).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: "Please Select valid files"
              }
            ]
          });
        }
      } else {
        return res.status(500).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "csv file can't empty" }
          ]
        });
      }
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  //  getServiceRequestLocationsByServiceRequestId: async(req,res) => {
  //      try {
  //          const serviceRequestId = req.body.serviceRequestId;
  //          const data = await knex
  //                             .from('service_requests')
  //                             .innerJoin('property_units', 'service_requests.houseId', 'property_units.id')
  //                             .innerJoin('companies', 'property_units.companyId', 'companies.id')
  //                             .innerJoin('projects', 'property_units.projectId', 'projects.id')
  //                             .innerJoin('floor_and_zones', 'property_units.floorZoneId', 'floor_and_zones.id')
  //                             .innerJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
  //                             .innerJoin('')
  //                             .select([
  //                             'companies.id as companyId',
  //                             ''
  //                             ])
  //      } catch(err) {
  //          return res.status(500).json({
  //              errors: [
  //                  { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
  //              ],
  //          })
  //      }
  //  },
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
  getUrl: getUploadURL,
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
            "asset_master.assetSerial as assetSerial",
            "asset_master.model as model",
            "asset_category_master.categoryName as categoryName",
            "companies.companyName as companyName",
            "assigned_assets.id as aid"
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
            "asset_master.assetSerial as assetSerial",
            "asset_master.model as model",
            "asset_category_master.categoryName as categoryName",
            "companies.companyName as companyName",
            "assigned_assets.id as aid"
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
      await knex.transaction(async trx => {
        let payload = _.omit(req.body, ["images", "isSo", "mobile", "email", "name"]);
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
          serviceType: Joi.string().required(),
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

        const requestedByResult = await knex('requested_by').insert({ name: req.body.name, mobile: req.body.mobile, email: req.body.email }).returning(['*'])

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
            requestedBy: requestedByResult[0].id,
            serviceType: payload.serviceType,
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
            houseId: payload.house,
            requestedBy: requestedByResult[0].id,
            // requestedBy: payload.userId,
            serviceType: payload.serviceType,
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
        // let result = await knex
        //   .from("property_units")
        //   .select("*")
        //   .where({ "property_units.id": unitId, orgId: orgId });

        // unitResult = result[0];
        let houseResult = await knex
          .from("user_house_allocation")
          .select("userId")
          .where({
            "user_house_allocation.houseId": unitId,
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
          // .where({ "entityId": incidentRequestPayload.id, "entityType": "service_requests", orgId: orgId })
          .where({ "entityId": id, "entityType": "service_requests" })
          .select('s3Url', 'title', 'name', 'id');

        // let problem = await knex
        //   .from("service_problems")
        //   .leftJoin(
        //     "incident_categories",
        //     "service_problems.categoryId",
        //     "incident_categories.id"
        //   )
        //   .leftJoin(
        //     "incident_sub_categories",
        //     "service_problems.problemId",
        //     "incident_sub_categories.id"
        //   )
        //   .select(
        //     "service_problems.description",
        //     "service_problems.id",
        //     "incident_sub_categories.descriptionEng as Problem",
        //     "incident_categories.descriptionEng as category"
        //   )
        //   .where({ serviceRequestId: id });

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
          serviceType: Joi.string().required(),
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

        let currentServiceRequestData = await knex('service_requests').select('*').where({ 'id': payload.serviceRequestId }).first();
        await knex('requested_by').update({ name: req.body.name, mobile: req.body.mobile, email: req.body.email }).where({ id: currentServiceRequestData.requestedBy });


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

        /*INSERT LOCATION TAGS DATA OPEN */

        // let delLocation = await knex("location_tags")
        //   .where({
        //     entityId: payload.serviceRequestId,
        //     entityType: "service_requests",
        //     orgId: orgId
        //   })
        //   .del();
        // for (let locationId of payload.locationTags) {
        //   const insertLocation = {
        //     entityId: payload.serviceRequestId,
        //     entityType: "service_requests",
        //     locationTagId: locationId,
        //     orgId: orgId,
        //     createdAt: currentTime,
        //     updatedAt: currentTime
        //   };
        //   let locationResult = await knex
        //     .insert(insertLocation)
        //     .returning(["*"])
        //     .transacting(trx)
        //     .into("location_tags");
        // }

        // Discard if some location tags already exists


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
        .update({ serviceStatusCode: "C" })
        .where({ id: serviceRequestId });
      return res.status(200).json({
        data: {
          status: "C"
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
      let quotationsAtached = await knex('quotations').select('id')
      .where({serviceRequestId:serviceRequestId,orgId:req.orgId})
      let assignedPartsResult = []
      let assignedChargesResult = []
      for(let q of quotationsAtached){
        assignedPartsResultData = await knex('assigned_parts')
        .innerJoin('quotations', 'assigned_parts.entityId', 'quotations.id')
        .select('assigned_parts.*')
        .where({ entityId: q.id, entityType: 'quotations',quotationStatus:'Approved' })//.first()
        assignedPartsResult.push(assignedPartsResultData)


        assignedChargesResultData = await knex('assigned_service_charges')
          .innerJoin('quotations', 'assigned_service_charges.entityId', 'quotations.id')
          .select('assigned_service_charges.*')
          .where({ entityId: q.id, entityType: 'quotations', quotationStatus: 'Approved' })//.first()
        assignedChargesResult.push(assignedChargesResultData)
        // Approve all the attached quotations
        // await knex('quotations').update({
        //   quotationStatus: 'Approved', updatedAt: currentTime,
        //   updatedBy: req.me.id,
        //   approvedBy: req.me.id,
        //   orgId: req.orgId}).where({id:q.id})

      }

      let assignedParts = _.uniqBy(_.flatten(assignedPartsResult),'id').map(v => _.omit(v, ['id']))
      let assignedCharges = _.uniqBy(_.flatten(assignedChargesResult),'id').map(v => _.omit(v, ['id']))
      let serviceOrderIdResult = await knex('service_orders').select('id').where({serviceRequestId:serviceRequestId,orgId:req.orgId}).first()
      let checkIfAlreadyExists = await knex('assigned_parts')
        .where({ entityType: 'service_orders', entityId: serviceOrderIdResult.id })

      let checkIfAlreadyExistsCharges = await knex('assigned_service_charges')
        .where({ entityType: 'service_orders', entityId: serviceOrderIdResult.id })
      
      if (checkIfAlreadyExists && checkIfAlreadyExists.length) {

      } else {
        for (let p of assignedParts) {
          await knex('assigned_parts')
            .insert({ ...p, entityId: serviceOrderIdResult.id, entityType: 'service_orders' })
        }
      }

      if (checkIfAlreadyExistsCharges && checkIfAlreadyExistsCharges.length) {

      } else {
        for (let p of assignedCharges) {
          await knex('assigned_service_charges')
            .insert({ ...p, entityId: serviceOrderIdResult.id, entityType: 'service_orders' })
        }
      }

      const status = await knex("service_requests")
        .update({ serviceStatusCode: updateStatus, updatedAt: currentTime })
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
  checkServiceRequestId: async (req, res) => {
    try {
      const id = req.body.id;

      if (!id) {
        return res.status(200).json({
          data: {
            exists: false,
            //propertyData:data
          }
        })
      }

      const srId = await knex('service_requests').select('*').where({ id: id, orgId: req.orgId }).first()
      //const houseId = srId.houseId;
      //console.log('HOUSEID :**************************: ',houseId)

      //console.log('Data :**************************: ', data)

      if (srId) {
        const data = await knex('property_units')
          .select([
            "property_units.companyId",
            "property_units.projectId",
            "property_units.buildingPhaseId",
            "property_units.floorZoneId",
            "property_units.unitNumber",
            "property_units.id as unitId"
          ])
          .where({ id: srId.houseId, orgId: req.orgId }).first()
        return res.status(200).json({
          data: {
            exists: true,
            propertyData: data

          }
        })
      } else {
        return res.status(200).json({
          data: {
            exists: false,
            //propertyData:data
          }
        })
      }

    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getServiceAssignedTeamAndUsers: async (req, res) => {
    try {
      const serviceRequestId = req.body.serviceRequestId;
      const team = await knex('assigned_service_team').select(['teamId', 'userId as mainUserId']).where({ entityId: serviceRequestId, entityType: 'service_requests' })

      let additionalUsers = await knex('assigned_service_additional_users').select(['userId']).where({ entityId: serviceRequestId, entityType: 'service_requests' })


      return res.status(200).json({
        data: {
          team,
          additionalUsers
        }
      })

    } catch (err) {
      return res.status(500).json({
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
  getAssignedAssetsByEntity: async (req, res) => {
    try {
      const { entityId, entityType } = req.body;
      let assigned_assets = []
      assigned_assets = await knex('assigned_assets')
        .innerJoin('asset_master', 'assigned_assets.assetId', 'asset_master.id')
        .select(['asset.id as assetId', 'asset_master.assetName'])
        .where({ 'assigned_assets.entityId': entityId, 'assigned_assets.entityType': entityType })

      return res.status(200).json({
        data: {
          assigned_assets
        }
      })
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getServiceOrderIdByServiceRequestId: async (req, res) => {
    try {
      const serviceRequestId = req.body.serviceRequestId;
      const serviceOrderId = await knex('service_orders').select('id').where({ serviceRequestId: serviceRequestId }).first()
      return res.status(200).json({
        data: {
          serviceOrderId
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
  getServiceRequestIdByServiceOrderId: async (req, res) => {
    try {
      const serviceOrderId = req.body.serviceOrderId;
      const serviceRequestId = await knex('service_orders').select('serviceRequestId').where({ id: serviceOrderId }).first()
      return res.status(200).json({
        data: {
          serviceRequestId
        }
      })
    } catch (err) {
      return res.status(200).json({
        data: {
          update: false
        }
      })
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
