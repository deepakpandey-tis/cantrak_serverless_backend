const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const fs = require('fs');
const path = require('path');

const commonAreaController = {
  // Add New Common Area //

  addCommonArea: async (req, res) => {
    try {
      let commonArea = null;
      let orgId = req.orgId;
      let userId = req.me.id;

      await knex.transaction(async trx => {
        let commonPayload = _.omit(req.body, ['propertyTypeId']);

        const schema = Joi.object().keys({
          type:Joi.number().required(),
          companyId: Joi.number().required(),
          projectId: Joi.number().required(),
          propertyTypeId: Joi.number().allow("").optional(),
          buildingPhaseId: Joi.number().required(),
          floorZoneId: Joi.number().required(),
          unitNumber: Joi.string().required(),
          description: Joi.string().allow("").optional()
        });

        const result = Joi.validate(commonPayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATON_ERRORS", message: result.error.message }
            ]
          });
        }

        const existunitNumber = await knex("property_units").where({
          unitNumber: req.body.unitNumber,
          orgId: orgId,
          type:2,
          floorZoneId: commonPayload.floorZoneId
        });

        console.log(
          "[controllers][commonArea][addcommonArea]: Common Are Code",
          existunitNumber
        );

        // Return error when username exist

        if (existunitNumber && existunitNumber.length) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Common Area code already exist!!" }
            ]
          });
        }

        /*GET PROPERTY TYPE ID OPEN */
        let buildingData = await knex('buildings_and_phases')
          .select('propertyTypeId')
          .where({ id: commonPayload.buildingPhaseId }).first();
        let propertyType = buildingData.propertyTypeId;
        /*GET PROPERTY TYPE ID OPEN */

        // Insert in common area table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...commonPayload,
          unitNumber: req.body.unitNumber.toUpperCase(),
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime,
          createdBy: userId,
          orgId: orgId,
          propertyTypeId: propertyType,
          type:2
        };

        console.log(
          "[controllers][commonArea][addcommonArea]: Insert Data",
          insertData
        );

        const commonAreaResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("property_units");

        commonArea = commonAreaResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          commonAreaRes: commonArea
        }
      });
    } catch (err) {
      console.log("[controllers][generalsetup][addservice] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Update Common Area //

  updateCommonArea: async (req, res) => {
    try {
      let updateComPayload = null;
      let orgId = req.orgId;
      let userId = req.me.id;


      await knex.transaction(async trx => {
        let commonUpdatePaylaod = _.omit(req.body, 'propertyTypeId');

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          companyId: Joi.number().required(),
          projectId: Joi.number().required(),
          propertyTypeId: Joi.number().allow("").optional(),
          buildingPhaseId: Joi.number().required(),
          floorZoneId: Joi.number().required(),
          unitNumber: Joi.string().required(),
          description: Joi.string().allow("").allow(null).optional()
        });

        const result = Joi.validate(commonUpdatePaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existunitNumber = await knex("common_area")
          .where({
            unitNumber: commonUpdatePaylaod.unitNumber,
            orgId: orgId,
            floorZoneId: commonUpdatePaylaod.floorZoneId
          })
          .whereNot({ id: commonUpdatePaylaod.id });

        console.log(
          "[controllers][commonArea][addcommonArea]: Common Are Code",
          existunitNumber
        );

        //Return error when username exist

        if (existunitNumber && existunitNumber.length) {
          return res.status(400).json({
            errors: [
              {
                code: "COMMON_AREA_CODE_EXIST_ERROR",
                message: "Common Area Code already exist !"
              }
            ]
          });
        }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        /*GET PROPERTY TYPE ID OPEN */
        let buildingData = await knex('buildings_and_phases')
          .select('propertyTypeId')
          .where({ id: commonUpdatePaylaod.buildingPhaseId }).first();
        let propertyType = buildingData.propertyTypeId;
        /*GET PROPERTY TYPE ID OPEN */
        const updateDataResult = await knex
          .update({
            unitNumber: commonUpdatePaylaod.unitNumber.toUpperCase(),
            companyId: commonUpdatePaylaod.companyId,
            projectId: commonUpdatePaylaod.projectId,
            propertyTypeId: propertyType,
            buildingPhaseId: commonUpdatePaylaod.buildingPhaseId,
            floorZoneId: commonUpdatePaylaod.floorZoneId,
            description: commonUpdatePaylaod.description,
            updatedAt: currentTime
          })
          .where({
            id: commonUpdatePaylaod.id,
            //createdBy: userId,
            //orgId: orgId
          })
          .returning(["*"])
          .transacting(trx)
          .into("common_area");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][commonArea][updatecommonArea]: Update Data",
          updateDataResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        updateComPayload = updateDataResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          commonArea: updateComPayload
        },
        message: "Common Area updated successfully !"
      });
    } catch (err) {
      console.log("[controllers][commonArea][updatecommonArea] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Get List of Common Area

  getCommonAreaList: async (req, res) => {
    try {

      let resourceProject = req.userProjectResources[0].projects;
      
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "property_units.unitNumber";
        sortPayload.orderBy = "asc",
        type = 2
      }

      let reqData = req.query;
      let total = null;
      let rows = null;
      let { companyId,
        projectId,
        buildingPhaseId,
        floorZoneId,
        unitNumber
      } = req.body;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let orgId = req.orgId;
      let userId = req.me.id;


      if (companyId || projectId || buildingPhaseId || floorZoneId || unitNumber) {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("property_units")
            // .from("common_area")
            .leftJoin(
              "floor_and_zones",
              "property_units.floorZoneId",
              // "common_area.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "property_units.buildingPhaseId",
              // "common_area.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "property_units.projectId", "projects.id")
            .leftJoin("users", "property_units.createdBy", "users.id")
            .where({ "floor_and_zones.isActive": true })
            .where({ "property_units.orgId": orgId,type:2 })
            .where(qb => {
              if (companyId) {
                qb.where('property_units.companyId', companyId)
              }

              if (projectId) {
                qb.where('property_units.projectId', projectId)
              }

              if (buildingPhaseId) {
                qb.where('property_units.buildingPhaseId', buildingPhaseId)
              }

              if (floorZoneId) {
                qb.where('property_units.floorZoneId', floorZoneId)
              }

              if (unitNumber) {
                qb.where('property_units.unitNumber', 'iLIKE', `%${unitNumber}%`)
              }
            })
            .whereIn('property_units.projectId',resourceProject)
          ,
          knex("property_units")
            .leftJoin(
              "floor_and_zones",
              "property_units.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "property_units.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "property_units.projectId", "projects.id")
            .leftJoin("users", "property_units.createdBy", "users.id")
            .where({ "floor_and_zones.isActive": true })
            .select([
              "property_units.id as id",
              "property_units.unitNumber as Common Area",
              "floor_and_zones.floorZoneCode as Floor",
              "buildings_and_phases.buildingPhaseCode as Building",
              "projects.projectName as Project",
              "property_units.isActive as Status",
              "users.name as Created By",
              "property_units.createdAt as Date Created",
              "projects.project as projectCode"
            ])
            .offset(offset)
            .limit(per_page)
            .where({ "property_units.orgId": orgId,type:2 })
            .where(qb => {
              if (companyId) {
                qb.where('property_units.companyId', companyId)
              }

              if (projectId) {
                qb.where('property_units.projectId', projectId)
              }

              if (buildingPhaseId) {
                qb.where('property_units.buildingPhaseId', buildingPhaseId)
              }

              if (floorZoneId) {
                qb.where('property_units.floorZoneId', floorZoneId)
              }

              if (unitNumber) {
                qb.where('property_units.unitNumber', 'iLIKE', `%${unitNumber}%`)
              }
            })
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .whereIn('property_units.projectId',resourceProject)
        ]);
      } else {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("property_units")
            .leftJoin(
              "floor_and_zones",
              "property_units.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "property_units.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "property_units.projectId", "projects.id")
            .leftJoin("users", "property_units.createdBy", "users.id")
            .where({ "floor_and_zones.isActive": true })
            .where({ "property_units.orgId": orgId,type:2 })
            .whereIn('property_units.projectId',resourceProject)
            ,
          knex("property_units")
            .leftJoin(
              "floor_and_zones",
              "property_units.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "property_units.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "property_units.projectId", "projects.id")
            .leftJoin("users", "property_units.createdBy", "users.id")
            .where({ "floor_and_zones.isActive": true })
            .where({ "property_units.orgId": orgId,type:2 })
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .select([
              "property_units.id as id",
              "property_units.unitNumber as Common Area",
              "floor_and_zones.floorZoneCode as Floor",
              "buildings_and_phases.buildingPhaseCode as Building",
              "projects.projectName as Project",
              "property_units.isActive as Status",
              "users.name as Created By",
              "property_units.createdAt as Date Created",
              "projects.project as projectCode"
            ])
            .whereIn('property_units.projectId',resourceProject)
            .offset(offset)
            .limit(per_page)
        ]);
      }

      let count = total[0].count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows;

      res.status(200).json({
        data: {
          commonAreaLists: pagination
        },
        message: "Common Area list successfully !"
      });
    } catch (err) {
      console.log("[controllers][commonArea][getcommonArea] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Delete Common Area //

  deleteCommonArea: async (req, res) => {
    try {
      let delCommonPayload = null;
      let message;
      await knex.transaction(async trx => {
        let delcommonAreaPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(delcommonAreaPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const validCommonAreaId = await knex("property_units").where({
          id: delcommonAreaPaylaod.id,
          type:2
        });

        console.log(
          "[controllers][commonArea][deletecommonArea]: Common Area Code",
          validCommonAreaId
        );

        let updateDataResult;
        if (validCommonAreaId && validCommonAreaId.length) {
          const currentTime = new Date().getTime();

          if (validCommonAreaId[0].isActive == true) {

            updateDataResult = await knex
              .update({
                isActive: false,
                updatedAt: currentTime
              })
              .where({
                id: delcommonAreaPaylaod.id,
                type:2
              })
              .returning(["*"])
              .transacting(trx)
              .into("property_units");

            console.log(
              "[controllers][commonArea][delcommonArea]: Delete Data",
              updateDataResult
            );
            updateComPayload = updateDataResult[0];
            message = "Common area deactivate successfully!"
          } else {

            updateDataResult = await knex
              .update({
                isActive: true,
                updatedAt: currentTime
              })
              .where({
                id: delcommonAreaPaylaod.id
              })
              .returning(["*"])
              .transacting(trx)
              .into("property_units");

            console.log(
              "[controllers][commonArea][delcommonArea]: Delete Data",
              updateDataResult
            );
            updateComPayload = updateDataResult[0];
            message = "Common area activate successfully!"
          }

        } else {
          return res.status(400).json({
            errors: [
              {
                code: "COMMON_AREA_ID_DOES_NOT_EXIST_ERROR",
                message: "Id does not exist!!"
              }
            ]
          });
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          commonArea: updateComPayload
        },
        message: message
      });
    } catch (err) {
      console.log("[controllers][commonArea][updatecommonArea] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Details View Common Area //

  getdetailsCommonArea: async (req, res) => {
    try {
      let viewCommonPayload = null;
      let orgId = req.orgId;


      await knex.transaction(async trx => {
        let viewcommonAreaPayload = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(viewcommonAreaPayload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const validCommonAreaId = await knex("property_units").where({
          id: viewcommonAreaPayload.id
        });

        console.log(
          "[controllers][commonArea][viewcommonArea]: Common Area Code",
          validCommonAreaId
        );

        // Return error when username exist

        if (validCommonAreaId && validCommonAreaId.length) {
          DataResult = await knex("property_units")
            .leftJoin("companies", "property_units.companyId", "=", "companies.id")
            .leftJoin("projects", "property_units.projectId", "=", "projects.id")
            .leftJoin(
              "property_types",
              "property_units.propertyTypeId",
              "=",
              "property_types.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "property_units.buildingPhaseId",
              "=",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "property_units.floorZoneId",
              "=",
              "floor_and_zones.id"
            )
            .select(
              "companies.companyName",
              "companies.companyId as compId",
              "projects.projectName",
              "property_types.propertyType",
              "buildings_and_phases.buildingPhaseCode",
              "floor_and_zones.floorZoneCode",
              "property_units.*"
            )
            .where({ "property_units.id": viewcommonAreaPayload.id, "property_units.orgId": orgId,type:2 });

          console.log(
            "[controllers][commonArea][commonareadetails]: View Data",
            DataResult
          );

          //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

          DataResult = _.omit(DataResult[0]);

          generalDetails = DataResult;
        } else {
          return res.status(400).json({
            errors: [
              {
                code: "property_units_ID_DOES_NOT_EXIST_ERROR",
                message: "Id does not exist!"
              }
            ]
          });
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          commonArea: generalDetails
        },
        message: "Common Area view details !"
      });
    } catch (err) {
      console.log("[controllers][commonArea][updatecommonArea] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
    // Export Common Area Data
  },
  exportCommonArea: async (req, res) => {
    try {
      let reqData = req.query;
      let rows = null;
      let companyId = req.query.companyId;
      let orgId = req.orgId;

      if (companyId) {
        [rows] = await Promise.all([
          knex("property_units")
            .leftJoin(
              "floor_and_zones",
              "property_units.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "property_units.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "property_units.projectId", "projects.id")
            .leftJoin(
              "companies",
              "property_units.companyId",
              "companies.id"
            )
            .leftJoin("property_types", "property_units.propertyTypeId", "property_types.id")
            .select([
              "companies.companyId as COMPANY",
              "projects.project as PROJECT",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              "floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
              "property_units.unitNumber as UNIT_NUMBER",
              "property_units.description as DESCRIPTION",
            ])
            .where({ "property_units.companyId": companyId, "property_units.orgId": orgId,type:2 })
            .where({ "floor_and_zones.isActive": true })
        ]);
      } else {
        [rows] = await Promise.all([
          knex("property_units")
            .leftJoin(
              "floor_and_zones",
              "property_units.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "property_units.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "property_units.projectId", "projects.id")
            .leftJoin(
              "companies",
              "property_units.companyId",
              "companies.id"
            )
            .leftJoin("property_types", "property_units.propertyTypeId", "property_types.id")
            .select([
              "companies.companyId as COMPANY",
              "projects.project as PROJECT",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              "floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
              "property_units.unitNumber as UNIT_NUMBER",
              "property_units.description as DESCRIPTION",
            ])
            .where({ "property_units.orgId": orgId,type:2 })
            .where({ "floor_and_zones.isActive": true })
        ]);
      }

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = 'sls-app-resources-bucket';
        tempraryDirectory = 'tmp/';
      } else {
        tempraryDirectory = '/tmp/';
        bucketName = process.env.S3_BUCKET_NAME;
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });

      var ws

      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            COMPANY: "",
            PROJECT: "",
            PROPERTY_TYPE_CODE: "",
            BUILDING_PHASE_CODE: "",
            FLOOR_ZONE_CODE: "",
            COMMON_AREA_CODE: "",
            DESCRIPTION: "",
          }
        ]);
      }


      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "CommonAreaData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/CommonArea/" + filename,
          Body: file_buffer,
          ACL: 'public-read'
        }
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/CommonArea/" + filename;
            res.status(200).json({
              data: rows,
              message: "Common Area Data Export Successfully !",
              url: url
            });
          }
        });
      })
      //let deleteFile   = await fs.unlink(filepath,(err)=>{ console.log("File Deleting Error "+err) })


    } catch (err) {
      console.log("[controllers][commonArea][getcommonArea] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**IMPORT COMMON AREA DATA */
  importCommonAreaData: async (req, res) => {

    try {
      let data = req.body;
      console.log("data============", data, "Data===========")
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)
      //console.log('DATA: ',data)
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      if (
        data[0].A == "Ã¯Â»Â¿COMPANY" || data[0].A == "COMPANY" &&
        data[0].B == "PROJECT" &&
        data[0].C == "PROPERTY_TYPE_CODE" &&
        data[0].D == "BUILDING_PHASE_CODE" &&
        data[0].E == "FLOOR_ZONE_CODE" &&
        data[0].F == "UNIT_NUMBER" &&
        data[0].G == "DESCRIPTION"
      ) {
        if (data.length > 0) {
          let i = 0;
          console.log('Data[0]', data[0])
          for (let commonData of data) {

            i++;

            if (i > 1) {


              if (!commonData.A) {
                let values = _.values(commonData)
                values.unshift('Company Id can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!commonData.B) {
                let values = _.values(commonData)
                values.unshift('Project Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!commonData.C) {
                let values = _.values(commonData)
                values.unshift('Property type Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!commonData.D) {
                let values = _.values(commonData)
                values.unshift('Building phase Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!commonData.E) {
                let values = _.values(commonData)
                values.unshift('Floor zone Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!commonData.F) {
                let values = _.values(commonData)
                values.unshift('Unit Number can not be empty!')
                errors.push(values);
                fail++;
                continue;
              }


              // Find Company primary key
              let companyId = null;
              let projectId = null;
              let propertyTypeId = null;
              let buildingPhaseId = null;
              let floorZoneId = null;

              let companyIdResult = await knex('companies').select('id').where({ companyId: commonData.A, orgId: req.orgId })

              if (companyIdResult && companyIdResult.length) {
                companyId = companyIdResult[0].id;
              }

              let projectIdResult = await knex("projects")
                .select("id")
                .where({ project: commonData.B, companyId: companyId, orgId: req.orgId });

              if (projectIdResult && projectIdResult.length) {
                projectId = projectIdResult[0].id;
              }

              let propertyTypeIdResult = await knex("property_types")
                .select("id")
                .where({ propertyTypeCode: commonData.C, orgId: req.orgId });

              let buildingResult = await knex("buildings_and_phases")
                .select("id")
                .where({
                  buildingPhaseCode: commonData.D,
                  companyId: companyId,
                  projectId: projectId,
                  orgId: req.orgId
                });

              if (buildingResult && buildingResult.length) {
                buildingPhaseId = buildingResult[0].id;
              }

              let floorResult = await knex("floor_and_zones")
                .select("id")
                .where({
                  floorZoneCode: commonData.E,
                  orgId: req.orgId,
                  buildingPhaseId: buildingPhaseId,
                  companyId: companyId,
                  projectId: projectId
                });

              if (propertyTypeIdResult && propertyTypeIdResult.length) {
                propertyTypeId = propertyTypeIdResult[0].id;
              }

              if (!companyId) {
                fail++;
                let values = _.values(commonData)
                values.unshift('Company ID does not exists.')
                errors.push(values);
                console.log('breaking due to Company Id: ', companyId)
                continue;

              }

              if (!projectId) {
                fail++;
                let values = _.values(commonData)
                values.unshift('Project Id does not exists.')
                errors.push(values);
                console.log("breaking due to Project Id: ", projectId);
                continue;
              }

              if (!propertyTypeId) {
                fail++;
                let values = _.values(commonData)
                values.unshift('Property type does not exists.')
                errors.push(values);
                console.log("breaking due to Property type id: ", propertyTypeId);
                continue;
              }



              if (!buildingPhaseId) {
                fail++;
                let values = _.values(commonData)
                values.unshift('Building/Phase Code does not exists.')
                errors.push(values);
                console.log("breaking due to building phase id: ", buildingPhaseId);
                continue;
              }
              if (floorResult && floorResult.length) {
                floorZoneId = floorResult[0].id;
              }
              if (!floorZoneId) {
                fail++;
                let values = _.values(commonData)
                values.unshift('Floor/Zone code does not exists.')
                errors.push(values);
                console.log("breaking due to Floor zone id: ", floorZoneId);
                continue;
              }

              let currentTime = new Date().getTime()
              let checkExist = await knex("property_units")
                .select("unitNumber")
                .where({
                  //companyId: companyId,
                  // projectId: projectId,
                  // propertyTypeId: propertyTypeId,
                  // buildingPhaseId: buildingPhaseId,
                  floorZoneId: floorZoneId,
                  unitNumber: commonData.F,
                  orgId: req.orgId
                });
              if (checkExist.length < 1) {
                let insertData = {
                  orgId: req.orgId,
                  companyId: companyId,
                  projectId: projectId,
                  propertyTypeId: propertyTypeId,
                  buildingPhaseId: buildingPhaseId,
                  floorZoneId: floorZoneId,
                  unitNumber: commonData.F,
                  description: commonData.G,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  createdBy: req.me.id,
                  type:2
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("property_units");
                if (resultData && resultData.length) {
                  success++;
                }

              } else {
                fail++;
                let values = _.values(commonData)
                values.unshift('Common area already exists.')
                errors.push(values);
              }
            }
          }

          let message = null;
          if (totalData == success) {
            message = "System have processed ( " + totalData + " ) entries and added them successfully!";
          } else {
            message = "System have processed ( " + totalData + " ) entries out of which only ( " + success + " ) are added and others are failed ( " + fail + " ) due to validation!";
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
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**GET ALL LIST COMMON AREA BY FLOOR ID */
  getCommonAreaAllList: async (req, res) => {

    try {
      let orgId = req.orgId;
      let floorId = req.query.floorId;
      let result = await knex('property_units').where({ isActive: true, 'floorZoneId': floorId, orgId: orgId,type:2 });

      return res.status(200).json({
        data: result,
        message: "Common Area List",
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = commonAreaController;
