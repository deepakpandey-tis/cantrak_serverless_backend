const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const fs = require("fs");
const path = require("path");
const request = require("request");

const buildingPhaseController = {
  addBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseCode: Joi.string().required(),
          description: Joi.string().allow("").optional(),
          buildingAddressEng: Joi.string().allow("").optional(),
          buildingAddressThai: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addbuildingPhase]: JOi Result",
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
         let existValue = await knex('buildings_and_phases')
         .where({ buildingPhaseCode: payload.buildingPhaseCode, orgId: orgId });
       if (existValue && existValue.length) {
         return res.status(400).json({
           errors: [
             { code: "VALIDATION_ERROR", message: "Building Phase code already exist!!" }
           ]
         });
       }
       /*CHECK DUPLICATE VALUES CLOSE */


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
          .into("buildings_and_phases");
        buildingPhase = insertResult[0];
        trx.commit;
      });

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: "Building Phase added successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][addbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateBuildingPhase: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;

      let buildingPhase = null;
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseCode: Joi.string().required(),
          description: Joi.string().allow("").optional(),
          buildingAddressEng: Joi.string().allow("").optional(),
          buildingAddressThai: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updatebuildingPhase]: JOi Result",
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
          .where({ id: payload.id, orgId: orgId, createdBy: userId })
          .returning(["*"])
          .transacting(trx)
          .into("buildings_and_phases");
        buildingPhase = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: "Building Phase details updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][updatebuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null;
      await knex.transaction(async trx => {
        let payload = req.body;
        let orgId = req.orgId;

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

        let buildingPhaseResult = await knex("buildings_and_phases")
          .innerJoin(
            "companies",
            "buildings_and_phases.companyId",
            "companies.id"
          )
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
          .select(
            "buildings_and_phases.*",
            "companies.companyName as companyName",
            "companies.companyId as compId",
            "companies.id as companyId",
            "projects.projectName",
            "property_types.propertyTypeCode"
          )
          .where({
            "buildings_and_phases.id": payload.id,
            "buildings_and_phases.orgId": orgId
          });

        buildingPhase = _.omit(buildingPhaseResult[0], [
          "buildings_and_phases.createdAt",
          "buildings_and_phases.updatedAt",
          "buildings_and_phases.isActive"
        ]);

        trx.commit;
      });

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: "Building Phase details"
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
  deleteBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null;
      await knex.transaction(async trx => {
        let payload = req.body;
        let orgId = req.orgId;

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

        let buildingPhaseResult = await knex
          .update({ isActive: false })
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("buildings_and_phases");
        buildingPhase = buildingPhaseResult[0];
        trx.commit;
      });

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: "Building Phase deleted!"
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
  getBuildingPhaseList: async (req, res) => {
    try {
      let orgId = req.orgId;
      let companyId = req.body.companyId;
      let projectId = req.query.projectId;
      let reqData = req.query;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("buildings_and_phases")
            .leftJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .leftJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .leftJoin(
              "users",
              "buildings_and_phases.createdBy",
              "users.id"
            )
            .leftJoin(
              "property_types",
              "buildings_and_phases.propertyTypeId",
              "property_types.id"
            )
            .where({
              "buildings_and_phases.orgId": orgId,
              "buildings_and_phases.isActive": true
            })
            .first(),

          knex("buildings_and_phases")
            .leftJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .leftJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .leftJoin(
              "users",
              "buildings_and_phases.createdBy",
              "users.id"
            )
            .leftJoin(
              "property_types",
              "buildings_and_phases.propertyTypeId",
              "property_types.id"
            )
            .where({
              "buildings_and_phases.isActive": true,
              "buildings_and_phases.orgId": orgId
            })
            .select([
              "buildings_and_phases.id as id",
              "buildings_and_phases.buildingPhaseCode as Building/Phase",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "buildings_and_phases.isActive as Status",
              "users.name as Created By",
              "buildings_and_phases.createdAt as Date Created",
              "property_types.propertyType"
            ])
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
      } else if (companyId) {

        console.log("=======================",companyId)
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("buildings_and_phases")
            .leftJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .leftJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .leftJoin(
              "users",
              "buildings_and_phases.createdBy",
              "users.id"
            )
            .leftJoin(
              "property_types",
              "buildings_and_phases.propertyTypeId",
              "property_types.id"
            )
            .where({
              "buildings_and_phases.companyId": companyId,
              "buildings_and_phases.isActive": true,
              "buildings_and_phases.orgId": orgId
            })
            .first(),
          knex("buildings_and_phases")
            .leftJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .leftJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .leftJoin(
              "users",
              "buildings_and_phases.createdBy",
              "users.id"
            )
            .leftJoin(
              "property_types",
              "buildings_and_phases.propertyTypeId",
              "property_types.id"
            )
            .where({
              "buildings_and_phases.companyId": companyId,
              "buildings_and_phases.isActive": true,
              "buildings_and_phases.orgId": orgId
            })
            .select([
              "buildings_and_phases.id as id",
              "buildings_and_phases.buildingPhaseCode as Building/Phase",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "buildings_and_phases.isActive as Status",
              "users.name as Created By",
              "buildings_and_phases.createdAt as Date Created",
              "property_types.propertyType"
            ])
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
      } 

      return res.status(200).json({
        data: {
          buildingPhases: pagination
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
    // Export Building Phase Data
  },
  exportBuildingPhase: async (req, res) => {
    try {
      let orgId = req.orgId;
      let companyId = req.query.companyId;
      let reqData = req.query;
      let rows = null;

      if (!companyId) {
        [rows] = await Promise.all([
          knex("buildings_and_phases")
            .leftJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .leftJoin(
              "property_types",
              "buildings_and_phases.propertyTypeId",
              "property_types.id"
            )
            .leftJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "buildings_and_phases.orgId": orgId })
            .select([
              // "buildings_and_phases.orgId as ORGANIZATION_ID",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY NAME",
              "projects.project as PROJECT",
              "projects.projectName as PROJECT NAME",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              "buildings_and_phases.description as DESCRIPTION"
              // "buildings_and_phases.isActive as STATUS"
              // "buildings_and_phases.createdBy as CREATED BY ID",
              // "buildings_and_phases.createdAt as DATE CREATED"
            ])
        ]);
      } else {
        [rows] = await Promise.all([
          knex("buildings_and_phases")
            .leftJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .leftJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({
              "buildings_and_phases.companyId": companyId,
              "buildings_and_phases.orgId": orgId
            })
            .select([
              //"buildings_and_phases.orgId as ORGANIZATION_ID",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY NAME",
              "projects.project as PROJECT",
              "projects.projectName as PROJECT NAME",
              "buildings_and_phases.propertyTypeId as PROPERTY_TYPE_CODE",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              "buildings_and_phases.description as DESCRIPTION"
              // "buildings_and_phases.isActive as STATUS"
              // "buildings_and_phases.createdBy as CREATED BY ID",
              // "buildings_and_phases.createdAt as DATE CREATED"
            ])
        ]);
      }

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
      var ws;

      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            COMPANY: "",
            "COMPANY NAME": "",
            PROJECT: "",
            "PROJECT NAME": "",
            PROPERTY_TYPE_CODE: "",
            BUILDING_PHASE_CODE: "",
            DESCRIPTION: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "BuildingPhaseData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");
      fs.readFile(filepath, function(err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/BuildingPhase/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function(err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
          } else {
            console.log("File uploaded Successfully");

            //next(null, filePath);
            fs.unlink(filepath, err => {
              console.log("File Deleting Error " + err);
            });
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/BuildingPhase/" +
              filename;

            return res.status(200).json({
              data: {
                buildingPhases: rows
              },
              message: "Building Phases Data Export Successfully!",
              url: url
            });
          }
        });
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
  getBuildingPhaseAllList: async (req, res) => {
    try {
      let projectId = req.query.projectId;
      let orgId = req.orgId;

      let buildingData = {};
      //console.log(orgId);

      let [rows] = await Promise.all([
        knex("buildings_and_phases")
          .innerJoin(
            "projects",
            "buildings_and_phases.projectId",
            "projects.id"
          )
          .leftJoin(
            "property_types",
            "buildings_and_phases.propertyTypeId",
            "property_types.id"
          )
          .where({
            "buildings_and_phases.isActive": "true",
            "buildings_and_phases.projectId": projectId,
            "buildings_and_phases.orgId": orgId
          })
          .select([
            "buildings_and_phases.id as id",
            "buildings_and_phases.buildingPhaseCode",
            "property_types.propertyType",
            "property_types.propertyTypeCode",
          ])
      ]);

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
  getBuildingPhaseListByProjectId: async (req, res) => {
    try {
      const { projectId } = req.body;
      let orgId = req.orgId;

      let buildings;
      if(projectId){
      buildings = await knex("buildings_and_phases")
        .select("*")
        .where({ projectId, orgId: orgId });
      } else{
        buildings = await knex("buildings_and_phases")
        .select("*")
        .where({orgId: orgId });
      }
      return res
        .status(200)
        .json({ data: { buildings }, message: "Buildings list" });
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
  importBuildingData: async (req, res) => {
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

        //console.log('DATA: ',data)

        if (
          //data[0].A == "ORGANIZATION_ID" || data[0].A == "Ã¯Â»Â¿ORGANIZATION_ID" &&
          data[0].A == "Ã¯Â»Â¿COMPANY" ||
          (data[0].A == "COMPANY" &&
            data[0].B == "COMPANY NAME" &&
            data[0].C == "PROJECT" &&
            data[0].D == "PROJECT NAME" &&
            data[0].E == "PROPERTY_TYPE_CODE" &&
            data[0].F == "BUILDING_PHASE_CODE" &&
            data[0].G == "DESCRIPTION")
          //&&
          // data[0].I == "STATUS" &&
          // data[0].J == "CREATED BY ID" &&
          // data[0].K == "DATE CREATED"
        ) {
          if (data.length > 0) {
            let i = 0;
            console.log("Data[0]", data[0]);
            let success = 0;

            for (let buildingData of data) {
              // Find Company primary key
              let companyId = null;
              let projectId = null;
              let propertyTypeId = null;
              console.log(
                "ORGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGID: ",
                req.orgId
              );

              let companyIdResult = await knex("companies")
                .select("id")
                .where({ companyId: buildingData.A, orgId: req.orgId });
              let projectIdResult = await knex("projects")
                .select("id")
                .where({ project: buildingData.C, orgId: req.orgId });
              let propertyTypeIdResult = await knex("property_types")
                .select("id")
                .where({ propertyTypeCode: buildingData.E, orgId: req.orgId });
              console.log(
                "propertyTypeIdResult*****************************************: ",
                propertyTypeIdResult
              );
              if (propertyTypeIdResult && propertyTypeIdResult.length) {
                propertyTypeId = propertyTypeIdResult[0].id;
              }

              if (companyIdResult && companyIdResult.length) {
                companyId = companyIdResult[0].id;
              }
              if (projectIdResult && projectIdResult.length) {
                projectId = projectIdResult[0].id;
              }
              if (!companyId) {
                console.log("breaking due to: null companyId");
                continue;
              }
              if (!projectId) {
                console.log("breaking due to: null projectId");
                continue;
              }
              if (!propertyTypeId) {
                console.log("breaking due to: null propertyTypeId");
                continue;
              }

              console.log(
                "^&&&&&&&&&&&&&&&&&&&&&&&&&&&& IDS &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&^",
                companyId,
                projectId,
                propertyTypeId
              );

              i++;

              const checkExistance = await knex("buildings_and_phases").where({
                orgId: req.orgId,
                buildingPhaseCode: buildingData.F
              });
              if (checkExistance.length) {
                continue;
              }

              //if (i > 1) {
              let currentTime = new Date().getTime();
              // let checkExist = await knex("buildings_and_phases")
              //   .select("buildingPhaseCode")
              //   .where({
              //     buildingPhaseCode: buildingData.F,
              //     orgId: req.orgId
              //   });
              //if (checkExist.length < 1) {
              success++;
              let insertData = {
                orgId: req.orgId,
                companyId: companyId,
                projectId: projectId,
                buildingPhaseCode: buildingData.F,
                propertyTypeId: propertyTypeId,
                description: buildingData.G,
                // isActive: buildingData.H,
                // createdBy: buildingData.I,
                createdAt: currentTime,
                updatedAt: currentTime
              };

              resultData = await knex
                .insert(insertData)
                .returning(["*"])
                .into("buildings_and_phases");
              //}
              //}
            }

            let deleteFile = await fs.unlink(file_path, err => {
              console.log("File Deleting Error " + err);
            });
            return res.status(200).json({
              message: success + " rows imported successfully!"
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
  }
};

module.exports = buildingPhaseController;
