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


const floorZoneController = {
  addFloorZone: async (req, res) => {
    try {
      let floorZone = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;
        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().allow("").optional(),
          buildingPhaseId: Joi.string().required(),
          floorZoneCode: Joi.string().required(),
          description: Joi.string().allow("").optional(),
          totalFloorArea: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addfloorZone]: JOi Result",
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
         let existValue = await knex('floor_and_zones')
         .where({ floorZoneCode: payload.floorZoneCode,buildingPhaseId:payload.buildingPhaseId, orgId: orgId });
       if (existValue && existValue.length) {
         return res.status(400).json({
           errors: [
             { code: "VALIDATION_ERROR", message: "Floor Zone Code & Building Phase code already exist!!" }
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
          .into("floor_and_zones");
        floorZone = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          floorZone: floorZone
        },
        message: "Floor/Zone added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][addfloorZone] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateFloorZone: async (req, res) => {
    try {
      let floorZone = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().allow("").optional(),
          buildingPhaseId: Joi.string().required(),
          floorZoneCode: Joi.string().required(),
          description: Joi.string().allow("").optional(),
          totalFloorArea: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updatefloorZone]: JOi Result",
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
          let existValue = await knex('floor_and_zones')
          .where({ floorZoneCode: payload.floorZoneCode,buildingPhaseId:payload.buildingPhaseId, orgId: orgId });
        if (existValue && existValue.length) {

          if(existValue[0].id===payload.id){

          } else{
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Floor Zone Code & Building Phase code already exist!!" }
            ]
          });
        }
        }
        /*CHECK DUPLICATE VALUES CLOSE */

        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          createdBy: userId,
          updatedAt: currentTime
        };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("floor_and_zones");
        floorZone = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          floorZone: floorZone
        },
        message: "Floor/Zone details updated successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][updatefloorZone] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewFloorZone: async (req, res) => {
    try {
      let floorZone = null;
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
      // let floorZoneResult = await knex("floor_and_zones")
      //   .select()
      //   .where({ id: payload.id });

      let floorZoneResult = await knex("floor_and_zones")
        .leftJoin("companies", "floor_and_zones.companyId", "companies.id")
        .leftJoin("projects", "floor_and_zones.projectId", "projects.id")
        .leftJoin(
          "buildings_and_phases",
          "floor_and_zones.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "property_types",
          "buildings_and_phases.propertyTypeId",
          "property_types.id"
        )
        .select(
          "floor_and_zones.*",
          "companies.companyName as companyName",
          "companies.companyId as compId",
          "companies.id as companyId",
          "projects.projectName",
          "property_types.propertyTypeCode",
          "buildings_and_phases.buildingPhaseCode",
          "companies.companyId as companyCode"
        )
        .where({
          "floor_and_zones.id": payload.id,
          "floor_and_zones.orgId": orgId
        });

      floorZone = _.omit(floorZoneResult[0], [
        "createdAt",
        "updatedAt",
        "isActive"
      ]);
      return res.status(200).json({
        data: {
          floorZone: floorZone
        },
        message: "Floor/Zone details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewfloorZone] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deleteFloorZone: async (req, res) => {
    try {
      let floorZone = null;
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
        let floorZoneResult = await knex
          .update({ isActive: false })
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("floor_and_zones");
        floorZone = floorZoneResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          floorZone: floorZone
        },
        message: "Floor/Zone deleted!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewfloorZone] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getFloorZoneList: async (req, res) => {
    try {
      let orgId = req.orgId;

      let reqData = req.query;
      let companyId = req.body.companyId;
      let projectId = req.query.projectId;
      let buildingPhaseId = req.query.buildingPhaseId;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("floor_and_zones")
            .leftJoin("companies", "floor_and_zones.companyId", "companies.id")
            .leftJoin("users", "floor_and_zones.createdBy", "users.id")
            .where({ "floor_and_zones.orgId": orgId })
            .first(),
          knex("floor_and_zones")
            .leftJoin("companies", "floor_and_zones.companyId", "companies.id")
            .leftJoin("users", "floor_and_zones.createdBy", "users.id")
            .select([
              "floor_and_zones.floorZoneCode as Floor/Zone",
              "floor_and_zones.id as id",
              "floor_and_zones.description as Description",
              "floor_and_zones.totalFloorArea as Total Area",
              "floor_and_zones.isActive as Status",
              "users.name as Created By",
              "floor_and_zones.createdAt as Date Created"
            ])
            .where({ "floor_and_zones.orgId": orgId })
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
      } else {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;
        let filters = {};
        filters["floor_and_zones.companyId"] = companyId;
        if (projectId) {
          filters["floor_and_zones.projectId"] = projectId;
        }
        if (buildingPhaseId) {
          filters["floor_and_zones.buildingPhaseId"] = buildingPhaseId;
        }

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("floor_and_zones")
            .leftJoin("companies", "floor_and_zones.companyId", "companies.id")
            .leftJoin("users", "floor_and_zones.createdBy", "users.id")
            .where(filters, { "floor_and_zones.orgId": orgId })

            .offset(offset)
            .limit(per_page)
            .first(),
          knex
            .from("floor_and_zones")
            .leftJoin("companies", "floor_and_zones.companyId", "companies.id")
            .leftJoin("users", "floor_and_zones.createdBy", "users.id")
            .select([
              "floor_and_zones.floorZoneCode as Floor/Zone",
              "floor_and_zones.description as Description",
              "floor_and_zones.id as id",
              "floor_and_zones.totalFloorArea as Total Area",
              "floor_and_zones.isActive as Status",
              "users.name as Created By",
              "floor_and_zones.createdAt as Date Created"
            ])
            .where(filters, { "floor_and_zones.orgId": orgId })
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
          floorZones: pagination
        },
        message: "Floor/Zones List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewfloorZone] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  exportFloorZone: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.query;
      let companyId = req.query.companyId;
      let rows = null;

      if (!companyId) {
        [rows] = await Promise.all([
          knex("floor_and_zones")
            .leftJoin("companies", "floor_and_zones.companyId", "companies.id")
            .leftJoin("projects", "floor_and_zones.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "floor_and_zones.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("users", "floor_and_zones.createdBy", "users.id")
            .leftJoin(
              "property_types",
              "floor_and_zones.propertyTypeId",
              "property_types.id"
            )
            .select([
              // "floor_and_zones.orgId as ORGANIZATION_ID",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "projects.project as PROJECT",
              "projects.projectName as PROJECT_NAME",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              "floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
              "floor_and_zones.description as DESCRIPTION",
              "floor_and_zones.totalFloorArea as TOTAL_FLOOR_AREA"
              //"floor_and_zones.isActive as STATUS",
              //"users.name as CREATED_BY",
              //"floor_and_zones.createdBy as CREATED_BY_ID",
              //"floor_and_zones.createdAt as DATE_CREATED"
            ])
            .where({ "floor_and_zones.orgId": orgId })
        ]);
      } else {
        [rows] = await Promise.all([
          knex
            .from("floor_and_zones")
            .leftJoin("companies", "floor_and_zones.companyId", "companies.id")
            .leftJoin("projects", "floor_and_zones.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "floor_and_zones.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("users", "floor_and_zones.createdBy", "users.id")
            .leftJoin(
              "property_types",
              "floor_and_zones.propertyTypeId",
              "property_types.id"
            )
            .select([
              //"floor_and_zones.orgId as ORGANIZATION_ID",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "projects.project as PROJECT",
              "projects.projectName as PROJECT_NAME",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              "floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
              "floor_and_zones.description as DESCRIPTION",
              "floor_and_zones.totalFloorArea as TOTAL_FLOOR_AREA"
              //"floor_and_zones.isActive as STATUS",
              // "users.name as CREATED_BY",
              // "floor_and_zones.createdBy as CREATED_BY_ID",
              // "floor_and_zones.createdAt as DATE_CREATED"
            ])
            .where({
              "floor_and_zones.companyId": companyId,
              "floor_and_zones.orgId": orgId
            })
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
            COMPANY_NAME: "",
            PROJECT: "",
            PROJECT_NAME: "",
            PROPERTY_TYPE_CODE: "",
            BUILDING_PHASE_CODE: "",
            FLOOR_ZONE_CODE: "",
            DESCRIPTION: "",
            TOTAL_FLOOR_AREA: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "FloorZoneData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");
      fs.readFile(filepath, function(err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/FloorZone/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function(err, data) {
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
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/FloorZone/" +
              filename;

            return res.status(200).json({
              data: rows,
              message: "Floor/Zones Data Export Successfully!",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewfloorZone] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getFloorZoneAllList: async (req, res) => {
    try {
      let orgId = req.orgId;
      let buildingPhaseId = req.query.buildingPhaseId;
      let pagination = {};
      let [rows] = await Promise.all([
        knex
          .from("floor_and_zones")
          .leftJoin(
             "buildings_and_phases",
             "floor_and_zones.buildingPhaseId",
             "buildings_and_phases.id"
           )
          .select([
            "floor_and_zones.floorZoneCode", 
             "floor_and_zones.id"
          ])
          //.where({'floor_and_zones.orgId': orgId })
          //.where([{'floor_and_zones.orgId':orgId}])
          .where({
            "floor_and_zones.buildingPhaseId": buildingPhaseId,
            "floor_and_zones.orgId": orgId
          })
      ]);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          floorZones: pagination
        },
        message: "Floor/Zones All List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewfloorZone] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getFloorZoneListByBuildingId: async (req, res) => {
    try {
      let orgId = req.orgId;

      const { buildingPhaseId } = req.body;

      let floor;
      if(buildingPhaseId){
       floor = await knex("floor_and_zones")
        .select("*")
        .where({ buildingPhaseId, orgId: orgId });
      } else {
        floor = await knex("floor_and_zones")
        .select("*")
        .where({orgId: orgId });
      }
      return res.status(200).json({
        data: {
          floor
        },
        message: "Floor zone list"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewfloorZone] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**IMPORT FLOOR ZONE DATA */
  importFloorZoneData: async (req, res) => {
    try {
      if (req.file) {
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

        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        console.log("=======", data[0], "+++++++++++++++");
        let result = null;

        if (
          //data[0].A == "Ã¯Â»Â¿ORGANIZATION_ID" || data[0].A == "ORGANIZATION_ID" &&
          data[0].A == "Ã¯Â»Â¿COMPANY" ||
          (data[0].A == "COMPANY" &&
            data[0].B == "COMPANY_NAME" &&
            data[0].C == "PROJECT" &&
            data[0].D == "PROJECT_NAME" &&
            data[0].E == "PROPERTY_TYPE_CODE" &&
            data[0].F == "BUILDING_PHASE_CODE" &&
            data[0].G == "FLOOR_ZONE_CODE")
          //&&
          //data[0].H == "DESCRIPTION" &&
          //data[0].I == "TOTAL_FLOOR_AREA"
          //&&
          // data[0].K == "STATUS" &&
          // data[0].L == "CREATED_BY" &&
          // data[0].M == "CREATED_BY_ID" &&
          // data[0].N == "DATE_CREATED"
        ) {
          if (data.length > 0) {
            let i = 0;
            for (let floorData of data) {
              i++;

              let companyData = await knex("companies")
                .select("id")
                .where({ companyId: floorData.A, orgId: req.orgId });
              let companyId = null;
              if (!companyData && !companyData.length) {
                continue;
              }
              if (companyData && companyData.length) {
                companyId = companyData[0].id;
              }

              let projectData = await knex("projects")
                .select("id")
                .where({ project: floorData.C, orgId: req.orgId });
              let projectId = null;
              if (!projectData && !projectData.length) {
                continue;
              }
              if (projectData && projectData.length) {
                projectId = projectData[0].id;
              }
              /**GET PROPERTY TYPE ID OPEN */
              let propertTypeData = await knex("property_types")
                .select("id")
                .where({ propertyTypeCode: floorData.E, orgId: req.orgId });
              let propertyTypeId = null;
              if (!propertTypeData && !propertTypeData.length) {
                continue;
              }
              if (propertTypeData && propertTypeData.length) {
                propertyTypeId = propertTypeData[0].id;
              }
              /**GET PROPERTY TYPE ID CLOSE */

              /**GET BUILDING PHASE ID OPEN */
              let buildingData = await knex("buildings_and_phases")
                .select("id")
                .where({ buildingPhaseCode: floorData.F, orgId: req.orgId });
              let buildingId = null;
              if (!buildingData && !buildingData.length) {
                continue;
              }
              if (buildingData && buildingData.length) {
                buildingId = buildingData[0].id;
              }
              /**GET BUILDING PHASE ID CLOSE */

              if (i > 1) {
                // let checkExist = await knex("floor_and_zones")
                //   .select("floorZoneCode")
                //   .where({ floorZoneCode: floorData.G, orgId: req.orgId });
                //if (checkExist.length < 1) {
                let currentTime = new Date().getTime();
                let insertData = {
                  orgId: req.orgId,
                  companyId: companyId,
                  projectId: projectId,
                  propertyTypeId: propertyTypeId,
                  buildingPhaseId: buildingId,
                  floorZoneCode: floorData.G,
                  //description: floorData.H,
                  //totalFloorArea: floorData.I,
                  // isActive: floorData.K,
                  // createdBy: floorData.M,
                  createdAt: currentTime,
                  updatedAt: currentTime
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("floor_and_zones");
                if (resultData && resultData.length) {
                  success++;
                }
                // } else {
                //   fail++;
                // }
              }
            }

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

            let deleteFile = await fs.unlink(file_path, err => {
              console.log("File Deleting Error " + err);
            });
            return res.status(200).json({
              message: message
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

module.exports = floorZoneController;
