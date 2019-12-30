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
        let commonPayload = req.body;

        const schema = Joi.object().keys({
          companyId: Joi.number().required(),
          projectId: Joi.number().required(),
          propertyTypeId: Joi.number().required(),
          buildingPhaseId: Joi.number().required(),
          floorZoneId: Joi.number().required(),
          commonAreaCode: Joi.string().required(),
          description: Joi.string().required()
        });

        const result = Joi.validate(commonPayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATON_ERRORS", message: result.error.message }
            ]
          });
        }

        const existCommonAreaCode = await knex("common_area").where({
          commonAreaCode: commonPayload.commonAreaCode
        });

        console.log(
          "[controllers][commonArea][addcommonArea]: Common Are Code",
          existCommonAreaCode
        );

        // Return error when username exist

        if (existCommonAreaCode && existCommonAreaCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "COMMON_AREA_CODE_EXIST_ERROR",
                message: "Common Area Code already exist !"
              }
            ]
          });
        }

        // Insert in common area table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...commonPayload,
          commonAreaCode: commonPayload.commonAreaCode.toUpperCase(),
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime,
          createdBy: userId,
          orgId: orgId
        };

        console.log(
          "[controllers][commonArea][addcommonArea]: Insert Data",
          insertData
        );

        const commonAreaResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("common_area");

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
        let commonUpdatePaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          companyId: Joi.number().required(),
          projectId: Joi.number().required(),
          propertyTypeId: Joi.number().required(),
          buildingPhaseId: Joi.number().required(),
          floorZoneId: Joi.number().required(),
          commonAreaCode: Joi.string().required(),
          description: Joi.string().required()
        });

        const result = Joi.validate(commonUpdatePaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existCommonAreaCode = await knex("common_area")
          .where({
            commonAreaCode: commonUpdatePaylaod.commonAreaCode.toUpperCase()
          })
          .whereNot({ id: commonUpdatePaylaod.id });

        console.log(
          "[controllers][commonArea][addcommonArea]: Common Are Code",
          existCommonAreaCode
        );

        // Return error when username exist

        if (existCommonAreaCode && existCommonAreaCode.length) {
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
        const updateDataResult = await knex
          .update({
            commonAreaCode: commonUpdatePaylaod.commonAreaCode.toUpperCase(),
            companyId: commonUpdatePaylaod.companyId,
            projectId: commonUpdatePaylaod.projectId,
            propertyTypeId: commonUpdatePaylaod.propertyTypeId,
            buildingPhaseId: commonUpdatePaylaod.buildingPhaseId,
            floorZoneId: commonUpdatePaylaod.floorZoneId,
            description: commonUpdatePaylaod.description,
            updatedAt: currentTime
          })
          .where({
            id: commonUpdatePaylaod.id,
            createdBy: userId,
            orgId: orgId
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
      let reqData = req.query;
      let total = null;
      let rows = null;
      let companyId = reqData.companyId;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let orgId = req.orgId;
      let userId = req.me.id;


      if (companyId) {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("common_area")
            .leftJoin(
              "floor_and_zones",
              "common_area.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "common_area.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "common_area.projectId", "projects.id")
            .offset(offset)
            .limit(per_page)
            .where({ "common_area.companyId": companyId, "common_area.orgId": orgId }),
          knex("common_area")
            .leftJoin(
              "floor_and_zones",
              "common_area.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "common_area.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "common_area.projectId", "projects.id")
            .select([
              "common_area.id as id",
              "common_area.commonAreaCode as Common Area",
              "floor_and_zones.floorZoneCode as Floor",
              "buildings_and_phases.buildingPhaseCode as Building",
              "projects.projectName as Project",
              "common_area.isActive as Status",
              "common_area.createdBy as Created By",
              "common_area.createdAt as Date Created"
            ])
            .offset(offset)
            .limit(per_page)
            .where({ "common_area.companyId": companyId, "common_area.orgId": orgId })
        ]);
      } else {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("common_area")
            .leftJoin(
              "floor_and_zones",
              "common_area.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "common_area.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "common_area.projectId", "projects.id")
            .where({ "common_area.orgId": orgId }),
          knex("common_area")
            .leftJoin(
              "floor_and_zones",
              "common_area.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "common_area.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "common_area.projectId", "projects.id")
            .where({ "common_area.orgId": orgId })
            .select([
              "common_area.id as id",
              "common_area.commonAreaCode as Common Area",
              "floor_and_zones.floorZoneCode as Floor",
              "buildings_and_phases.buildingPhaseCode as Building",
              "projects.projectName as Project",
              "common_area.isActive as Status",
              "common_area.createdBy as Created By",
              "common_area.createdAt as Date Created"
            ])
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

        const validCommonAreaId = await knex("common_area").where({
          id: delcommonAreaPaylaod.id
        });

        console.log(
          "[controllers][commonArea][deletecommonArea]: Common Area Code",
          validCommonAreaId
        );

        // Return error when username exist

        if (validCommonAreaId && validCommonAreaId.length) {
          // Insert in users table,
          const currentTime = new Date().getTime();
          //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

          //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
          const updateDataResult = await knex
            .update({
              isActive: "false",
              updatedAt: currentTime
            })
            .where({
              id: delcommonAreaPaylaod.id
            })
            .returning(["*"])
            .transacting(trx)
            .into("common_area");

          console.log(
            "[controllers][commonArea][delcommonArea]: Delete Data",
            updateDataResult
          );

          //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

          updateComPayload = updateDataResult[0];
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
        message: "Common Area deleted successfully !"
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

        const validCommonAreaId = await knex("common_area").where({
          id: viewcommonAreaPayload.id
        });

        console.log(
          "[controllers][commonArea][viewcommonArea]: Common Area Code",
          validCommonAreaId
        );

        // Return error when username exist

        if (validCommonAreaId && validCommonAreaId.length) {
          DataResult = await knex("common_area")
            .leftJoin("companies", "common_area.companyId", "=", "companies.id")
            .leftJoin("projects", "common_area.projectId", "=", "projects.id")
            .leftJoin(
              "property_types",
              "common_area.propertyTypeId",
              "=",
              "property_types.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "common_area.buildingPhaseId",
              "=",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "common_area.floorZoneId",
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
              "common_area.*"
            )
            .where({ "common_area.id": viewcommonAreaPayload.id, "common_area.orgId": orgId });

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
                code: "COMMON_AREA_ID_DOES_NOT_EXIST_ERROR",
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
          knex("common_area")
            .leftJoin(
              "floor_and_zones",
              "common_area.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "common_area.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "common_area.projectId", "projects.id")
            .leftJoin(
              "companies",
              "common_area.companyId",
              "companies.id"
            )
            .leftJoin("property_types", "common_area.propertyTypeId", "property_types.id")
            .select([
              "companies.companyId as COMPANY",
              "projects.project as PROJECT",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              "floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
              "common_area.commonAreaCode as COMMON_AREA_CODE",
              "common_area.description as DESCRIPTION",
            ])
            .where({ "common_area.companyId": companyId, "common_area.orgId": orgId })
        ]);
      } else {
        [rows] = await Promise.all([
          knex("common_area")
            .leftJoin(
              "floor_and_zones",
              "common_area.floorZoneId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "common_area.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("projects", "common_area.projectId", "projects.id")
            .leftJoin(
              "companies",
              "common_area.companyId",
              "companies.id"
            )
            .leftJoin("property_types", "common_area.propertyTypeId", "property_types.id")
            .select([
              "companies.companyId as COMPANY",
              "projects.project as PROJECT",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              "floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
              "common_area.commonAreaCode as COMMON_AREA_CODE",
              "common_area.description as DESCRIPTION",
            ])
            .where({ "common_area.orgId": orgId })
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
      var ws = XLSX.utils.json_to_sheet(rows);
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
          }
        });
      })
      //let deleteFile   = await fs.unlink(filepath,(err)=>{ console.log("File Deleting Error "+err) })

      let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/CommonArea/" + filename;
      res.status(200).json({
        data: rows,
        message: "Common Area Data Export Successfully !",
        url: url
      });
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
        console.log("data============", data, "Data===========")
        let result = null;
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
          data[0].F == "COMMON_AREA_CODE" &&
          data[0].G == "DESCRIPTION"
        ) {
          if (data.length > 0) {
            let i = 0;
            console.log('Data[0]', data[0])
            for (let commonData of data) {
              // Find Company primary key
              let companyId = null;
              let projectId = null;
              let propertyTypeId = null;
              let buildingPhaseId = null;
              let floorZoneId = null;


              let companyIdResult = await knex('companies').select('id').where({ companyId: commonData.A, orgId: req.orgId })

              let projectIdResult = await knex("projects")
                .select("id")
                .where({ project: commonData.B, orgId: req.orgId });

              let propertyTypeIdResult = await knex("property_types")
                .select("id")
                .where({ propertyTypeCode: commonData.C, orgId: req.orgId });

              let buildingResult = await knex("buildings_and_phases")
                .select("id")
                .where({ buildingPhaseCode: commonData.D, orgId: req.orgId });

              let floorResult = await knex("floor_and_zones")
                .select("id")
                .where({ floorZoneCode: commonData.E, orgId: req.orgId });

              if (propertyTypeIdResult && propertyTypeIdResult.length) {
                propertyTypeId = propertyTypeIdResult[0].id;
              }
              if (!propertyTypeId) {
                fail++;
                console.log("breaking due to Property type id: ", propertyTypeId);
                continue;
              }

              if (companyIdResult && companyIdResult.length) {
                companyId = companyIdResult[0].id;
              }
              if (!companyId) {
                fail++;
                console.log('breaking due to Company Id: ', companyId)
                continue;

              }
              if (projectIdResult && projectIdResult.length) {
                projectId = projectIdResult[0].id;
              }
              if (!projectId) {
                fail++;
                console.log("breaking due to Project Id: ", projectId);
                continue;
              }
              if (buildingResult && buildingResult.length) {
                buildingPhaseId = buildingResult[0].id;
              }
              if (!buildingPhaseId) {
                fail++;
                console.log("breaking due to building phase id: ", buildingPhaseId);
                continue;
              }
              if (floorResult && floorResult.length) {
                floorZoneId = floorResult[0].id;
              }
              if (!floorZoneId) {
                fail++;
                console.log("breaking due to Floor zone id: ", floorZoneId);
                continue;
              }

              i++;

              if (i > 1) {
                let currentTime = new Date().getTime()
                let checkExist = await knex("common_area")
                  .select("commonAreaCode")
                  .where({
                    companyId: companyId,
                    projectId: projectId,
                    propertyTypeId: propertyTypeId,
                    buildingPhaseId: buildingPhaseId,
                    floorZoneId: floorZoneId,
                    commonAreaCode: commonData.F,
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
                    commonAreaCode: commonData.F,
                    description: commonData.G,
                    createdAt: currentTime,
                    updatedAt: currentTime
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("common_area");
                  if (resultData && resultData.length) {
                    success++;
                  }

                } else {
                  fail++;
                }
              }
            }

            let message = null;
            if (totalData == success) {
              message = "System have processed ( " + totalData + " ) entries and added them successfully!";
            } else {
              message = "System have processed ( " + totalData + " ) entries out of which only ( " + success + " ) are added and others are failed ( " + fail + " ) due to validation!";
            }
            let deleteFile = await fs.unlink(file_path, (err) => { console.log("File Deleting Error " + err) })
            return res.status(200).json({
              message: message,
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
  /**GET ALL LIST COMMON AREA BY FLOOR ID */
  getCommonAreaAllList:async (req,res)=>{
   
    try{
      let orgId   = req.orgId;
      let floorId = req.query.floorId;
      let result  = await knex('common_area').where({isActive:true,'floorZoneId':floorId,orgId:orgId});

      return res.status(200).json({
        data:result,
        message:"Common Area List",
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = commonAreaController;
