const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");
const knexReader = require("../../db/knex-reader");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const fs = require("fs");
const path = require("path");


const plantationGroupController = {
  addPlantationGroup: async (req, res) => {
    try {

      let plantationGroup = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      const payload = req.body;
      const schema = Joi.object().keys({
        companyId: Joi.string().required(),
        plantationId: Joi.string().required(),
        plantationPhaseId: Joi.string().required(),
        code: Joi.string().required(),
        description: Joi.string().allow("").allow(null).optional(),
        area: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][addPlantationGroup]: JOi Result",
        result
      );
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }


      /*CHECK DUPLICATE VALUES OPEN */
      let existValue = await knex('plantation_groups')
        .where({ code: payload.code.toUpperCase(), plantationPhaseId: payload.plantationPhaseId, orgId: orgId });
      if (existValue && existValue.length) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Plantation Group Code & Plantation Phase code already exist!" }
          ]
        });
      }
      /*CHECK DUPLICATE VALUES CLOSE */

      console.log('PAYLOAD:UNIT: **************************: ', payload)
      // plantationType is NOT saved in plantation_groups
      // let plantationType = await knexReader('plantation_phases').where({ id: payload.plantationPhaseId }).select('plantationTypeId').first()

      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        code: payload.code.toUpperCase(),
        // plantationTypeId: plantationType.plantationTypeId,
        orgId: orgId,
        createdBy: userId,
        createdAt: currentTime,
        updatedBy: userId,
        updatedAt: currentTime
      };
      let insertResult = await knex
        .insert(insertData)
        .returning(["*"])
        .into("plantation_groups");
      plantationGroup = insertResult[0];

      return res.status(200).json({
        data: {
          plantationGroup: plantationGroup
        },
        message: "Plantation Group added successfully!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][addPlantationGroup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updatePlantationGroup: async (req, res) => {
    try {
      let plantationGroup = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      const payload = req.body;

      const schema = Joi.object().keys({
        id: Joi.string().required(),
        companyId: Joi.string().required(),
        plantationId: Joi.string().required(),
        // plantationTypeId: Joi.string().allow("").allow(null).optional(),
        plantationPhaseId: Joi.string().required(),
        code: Joi.string().required(),
        description: Joi.string().allow("").allow(null).optional(),
        area: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][updatePlantationGroup]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }


      /*CHECK DUPLICATE VALUES OPEN */
      let existValue = await knex('plantation_groups')
        .where({ code: payload.code.toUpperCase(), plantationPhaseId: payload.plantationPhaseId, orgId: orgId });
      if (existValue && existValue.length) {

        if (existValue[0].id === payload.id) {

        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Plantation Group Code & Plantation Phase code already exist!" }
            ]
          });
        }
      }
      /*CHECK DUPLICATE VALUES CLOSE */

      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        code: payload.code.toUpperCase(),
        updatedBy: userId,
        updatedAt: currentTime
      };
      let insertResult = await knex
        .update(insertData)
        .where({ id: payload.id, orgId: orgId })
        .returning(["*"])
        .into("plantation_groups");
      plantationGroup = insertResult[0];

      return res.status(200).json({
        data: {
          plantationGroup: plantationGroup
        },
        message: "Plantation Group detail updated successfully."
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][updatePlantationGroup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  viewPlantationGroup: async (req, res) => {
    try {
      let plantationGroup = null;
      let payload = req.body;
      let orgId = req.orgId;

      const schema = Joi.object().keys({
        id: Joi.string().required()
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let current = new Date().getTime();

      let floorZoneResult = await knexReader("plantation_groups")
        .leftJoin("companies", "plantation_groups.companyId", "companies.id")
        .leftJoin("plantations", "plantation_groups.plantationId", "plantations.id")
        .leftJoin(
          "plantation_phases",
          "plantation_groups.plantationPhaseId",
          "plantation_phases.id"
        )
        .leftJoin(
          "plantation_types",
          "plantation_phases.plantationTypeId",
          "plantation_types.id"
        )
        .select(
          "plantation_groups.*",
          "companies.companyName as companyName",
          "companies.companyId as compId",
          "companies.id as companyId",
          "plantations.name as plantationName",
          "plantation_types.name as plantationTypeName",
          "plantation_phases.code as plantationPhaseCode",
          "companies.companyId as companyCode",
          "plantation_types.code as plantationTypeCode",
          "plantations.code as plantationCode",
          "plantations.id as plantationId",
          "plantation_phases.description as plantationPhaseDescription",

        )
        .where({
          "plantation_groups.id": payload.id,
          "plantation_groups.orgId": orgId
        });

      plantationGroup = _.omit(floorZoneResult[0], [
        "createdAt",
        "updatedAt"
      ]);
      return res.status(200).json({
        data: {
          plantationGroup: plantationGroup
        },
        message: "Plantation Group details"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][viewPlantationGroup] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  deletePlantationGroup: async (req, res) => {
    try {
      let plantationGroup = null;
      let userId = req.me.id;
      let orgId = req.orgId;
      let message;

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

      let floorZoneResult;
      let currentTime = new Date().getTime();
      let checkStatus = await knex.from('plantation_groups').where({ id: payload.id }).returning(['*'])
      if (checkStatus && checkStatus.length) {

        if (checkStatus[0].isActive == true) {

          let floorZoneResult = await knex
            .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("plantation_groups");

          plantationGroup = floorZoneResult[0];
          message = "Plantation Group deactivated successfully!"

        } else {

          let floorZoneResult = await knex
            .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("plantation_groups");

          plantationGroup = floorZoneResult[0];
          message = "Plantation Group activated successfully!"
        }
      }

      return res.status(200).json({
        data: {
          plantationGroup: plantationGroup
        },
        message: message
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][deletePlantationGroup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationGroupList: async (req, res) => {
    try {

      let resourcePlantations = req.userPlantationResources[0].plantations;
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "plantation_groups.code";
        sortPayload.orderBy = "asc"
      }
      let orgId = req.orgId;

      let reqData = req.query;
      let { companyId,
        plantationId,
        plantationPhaseId,
        code,
      } = req.body;
      let pagination = {};


      if (companyId || plantationId || plantationPhaseId || code) {


        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;
        let filters = {};
        filters["plantation_groups.companyId"] = companyId;
        if (plantationId) {
          filters["plantation_groups.plantationId"] = plantationId;
        }
        if (plantationPhaseId) {
          filters["plantation_groups.plantationPhaseId"] = plantationPhaseId;
        }

        let [total, rows] = await Promise.all([
          knexReader
            .count("* as count")
            .from("plantation_groups")
            .leftJoin("companies", "plantation_groups.companyId", "companies.id")
            .leftJoin("users", "plantation_groups.createdBy", "users.id")
            .leftJoin("plantation_phases", "plantation_groups.plantationPhaseId", "plantation_phases.id")
            .leftJoin("plantations", "plantation_groups.plantationId", "plantations.id")
            // .leftJoin("plantation_types", "plantation_groups.plantationTypeId", "plantation_types.id")
            .where({ "plantation_phases.isActive": true })
            .where({ "plantation_groups.orgId": orgId })
            .where(qb => {
              if (companyId) {
                qb.where('plantation_groups.companyId', companyId)
              }

              if (plantationId) {
                qb.where('plantation_groups.plantationId', plantationId)
              }

              if (plantationPhaseId) {
                qb.where('plantation_groups.plantationPhaseId', plantationPhaseId)
              }

              if (code) {
                qb.where('plantation_groups.code', 'iLIKE', `%${code}%`)
              }
            })
            .whereIn('plantation_groups.plantationId', resourcePlantations)
            .first(),
          knexReader
            .from("plantation_groups")
            .leftJoin("companies", "plantation_groups.companyId", "companies.id")
            .leftJoin("users", "plantation_groups.createdBy", "users.id")
            .leftJoin("plantation_phases", "plantation_groups.plantationPhaseId", "plantation_phases.id")
            .leftJoin("plantations", "plantation_groups.plantationId", "plantations.id")
            // .leftJoin("plantation_types", "plantation_groups.plantationTypeId", "plantation_types.id")
            .select([
              "plantation_groups.code as code",
              "plantation_groups.description as description",
              "plantation_groups.id as id",
              "plantation_groups.area as Total Area",
              "plantation_groups.isActive as Status",
              "users.name as Created By",
              "plantation_groups.createdAt as Date Created",
              "plantation_phases.code as plantationPhaseCode",
              "plantations.name as plantationName",
              "plantations.code as plantationCode",
              "plantations.id as plantationId",
              "plantation_phases.description as plantationPhaseDescription",
            ])
            .where({ "plantation_phases.isActive": true })
            .where({ "plantation_groups.orgId": orgId })
            .where(qb => {
              if (companyId) {
                qb.where('plantation_groups.companyId', companyId)
              }

              if (plantationId) {
                qb.where('plantation_groups.plantationId', plantationId)
              }

              if (plantationPhaseId) {
                qb.where('plantation_groups.plantationPhaseId', plantationPhaseId)
              }

              if (code) {
                qb.where('plantation_groups.code', 'iLIKE', `%${code}%`)
              }
            })
            .whereIn('plantation_groups.plantationId', resourcePlantations)
            .offset(offset)
            .limit(per_page)
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)

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

      } else {

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knexReader
            .count("* as count")
            .from("plantation_groups")
            .leftJoin("companies", "plantation_groups.companyId", "companies.id")
            .leftJoin("users", "plantation_groups.createdBy", "users.id")
            .leftJoin("plantation_phases", "plantation_groups.plantationPhaseId", "plantation_phases.id")
            .leftJoin("plantations", "plantation_groups.plantationId", "plantations.id")
            // .leftJoin("plantation_types", "plantation_groups.plantationTypeId", "plantation_types.id")
            .where({ "plantation_groups.orgId": orgId })
            .where({ "plantation_phases.isActive": true })
            .whereIn('plantation_groups.plantationId', resourcePlantations)
            .first(),
          knexReader("plantation_groups")
            .leftJoin("companies", "plantation_groups.companyId", "companies.id")
            .leftJoin("users", "plantation_groups.createdBy", "users.id")
            .leftJoin("plantation_phases", "plantation_groups.plantationPhaseId", "plantation_phases.id")
            .leftJoin("plantations", "plantation_groups.plantationId", "plantations.id")
            // .leftJoin("plantation_types", "plantation_groups.plantationTypeId", "plantation_types.id")
            .select([
              "plantation_groups.code as code",
              "plantation_groups.description as description",
              "plantation_groups.id as id",
              "plantation_groups.area as Total Area",
              "plantation_groups.isActive as Status",
              "users.name as Created By",
              "plantation_groups.createdAt as Date Created",
              "plantation_phases.code as plantationPhaseCode",
              "plantations.name as plantationName",
              "plantations.id as plantationId",
              "plantation_phases.description as plantationPhaseDescription",
            ])
            .where({ "plantation_groups.orgId": orgId })
            .where({ "plantation_phases.isActive": true })
            .whereIn('plantation_groups.plantationId', resourcePlantations)
            .offset(offset)
            .limit(per_page)
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
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

      }

      return res.status(200).json({
        data: {
          plantationGroups: pagination
        },
        message: "Plantation Group List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationGroupList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  exportPlantationGroup: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.query;
      let companyId = req.query.companyId;
      let rows = null;

      if (!companyId) {
        [rows] = await Promise.all([
          knexReader("plantation_groups")
            .leftJoin("companies", "plantation_groups.companyId", "companies.id")
            .leftJoin("plantations", "plantation_groups.plantationId", "plantations.id")
            .leftJoin(
              "plantation_phases",
              "plantation_groups.plantationPhaseId",
              "plantation_phases.id"
            )
            .leftJoin("users", "plantation_groups.createdBy", "users.id")
            /*             .leftJoin(
                          "plantation_types",
                          "plantation_groups.plantationTypeId",
                          "plantation_types.id"
                        )
             */
            .select([
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "plantations.id as PLANTATION_CODE",
              "plantations.name as PLANTATION_NAME",
              // "plantation_types.code as PLANTATION_TYPE_CODE",
              "plantation_phases.code as PLANTATION_PHASE_CODE",
              "plantation_groups.code as PLANTATION_GROUP_CODE",
              "plantation_groups.description as DESCRIPTION",
              "plantation_groups.area as PLANTATION_GROUP_AREA"
            ])
            .where({ "plantation_groups.orgId": orgId })
            .where({ "plantation_phases.isActive": true })
        ]);
      } else {
        [rows] = await Promise.all([
          knexReader
            .from("plantation_groups")
            .leftJoin("companies", "plantation_groups.companyId", "companies.id")
            .leftJoin("plantations", "plantation_groups.plantationId", "plantations.id")
            .leftJoin(
              "plantation_phases",
              "plantation_groups.plantationPhaseId",
              "plantation_phases.id"
            )
            .leftJoin("users", "plantation_groups.createdBy", "users.id")
            /*             .leftJoin(
                          "plantation_types",
                          "plantation_groups.plantationTypeId",
                          "plantation_types.id"
                        )
             */
            .select([
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "plantations.id as PLANTATION_CODE",
              "plantations.name as PLANTATION_NAME",
              // "plantation_types.code as PLANTATION_TYPE_CODE",
              "plantation_phases.code as PLANTATION_PHASE_CODE",
              "plantation_groups.code as PLANTATION_GROUP_CODE",
              "plantation_groups.description as DESCRIPTION",
              "plantation_groups.area as PLANTATION_GROUP_AREA"
            ])
            .where({
              "plantation_groups.companyId": companyId,
              "plantation_groups.orgId": orgId
            })
            .where({ "plantation_phases.isActive": true })
        ]);
      }

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = process.env.S3_BUCKET_NAME;
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
        bucketName = process.env.S3_BUCKET_NAME;
      }
      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws;

      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            COMPANY: "",
            COMPANY_NAME: "",
            PLANTATION_CODE: "",
            PLANTATION_NAME: "",
            // PLANTATION_TYPE_CODE: "",
            PLANTATION_PHASE_CODE: "",
            PLANTATION_GROUP_CODE: "",
            DESCRIPTION: "",
            PLANTATION_GROUP_AREA: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "PlantationGroupData-" + moment(Date.now()).format("YYYYMMDD") + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/PlantationGroup/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let deleteFile = fs.unlink(filepath, err => {
              console.log("File Deleting Error " + err);
            });

            let url = process.env.S3_BUCKET_URL + "/Export/PlantationGroup/" +
              filename;
            // let url =
            //   "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/PlantationGroup/" +
            //   filename;

            return res.status(200).json({
              data: rows,
              message: "Plantation Group Data Export Successfully!",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][exportPlantationGroup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationGroupAllList: async (req, res) => {
    try {
      let orgId = req.orgId;
      let plantationPhaseId = req.query.plantationPhaseId;
      let pagination = {};
      let [rows] = await Promise.all([
        knexReader
          .from("plantation_groups")
          .leftJoin(
            "plantation_phases",
            "plantation_groups.plantationPhaseId",
            "plantation_phases.id"
          )
          .select([
            "plantation_groups.code",
            "plantation_groups.id",
            "plantation_groups.description"
          ])
          //.where({'plantation_groups.orgId': orgId })
          //.where([{'plantation_groups.orgId':orgId}])
          .where({
            "plantation_groups.plantationPhaseId": plantationPhaseId,
            "plantation_groups.orgId": orgId
          })
      ]);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          plantationGroups: pagination
        },
        message: "Plantation Group All List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationGroupAllList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationGroupListByPhaseId: async (req, res) => {
    try {
      let orgId = req.orgId;

      const { plantationPhaseId } = req.body;

      let plantationGroups;
      if (plantationPhaseId) {
        plantationGroups = await knexReader("plantation_groups")
          .select("*")
          .where({ plantationPhaseId, isActive: true, orgId: orgId })
          .orderBy('plantation_groups.code', 'asc');

      } else {
        plantationGroups = await knexReader("plantation_groups")
          .select([
            'plantation_groups.description as description',
            'plantation_groups.code as code',
            'plantation_groups.id as id'
          ])
          .orderBy('plantation_groups.code', 'asc')
          .where({ isActive: true, orgId: orgId });
      }
      return res.status(200).json({
        data: {
          plantationGroups
        },
        message: "Plantation Group list"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationGroupListByPhaseId] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationGroupByMultiplePhaseId: async (req, res) => {
    try {
      let orgId = req.orgId;

      let plantationPhaseId = req.body;
      // console.log("plantation phase id",plantationPhaseId)

      let floor = await knexReader("plantation_groups")
        //  .innerJoin("plantation_phases","plantation_groups.plantationPhaseId","plantation_phases.id")
        .where({ "plantation_groups.isActive": true, "plantation_groups.orgId": orgId })
        .whereIn('plantation_groups.plantationPhaseId', plantationPhaseId)
        .select("*")
        .groupBy(['plantation_groups.code', 'plantation_groups.id'])
        .orderBy('plantation_groups.code', 'asc')
      //.distinct()



      return res.status(200).json({
        data: {
          floor
        },
        message: "Plantation Group list"
      });

    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationGroupByMultiplePhaseId] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },

  /**IMPORT DATA */
  importPlantationGroupData: async (req, res) => {
    try {
      // if (req.file) {
      // let tempraryDirectory = null;
      // if (process.env.IS_OFFLINE) {
      //   tempraryDirectory = "tmp/";
      // } else {
      //   tempraryDirectory = "/tmp/";
      // }
      // let resultData = null;
      // let file_path = tempraryDirectory + req.file.filename;
      // let wb = XLSX.readFile(file_path, { type: "binary" });
      // let ws = wb.Sheets[wb.SheetNames[0]];
      // let data = XLSX.utils.sheet_to_json(ws, {
      //   type: "string",
      //   header: "A",
      //   raw: false
      // });

      let data = req.body;
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      console.log("=======", data[0], "+++++++++++++++");
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)

      if (data[0].A == "Ã¯Â»Â¿COMPANY" ||
        (data[0].A == "COMPANY" &&
          data[0].B == "COMPANY_NAME" &&
          data[0].C == "PLANTATION_CODE" &&
          data[0].D == "PLANTATION_NAME" &&
          // data[0].E == "PLANTATION_TYPE_CODE" &&
          data[0].E == "PLANTATION_PHASE_CODE" &&
          data[0].F == "PLANTATION_GROUP_CODE" &&
          data[0].G == "DESCRIPTION" &&
          data[0].H == "PLANTATION_GROUP_AREA")
      ) {
        if (data.length > 0) {
          let i = 0;
          for (let plantationGroupData of data) {
            i++;

            if (i > 1) {



              if (!plantationGroupData.A) {
                let values = _.values(plantationGroupData)
                values.unshift('Company Id can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantationGroupData.C) {
                let values = _.values(plantationGroupData)
                values.unshift('Plantation Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              /*               if (!plantationGroupData.E) {
                              let values = _.values(plantationGroupData)
                              values.unshift('Plantation type Code can not empty!')
                              errors.push(values);
                              fail++;
                              continue;
                            }
               */
              if (!plantationGroupData.E) {
                let values = _.values(plantationGroupData)
                values.unshift('Plantation phase Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantationGroupData.F) {
                let values = _.values(plantationGroupData)
                values.unshift('Plantation group Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantationGroupData.H) {
                let values = _.values(plantationGroupData)
                values.unshift('Area can not empty!')
                errors.push(values);
                fail++;
                continue;
              }


              let companyData = await knexReader("companies")
                .select("id")
                .where({ companyId: plantationGroupData.A.toUpperCase(), orgId: req.orgId });
              let companyId = null;
              let plantationId = null;
              let plantationPhaseId = null;

              if (!companyData.length) {
                console.log('*********************&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', companyData)
                fail++;
                let values = _.values(plantationGroupData)
                values.unshift('Company ID does not exist')

                //errors.push(header);
                errors.push(values);
                continue;

              }
              if (companyData && companyData.length) {
                companyId = companyData[0].id;
                let plantationData = await knexReader("plantations")
                  .select("id")
                  .where({ code: plantationGroupData.C.toUpperCase(), companyId: companyId, orgId: req.orgId });
                if (plantationData && plantationData.length) {
                  plantationId = plantationData[0].id;
                  let plantationPhaseData = await knexReader("plantation_phases")
                    .select("id")
                    .where({
                      code: plantationGroupData.F.toUpperCase(),
                      orgId: req.orgId,
                      companyId: companyId,
                      plantationId: plantationId
                    });
                  if (plantationPhaseData && plantationPhaseData.length) {
                    plantationPhaseId = plantationPhaseData[0].id;
                  }
                }
              }

              if (!plantationId) {
                fail++;
                let values = _.values(plantationGroupData)
                values.unshift('Plantation ID does not exist')

                //errors.push(header);
                errors.push(values);
                continue;
              }

              /*               /**GET PLANTATION TYPE ID OPEN *
                            let plantationTypeData = await knexReader("plantation_types")
                              .select("id")
                              .where({ code: plantationGroupData.E.toUpperCase(), orgId: req.orgId });
                            let plantationTypeId = null;
                            if (!plantationTypeData.length) {
                              fail++;
                              let values = _.values(plantationGroupData)
                              values.unshift('Plantation Type ID does not exist')
              
                              //errors.push(header);
                              errors.push(values);
                              continue;
                            }
                            if (plantationTypeData && plantationTypeData.length) {
                              plantationTypeId = plantationTypeData[0].id;
                            }
                            /**GET PLANTATION TYPE ID CLOSE *
               */
              /**GET PLANTATION PHASE ID OPEN */

              if (!plantationPhaseId) {
                fail++;
                let values = _.values(plantationGroupData)
                values.unshift('Plantation Phase ID does not exist')

                //errors.push(header);
                errors.push(values);
                continue;
              }
              /**GET PLANTATION PHASE ID CLOSE */


              let checkExist = await knexReader("plantation_groups")
                .select("code")
                .where({
                  code: plantationGroupData.G.toUpperCase(),
                  plantationPhaseId: plantationPhaseId,
                  orgId: req.orgId
                });
              if (checkExist.length < 1) {
                let currentTime = new Date().getTime();
                let insertData = {
                  orgId: req.orgId,
                  companyId: companyId,
                  plantationId: plantationId,
                  // plantationTypeId: plantationTypeId,
                  plantationPhaseId: plantationPhaseId,
                  code: plantationGroupData.G.toUpperCase(),
                  description: plantationGroupData.H,
                  area: plantationGroupData.I,
                  isActive: true,
                  createdBy: req.me.id,
                  createdAt: currentTime,
                  updatedBy: req.me.id,
                  updatedAt: currentTime
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("plantation_groups");
                if (resultData && resultData.length) {
                  success++;
                }
              } else {
                fail++;
                let values = _.values(plantationGroupData)
                values.unshift('Plantation Group ID already exist')

                //errors.push(header);
                errors.push(values);
              }
            }
          }

          //fail = fail - 1;
          let message = null;
          if (totalData == success) {
            message =
              "System has processed ( " +
              totalData +
              " ) entries and added them successfully!";
          } else {
            message =
              "System has processed ( " +
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
      // } else {
      //   return res.status(400).json({
      //     errors: [
      //       { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
      //     ]
      //   });
      // }
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][importPlantationGroupData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationGroupListByPhaseIdHavingPropertyUnits: async (req, res) => {
    try {
      let orgId = req.orgId;

      const { plantationPhaseId } = req.body;

      let floor;

      companyHavingPlantations = await knexReader('plantation_groups').select(['companyId']).where({ orgId: req.orgId, isActive: true })
      companyArr1 = companyHavingPlantations.map(v => v.companyId)

      if (req.query.areaName === 'common') {
        if (plantationPhaseId) {
          floor = await knexReader("plantation_groups")
            .innerJoin('plant_containers', 'plantation_groups.id', 'plant_containers.plantationGroupId')
            .select("plantation_groups.*")
            .where({
              'plantation_groups.plantationPhaseId': plantationPhaseId, 'plantation_groups.isActive': true, 'plantation_groups.orgId': orgId
              // 'plantation_groups.plantationPhaseId': plantationPhaseId, 'plantation_groups.isActive': true, 'plantation_groups.orgId': orgId, 'plant_containers.type': 2
            })
            .whereIn('plantation_groups.companyId', companyArr1)
            .groupBy(['plantation_groups.id'])
            .orderBy('plantation_groups.code', 'asc')

        } else {
          floor = await knexReader("plantation_groups")
            .innerJoin('plant_containers', 'plantation_groups.id', 'plant_containers.plantationGroupId')
            .select([
              'plantation_groups.code as code',
              'plantation_groups.id as id'
            ])
            .where({ isActive: true, orgId: orgId })
            // .where({ isActive: true, orgId: orgId, "property_units.type": 1 })
            .whereIn('plantation_groups.companyId', companyArr1)
            .groupBy(['plantation_groups.id'])
            .orderBy('plantation_groups.code', 'asc')

        }

      } else {
        floor = await knexReader("plantation_groups")
          .innerJoin('plant_containers', 'plantation_groups.id', 'plant_containers.plantationGroupId')
          .select("plantation_groups.*")
          .where({
            'plantation_groups.plantationPhaseId': plantationPhaseId, 'plantation_groups.isActive': true, 'plantation_groups.orgId': orgId
          })
          .whereIn('plantation_groups.companyId', companyArr1)
          .groupBy(['plantation_groups.id'])
          .orderBy('plantation_groups.code', 'asc')
      }


      return res.status(200).json({
        data: {
          floor
        },
        message: "Plantation Group list"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getPlantationGroupListByPhaseIdHavingPropertyUnits] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationGroupListByPhaseIdHavingPropertyUnitsAndWithoutUnits: async (req, res) => {
    try {
      let orgId = req.orgId;

      const { plantationPhaseId } = req.body;

      let floor;

      companyHavingPlantations = await knexReader('plantation_groups').select(['companyId']).where({ orgId: req.orgId, isActive: true })
      companyArr1 = companyHavingPlantations.map(v => v.companyId)

      if (req.query.areaName === 'common') {
        if (plantationPhaseId) {
          floor = await knexReader("plantation_groups")
            .leftJoin('plant_containers', 'plantation_groups.id', 'plant_containers.plantationGroupId')
            .select("plantation_groups.*")
            .where({
              'plantation_groups.plantationPhaseId': plantationPhaseId, 'plantation_groups.isActive': true, 'plantation_groups.orgId': orgId
            })
            .whereIn('plantation_groups.companyId', companyArr1)
            .groupBy(['plantation_groups.id'])
            .orderBy('plantation_groups.code', 'asc')

        } else {
          floor = await knexReader("plantation_groups")
            .leftJoin('plant_containers', 'plantation_groups.id', 'plant_containers.plantationGroupId')
            .select([
              'plantation_groups.code as code',
              'plantation_groups.id as id'
            ])
            .where({ isActive: true, orgId: orgId })
            .whereIn('plantation_groups.companyId', companyArr1)
            .groupBy(['plantation_groups.id'])
            .orderBy('plantation_groups.code', 'asc')


        }

      } else {
        floor = await knexReader("plantation_groups")
          .leftJoin('plant_containers', 'plantation_groups.id', 'plant_containers.plantationGroupId')
          .select("plantation_groups.*")
          .where({
            'plantation_groups.plantationPhaseId': plantationPhaseId, 'plantation_groups.isActive': true, 'plantation_groups.orgId': orgId
          })
          .whereIn('plantation_groups.companyId', companyArr1)
          .groupBy(['plantation_groups.id'])
          .orderBy('plantation_groups.code', 'asc')

      }


      return res.status(200).json({
        data: {
          floor
        },
        message: "Plantation Group list"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getPlantationGroupListByPhaseIdHavingPropertyUnitsAndWithoutUnits] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  //
  getPlantationGroupsForCompany: async (req, res) => {
    try {

      let resourcePlantations = req.userPlantationResources[0].plantations;
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "plantation_groups.code";
        sortPayload.orderBy = "asc"
      }
      let orgId = req.orgId;

      let { companyId } = req.body;
      //console.log('getPlantationGroupsForCompany: ', companyId, req.body, sortPayload);

      let rows = await knexReader
        .from("plantation_groups")
        .leftJoin("companies", "plantation_groups.companyId", "companies.id")
        .leftJoin("plantation_phases", "plantation_groups.plantationPhaseId", "plantation_phases.id")
        .leftJoin("plantations", "plantation_groups.plantationId", "plantations.id")
        .select([
          "plantation_groups.id",
          "plantation_groups.code",
          "plantation_groups.description",
          "plantation_groups.area",
          "plantation_groups.isActive",
          "plantations.id as plantationId",
          "plantations.code as plantationCode",
          "plantations.name as plantationName",
          "plantation_phases.id as plantationPhaseId",
          "plantation_phases.code as plantationPhaseCode",
          "plantation_phases.description as plantationPhaseDescription",
        ])
        .where({ "plantation_phases.isActive": true })
        .where({ "plantation_groups.orgId": orgId })
        .where({ "plantation_groups.companyId": companyId })
        .whereIn('plantation_groups.plantationId', resourcePlantations)
        .orderBy(sortPayload.sortBy, sortPayload.orderBy)

      return res.status(200).json({
        data: {
          records: rows
        },
        message: "Company Plantation Group List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationGroupForCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  //

};

module.exports = plantationGroupController;
