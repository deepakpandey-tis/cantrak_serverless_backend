const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const knex = require("../db/knex");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const request = require("request");


const serviceDetailsController = {
  addPriorities: async (req, res) => {
    try {
      let Priorities = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          incidentPriorityCode: Joi.string().required(),
          descriptionThai: Joi.string().allow("").optional(),
          descriptionEng: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addPrioritites]: JOi Result",
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
          ...payload,
          orgId: orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("incident_priority");
        Priorities = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          priorities: Priorities
        },
        message: "Priorities added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][addPriorities] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updatePriorities: async (req, res) => {
    try {
      let Priorities = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          incidentPriorityCode: Joi.string().required(),
          descriptionThai: Joi.string().allow("").optional(),
          descriptionEng: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updatePriorities]: JOi Result",
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
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id, createdBy: userId, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("incident_priority");
        Priorities = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          Priorities: Priorities
        },
        message: "Priorities details updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][updatePriorities] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewPriorities: async (req, res) => {
    try {
      let Priorities = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let current = new Date().getTime();
        let PrioritiesResult = await knex("incident_priority")
          .select("incident_priority.*")
          .where({ id: payload.id, orgId: orgId });

        Priorities = _.omit(PrioritiesResult[0], [
          "createdAt",
          "updatedAt"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          Priorities: Priorities
        },
        message: "Priorities details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewPriorities] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  addLocationTag: async (req, res) => {
    try {
      let LocationTag = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          title: Joi.string().required(),
          descriptionThai: Joi.string().allow("").optional(),
          descriptionEng: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addLocation]: JOi Result",
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
          ...payload,
          orgId: orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("location_tags_master");
        LocationTag = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          locationTag: LocationTag
        },
        message: "LocationTag added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][addLocationTag] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateLocationTag: async (req, res) => {
    try {
      let LocationTag = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          title: Joi.string().required(),
          descriptionThai: Joi.string().allow("").optional(),
          descriptionEng: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updatePriorities]: JOi Result",
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
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id, createdBy: userId, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("location_tags_master");
        LocationTag = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          LocationTag: LocationTag
        },
        message: "Location Tag details updated successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][LocationTag] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewLocationTag: async (req, res) => {
    try {
      let LocationTag = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let current = new Date().getTime();
        let LocationTagResult = await knex("location_tags_master")
          .select("location_tags_master.*")
          .where({ id: payload.id, orgId: orgId });

        LocationTag = _.omit(LocationTagResult[0], [
          "createdAt",
          "updatedAt"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          LocationTag: LocationTag
        },
        message: "Location Tag details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewLocationTag] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getGeneralDetails: async (req, res) => {
    try {
      let generalDetails = null;
      let DataResult = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        // Insert in users table,
        const incidentRequestPayload = req.body;

        // Get HouseId By Service Request Id

        const requestResult = await knex("service_requests")
        .where({
          "service_requests.isActive": "true",
          "service_requests.id": incidentRequestPayload.id,
          "service_requests.orgId": orgId
        })
        
        console.log("serviceRequest", requestResult);
        let houseId = requestResult[0].houseId;
        
        DataResult = await knex("property_units")
          .leftJoin("companies", "property_units.companyId", "=", "companies.id")
          .leftJoin("projects", "property_units.projectId", "=", "projects.id")
          .leftJoin("property_types", "property_units.propertyTypeId", "=", "property_types.id")
          .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "=", "buildings_and_phases.id")
          .leftJoin("floor_and_zones", "property_units.floorZoneId", "=", "floor_and_zones.id")
          .leftJoin("service_requests", "property_units.id", "=", "service_requests.houseId")
          .leftJoin('users', 'service_requests.createdBy', 'users.id')
          .leftJoin("users AS u", "service_requests.requestedBy", "u.id")
          .leftJoin("source_of_request", "service_requests.serviceType","source_of_request.id")
          .leftJoin("images", "service_requests.id","images.entityId")
          .select(
            "companies.companyName",
            "projects.projectName",
            "property_types.propertyType",
            "buildings_and_phases.buildingPhaseCode",
            "floor_and_zones.floorZoneCode",
            "service_requests.description as descriptions",
            "service_requests.location",
            "service_requests.serviceStatusCode as serviceStatusCode",
            "service_requests.updatedAt as updatedAt",
            "service_requests.createdAt as createdAt",
            "u.name as requestedBy",
            "users.name as createdUser",
            "source_of_request.descriptionEng as serviceType",
            "images.s3Url",
            "images.title",
            "images.name",
            "property_units.*"
          )
          .where({
            "property_units.id": houseId,
            "service_requests.orgId": orgId,
            "service_requests.id": incidentRequestPayload.id
          });

        console.log(
          "[controllers][servicedetails][generaldetails]: View Data", DataResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        DataResult = _.omit(
          DataResult[0],
          ["companyId"],
          // ["projectId"],
          ["propertyTypeId"],
          ["buildingPhaseId"],
          ["floorZoneId"],
          ["property_units.createdBy"]
        );

        let locationResult = await knex("location_tags")
        .leftJoin("location_tags_master","location_tags.locationTagId","location_tags_master.id")
        .where({
          "location_tags.entityType": "service_requests",
          "location_tags.entityId": incidentRequestPayload.id
        })
        .select("location_tags_master.title")
        let tags = locationResult.map(v => v.title)//[userHouseId.houseId];

        DataResult.locationTags = tags;
        console.log("locationResult",tags);

        generalDetails = DataResult;
        trx.commit;

      });

      res.status(200).json({
        data: {
          generalDetails: generalDetails
        },
        message: "General details list successfully !"
      });
    } catch (err) {
      console.log("[controllers][entrance][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getLocationTags: async (req, res) => {
    try {
      let locationTags = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      let reqData = req.query;
      //let filters = req.body;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      // await knex.transaction(async (trx) => {

      // Get Location Tag List,
      //const DataResult = await knex('location_tags_master').where({ isActive: 'true' });

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("location_tags_master")
          .leftJoin("users", "location_tags_master.createdBy", "users.id")
          .where({ "location_tags_master.orgId": orgId })
          .first(),
        knex("location_tags_master")
          .leftJoin("users", "location_tags_master.createdBy", "users.id")
          .where({ "location_tags_master.orgId": orgId })
          .select([
            "location_tags_master.id as ID",
            "location_tags_master.title as Location Tag",
            "location_tags_master.descriptionEng as Description English",
            "location_tags_master.descriptionThai as Description Thai",
            "location_tags_master.isActive as Status",
            "location_tags_master.createdAt as Date Created",
            "users.name as Created By"
          ])
          .orderBy('location_tags_master.id','desc')
          .offset(offset)
          .limit(per_page)
      ]);

      let count = total.count;
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
          location_tags: pagination
        },
        message: "Location Tags List!"
      });
      //console.log('[controllers][servicedetails][locationtags]: View Data', DataResult);

      //locationTags = DataResult;

      //trx.commit;
      //});

      // res.status(200).json({
      //     data: {
      //         locationTags: locationTags
      //     },
      //     message: "Location Tags list successfully !"
      // });
    } catch (err) {
      console.log("[controllers][servicedetails][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getServiceType: async (req, res) => {
    try {
      let sourceRequest = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        // Get Location Tag List,
        const DataResult = await knex("source_of_request").where({
          isActive: "true",
          orgId: orgId
        });

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][servicedetails][sourcerequest]: View Data",
          DataResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        sourceRequest = DataResult;

        trx.commit;
      });

      res.status(200).json({
        data: {
          sourceRequest: sourceRequest
        },
        message: "Source Of Request list successfully !"
      });
    } catch (err) {
      console.log("[controllers][servicedetails][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPriorityList: async (req, res) => {
    try {
      let locationTags = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      let reqData = req.query;
      //let filters = req.body;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      // await knex.transaction(async (trx) => {

      // Get Location Tag List,
      //const DataResult = await knex('location_tags_master').where({ isActive: 'true' });

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("incident_priority")
          .leftJoin("users", "incident_priority.createdBy", "users.id")
          .where({ "incident_priority.orgId": orgId })
          .first(),
        knex("incident_priority")
          .leftJoin("users", "incident_priority.createdBy", "users.id")
          .where({ "incident_priority.orgId": orgId })
          .select([
            "incident_priority.id as id",
            "incident_priority.incidentPriorityCode as Priorities",
            "incident_priority.descriptionEng as Description English",
            "incident_priority.descriptionThai as Description Thai",
            "incident_priority.isActive as Status",
            "users.name as Created By",
            "incident_priority.createdAt as Date Created"
          ])
          .orderBy('incident_priority.id','desc')
          .offset(offset)
          .limit(per_page)
      ]);

      let count = total.count;
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
          priorities: pagination
        },
        message: "Priorities List!"
      });
      //console.log('[controllers][servicedetails][locationtags]: View Data', DataResult);

      //locationTags = DataResult;

      //trx.commit;
      //});

      // res.status(200).json({
      //     data: {
      //         locationTags: locationTags
      //     },
      //     message: "Location Tags list successfully !"
      // });
    } catch (err) {
      console.log("[controllers][servicedetails][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getServiceRequestList: async (req, res) => {
    try {
      let serviceRequestList = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        // Get Location Tag List,
        const DataResult = await knex("service_requests").where({
          isActive: "true",
          moderationStatus: "true",
          orgId: orgId
        });

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][servicedetails][serviceRequestList]: View Data",
          DataResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        serviceRequestList = DataResult;

        trx.commit;
      });

      res.status(200).json({
        data: {
          serviceRequestList: serviceRequestList
        },
        message: "Service Request List Successfully !"
      });
    } catch (err) {
      console.log(
        "[controllers][servicedetails][serviceRequestList] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewServiceRequestDetails: async (req, res) => {
    try {
      let serviceRequestDetails = null;
      let generalResult = null;
      let problemResult = null;
      let problemImages = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const viewRequestPayload = req.body;
        console.log(
          "[controllers][servicedetails][viewrequest]",
          viewRequestPayload
        );

        // Get Location Tag List,
        const DataResult = await knex("service_requests").where({
          id: viewRequestPayload.serviceRequestId,
          isActive: "true",
          moderationStatus: "true"
        });

        console.log(
          "[controllers][servicedetails][serviceRequestDetails]: View House Id",
          DataResult[0].houseId
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        serviceRequestDetails = DataResult[0];

        // General Details

        generalResult = await knex("property_units")
          .join("companies", "property_units.companyId", "=", "companies.id")
          .join("projects", "property_units.projectId", "=", "projects.id")
          .join(
            "property_types",
            "property_units.propertyTypeId",
            "=",
            "property_types.id"
          )
          .join(
            "buildings_and_phases",
            "property_units.buildingPhaseId",
            "=",
            "buildings_and_phases.id"
          )
          .join(
            "floor_and_zones",
            "property_units.floorZoneId",
            "=",
            "floor_and_zones.id"
          )
          .select(
            "companies.companyName",
            "projects.projectName",
            "property_types.propertyType",
            "buildings_and_phases.buildingPhaseCode",
            "floor_and_zones.floorZoneCode",
            "property_units.*"
          )
          .where({
            "property_units.id": DataResult[0].houseId,
            "property_units.orgId": orgId
          });

        console.log(
          "[controllers][servicedetails][serviceRequestDetails]: View Data",
          generalResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        generalResult = _.omit(
          generalResult[0],
          ["id"],
          ["area"],
          ["description"],
          ["productCode"],
          ["createdBy"],
          ["isActive"],
          ["updatedAt"],
          ["createdAt"],
          ["companyId"],
          ["projectId"],
          ["propertyTypeId"],
          ["buildingPhaseId"],
          ["floorZoneId"]
        );

        serviceRequestDetails.generalDetails = generalResult;

        // Problems Details

        problemResult = await knex("service_problems")
          .join(
            "incident_categories",
            "service_problems.categoryId",
            "=",
            "incident_categories.id"
          )
          .join(
            "incident_sub_categories",
            "service_problems.problemId",
            "=",
            "incident_sub_categories.id"
          )
          .select(
            "incident_categories.descriptionEng as category",
            "incident_sub_categories.descriptionEng as subcategory",
            "service_problems.*"
          )
          .where({
            "service_problems.serviceRequestId": DataResult[0].id,
            "service_problems.orgId": orgId
          });

        console.log(
          "[controllers][servicedetails][serviceProblemDetails]: View Data",
          problemResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
        problemResult = _.omit(
          problemResult[0],
          ["id"],
          ["createdAt"],
          ["problemId"],
          ["categoryId"],
          ["serviceRequestId"],
          ["updatedAt"]
        );

        serviceRequestDetails.problemDetails = problemResult;

        // Problems Images

        problemImages = await knex("images")
          .join(
            "service_problems",
            "images.entityId",
            "=",
            "service_problems.id"
          )
          .select("images.s3Url")
          .where({
            "images.entityType": "service_problems",
            "images.orgId": orgId
          });

        console.log(
          "[controllers][servicedetails][images]: View Data",
          problemResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
        // problemResult = _.omit(problemResult[0],['id'],['createdAt'],['problemId'],['categoryId'],['serviceRequestId'],['updatedAt']);

        serviceRequestDetails.problemDetails.images = problemImages;

        trx.commit;
      });

      res.status(200).json({
        data: {
          serviceRequestDetails: serviceRequestDetails
        },
        message: "Service Request List Successfully !"
      });
    } catch (err) {
      console.log(
        "[controllers][servicedetails][serviceRequestDetails] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  exportLocationTags: async (req, res) => {
    try {
      let locationTags = null;
      let userId = req.me.id;
      let orgId = req.orgId;
      let reqData = req.query;
      let rows;
      [rows] = await Promise.all([
        knex("location_tags_master")
          .select([
            "title as TITLE",
            "descriptionEng as DESCRIPTION",
            "descriptionThai as ALTERNATE_DESCRIPTION"
          ])
          .where({ "location_tags_master.orgId": orgId })
      ]);

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = "sls-app-resources-bucket";
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
        bucketName = process.env.S3_BUCKET_NAME;
      }
      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "LocationTagData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/LocationTag/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let deleteFile = fs.unlink(filepath, err => {
              console.log("File Deleting Error " + err);
            });
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/LocationTag/" +
              filename;
            res.status(200).json({
              data: rows,
              message: "Location Tags List!",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][servicedetails][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /**Export Priorities Data  */

  exportPriorityData: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;

      let reqData = req.query;
      let rows;

      [rows] = await Promise.all([
        knex("incident_priority")
          .select([
            "incidentPriorityCode as PRIORITY_CODE",
            "descriptionEng as DESCRIPTION",
            "descriptionThai as ALTERNATE_DESCRIPTION"
          ])
          .where({ orgId: orgId })
      ]);

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = "sls-app-resources-bucket";
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
        bucketName = process.env.S3_BUCKET_NAME;
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "PriorityData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Priority/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let deleteFile = fs.unlink(filepath, err => {
              console.log("File Deleting Error " + err);
            });
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Priority/" +
              filename;
            res.status(200).json({
              data: rows,
              message: "Priority List",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][servicedetails][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /**Import Priorities Data  */

  importPrioritiesData: async (req, res) => {
    try {
      if (req.file) {
        console.log(req.file);
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
          tempraryDirectory = "tmp/";
        } else {
          tempraryDirectory = "/tmp/";
        }
        let resultData = null;
        let file_path = tempraryDirectory + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: "binary" });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, {
          type: "string",
          header: "A",
          raw: false
        });
        //data         = JSON.stringify(data);
        let result = null;
        let currentTime = new Date().getTime();
        //console.log('DATA: ',data)

        if (
          data[0].A == "Ã¯Â»Â¿PRIORITY_CODE" || data[0].A == "PRIORITY_CODE" &&
          data[0].B == "DESCRIPTION" &&
          data[0].C == "ALTERNATE_DESCRIPTION"
        ) {
          if (data.length > 0) {
            let i = 0;
            console.log("Data[0]", data[0]);
            for (let priorityData of data) {
              i++;

              if (i > 1) {
                let checkExist = await knex("incident_priority")
                  .select("incidentPriorityCode")
                  .where({
                    incidentPriorityCode: priorityData.A,
                    orgId: req.orgId
                  });
                if (checkExist.length < 1) {
                  let insertData = {
                    orgId: req.orgId,
                    incidentPriorityCode: priorityData.A,
                    descriptionEng: priorityData.B,
                    descriptionThai: priorityData.C,
                    isActive: true,
                    createdBy: req.me.id,
                    createdAt: currentTime,
                    updatedAt: currentTime
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("incident_priority");
                }
              }
            }



            let deleteFile = await fs.unlink(file_path, err => {
              console.log("File Deleting Error " + err);
            });
            return res.status(200).json({
              message: "Priority Data Import Successfully!"
            });


          }
        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
            ]
          });
        }
      } else {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
          ]
        });
      }
    } catch (err) {
      console.log(
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // End


  /**Import Priorities Data  */

  importLocationTag: async (req, res) => {
    try {
      if (req.file) {
        console.log(req.file);
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
          tempraryDirectory = "tmp/";
        } else {
          tempraryDirectory = "/tmp/";
        }
        let resultData = null;
        let file_path = tempraryDirectory + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: "binary" });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, {
          type: "string",
          header: "A",
          raw: false
        });
        //data         = JSON.stringify(data);
        let result = null;
        let errors = []
        let header = Object.values(data[0]);
        header.unshift('Error');
        errors.push(header)
        let currentTime = new Date().getTime();
        //console.log('DATA: ',data)
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;

        if (
          data[0].A == "Ã¯Â»Â¿TITLE" || data[0].A == "TITLE" &&
          data[0].B == "DESCRIPTION" &&
          data[0].C == "ALTERNATE_DESCRIPTION"
        ) {
          if (data.length > 0) {
            let i = 0;
            console.log("Data[0]", data[0]);
            for (let locationTagData of data) {
              i++;

              if (i > 1) {
                let checkExist = await knex("location_tags_master")
                  .select("title")
                  .where({
                    title: locationTagData.A,
                    orgId: req.orgId
                  });
                if (checkExist.length < 1) {
                  let insertData = {
                    orgId: req.orgId,
                    title: locationTagData.A,
                    descriptionEng: locationTagData.B,
                    descriptionThai: locationTagData.C,
                    isActive: true,
                    createdBy: req.me.id,
                    createdAt: currentTime,
                    updatedAt: currentTime
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("location_tags_master");
                    success++;
                }else{
                  fail++;
                  let values = _.values(locationTagData)
                  values.unshift('Location tag already exists.')
                  errors.push(values);
                }
              }
            }

            let deleteFile = await fs.unlink(file_path, err => {
              console.log("File Deleting Error " + err);
            });

            let message = null;
            if (totalData == success) {
              message =
                "System has processed processed ( " +
                totalData +
                " ) entries and added them successfully!";
            } else {
              message =
                "System has processed processed ( " +
                totalData +
                " ) entries out of which only ( " +
                success +
                " ) are added and others are failed ( " +
                fail +
                " ) due to validation!";
            }
            return res.status(200).json({
              message: message,
              errors
            });
          }
        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
            ]
          });
        }
      } else {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
          ]
        });
      }
    } catch (err) {
      console.log(
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /***GET LOCATION TAG ALL LIST */
  getLocatioTagAllList: async (req, res) => {

    try {

      let orgId = req.orgId;
      let result = await knex('location_tags_master').where({ 'orgId': orgId })
      return res.status(200).json({
        data: result,
        message: "Location list!"
      });

    } catch (err) {

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }

  },

  /** Get Service Request Problem Details */

  getServiceProblem: async (req, res) => {
    try {
      let problemDetails = null;
      let DataResult = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        // Insert in users table,
        const serviceRequestPayload = req.body;

        // Get HouseId By Service Request Id    

        DataResult = await knex("service_problems")
          .leftJoin("incident_categories", "service_problems.categoryId", "=", "incident_categories.id")
          .leftJoin("incident_sub_categories", "service_problems.problemId", "=", "incident_sub_categories.id")
          .select(
            "incident_categories.categoryCode ",
            "incident_categories.descriptionEng",
            // "incident_sub_categories.categoryCode as subCategoryCode",
            "incident_sub_categories.descriptionEng as subCategoryDescriptionEng",
            "service_problems.description"
          )
          .where({
            "service_problems.serviceRequestId": serviceRequestPayload.id,
            "service_problems.orgId": orgId
          });

        console.log(
          "[controllers][servicedetails][problemdetails]: View Data", DataResult
        );

        problemDetails = DataResult;
        trx.commit;
      });

      res.status(200).json({
        data: {
          problemDetails: problemDetails
        },
        message: "Problem category & subcategory details !"
      });
    } catch (err) {
      console.log("[controllers][entrance][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /** Get Service Request Current Status */

  getServiceRequestStatus: async (req, res) => {
    try {
      let statusDetails;
      let DataResult = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        // Insert in users table,
        const incidentRequestPayload = req.body;

        // Get Service Request Status      

        DataResult = await knex("service_requests").where({
            isActive: "true",
            id: incidentRequestPayload.id,
            orgId: orgId
          })
          .select(
            "service_requests.id",
            "service_requests.description",
            "service_requests.createdAt",
            "service_requests.priority",
            "service_requests.serviceStatusCode"
          )

        console.log(
          "[controllers][servicedetails][status]: View Data", DataResult
        );
        statusDetails = DataResult;
        trx.commit;
      });

      res.status(200).json({
        data: {
          serviceStatus: statusDetails
        },
        message: "Service request current status!"
      });
    } catch (err) {
      console.log("[controllers][entrance][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  
  /***GET PRIORITY ALL LIST */
  getPriorityAllList: async (req, res) => {
    try {      
      let result = await knex('incident_priority').where({ 'orgId': req.orgId, 'isActive': true })
      return res.status(200).json({
        data: result,
        message: "Priority list!"
      });
    } catch (err) {
      console.log("[controllers][servicedetails][signup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*ACTIVE/INACTIVE PRIORITY STATUS */
  togglePriorityStatus: async (req, res) => {
    try {
      let priority = null;
      let orgId = req.orgId;
      let message;
      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let priorityResult;

        let checkStatus = await knex.from('incident_priority').where({ id: payload.id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            priorityResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("incident_priority");
              priority = priorityResult[0];
            message = "Priority Deactivate successfully!"

          } else {

            priorityResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("incident_priority");
              priority = priorityResult[0];
            message = "Priority Activate successfully!"

          }
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          priority: priority
        },
        message: message
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][togglePriority] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*ACTIVE/INACTIVE LOCATION TAG */
  toggleLocationTagStatus: async (req, res) => {
    try {
      let location = null;
      let orgId = req.orgId;
      let message;
      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let locationResult;
        let checkStatus = await knex.from('location_tags_master').where({ id: payload.id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            locationResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("location_tags_master");
              location = locationResult[0];
            message = "Location tag Deactivate successfully!"
          } else {
            locationResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("location_tags_master");
              location = locationResult[0];
            message = "Location tag Activate successfully!"
          }
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          location: location
        },
        message: message
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][togglePriority] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  sourceOfRequestStatus: async (req, res) => {
    try {
      let sourceOfRequest = null;
      let orgId = req.orgId;
      let message;
      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let requestResult;
        let checkStatus = await knex.from('source_of_request').where({ id: payload.id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            requestResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("source_of_request");
              sourceOfRequest = requestResult[0];
            message = "Source Of Request Deactivate successfully!"
          } else {
            requestResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("source_of_request");
              sourceOfRequest = requestResult[0];
            message = "Source Of Request Activate successfully!"
          }
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          sourceOfRequest: sourceOfRequest
        },
        message: message
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][togglePriority] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = serviceDetailsController;
