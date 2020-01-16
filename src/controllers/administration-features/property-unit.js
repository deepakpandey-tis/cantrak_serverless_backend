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



const propertyUnitController = {
  addPropertyUnit: async (req, res) => {
    try {
      let orgId = req.orgId;
      let userId = req.me.id;

      let propertyUnit = null;
      await knex.transaction(async trx => {
        const payload = _.omit(req.body, 'propertyTypeId');

        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.number().allow("").optional(),
          buildingPhaseId: Joi.string().required(),
          //createdBy: Joi.string().required(),
          floorZoneId: Joi.string().required(),
          unitNumber: Joi.string().required(),
          houseId: Joi.string().optional().allow(''),
          description: Joi.string().allow("").optional(),
          productCode: Joi.string().required(),
          area: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addpropertyUnit]: JOi Result",
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
        let existValue = await knex('property_units')
          .where({
            //companyId:payload.companyId,
            //projectId:payload.projectId,
            buildingPhaseId: payload.buildingPhaseId,
            unitNumber: payload.unitNumber,
            orgId: orgId
          });
        if (existValue && existValue.length) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Unit Number already exist!!" }
            ]
          });
        }
        /*CHECK DUPLICATE VALUES CLOSE */

        /*GET PROPERTY TYPE ID OPEN */
        let buildingData = await knex('buildings_and_phases')
          .select('propertyTypeId')
          .where({ id: payload.buildingPhaseId }).first();
        let propertyType = buildingData.propertyTypeId;
        /*GET PROPERTY TYPE ID OPEN */

        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          createdBy: userId,
          orgId: orgId,
          createdAt: currentTime,
          updatedAt: currentTime,
          propertyTypeId: propertyType
        };
        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("property_units");
        propertyUnit = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          propertyUnit: propertyUnit
        },
        message: "Property Unit added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][addpropertyUnit] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updatePropertyUnit: async (req, res) => {
    try {
      let propertyUnit = null;
      let orgId = req.orgId;
      let userId = req.me.id;

      await knex.transaction(async trx => {
        const payload = _.omit(req.body, 'propertyTypeId');

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.number().allow("").optional(),
          buildingPhaseId: Joi.string().required(),
          floorZoneId: Joi.string().required(),
          unitNumber: Joi.string().required(),
          houseId: Joi.string().allow('').optional(),
          description: Joi.string().allow("").allow(null).optional(),
          productCode: Joi.string().required(),
          area: Joi.string().allow("").allow(null).optional(),
          //createdBy:Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updatepropertyUnit]: JOi Result",
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
        let existValue = await knex('property_units')
          .where({
            //companyId:payload.companyId,
            //projectId:payload.projectId,
            buildingPhaseId: payload.buildingPhaseId,
            unitNumber: payload.unitNumber,
            orgId: orgId
          });
        if (existValue && existValue.length) {

          if (existValue[0].id === payload.id) {

          } else {
            return res.status(400).json({
              errors: [
                { code: "VALIDATION_ERROR", message: "Unit Number  already exist!!" }
              ]
            });
          }
        }
        /*CHECK DUPLICATE VALUES CLOSE */


        /*GET PROPERTY TYPE ID OPEN */
        let buildingData = await knex('buildings_and_phases')
          .select('propertyTypeId')
          .where({ id: payload.buildingPhaseId }).first();
        let propertyType = buildingData.propertyTypeId;
        /*GET PROPERTY TYPE ID OPEN */

        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          createdBy: userId,
          updatedAt: currentTime,
          propertyTypeId: propertyType
        };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("property_units");
        propertyUnit = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          propertyUnit: propertyUnit
        },
        message: "Property Unit details updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][updatepropertyUnit] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewPropertyUnit: async (req, res) => {
    try {
      let propertyUnit = null;
      let orgId = req.orgId;
      let userId = req.me.id;

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
        let propertyUnitResult = await knex
          .select()
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("property_units");

        propertyUnit = _.omit(propertyUnitResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
        trx.commit;
        return res.status(200).json({
          data: {
            propertyUnit: propertyUnit
          },
          message: "propertyUnit details"
        });
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
  deletePropertyUnit: async (req, res) => {
    try {
      let propertyUnit = null;
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
        let propertyUnitResult = await knex
          .update({ isActive: false })
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("property_units");
        propertyUnit = propertyUnitResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          propertyUnit: propertyUnit
        },
        message: "Property Unit deleted!"
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
  getPropertyUnitList: async (req, res) => {
    try {
      let companyId = req.body.companyId;
      let orgId = req.orgId;

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
            .from("property_units")
            .leftJoin('users', 'property_units.createdBy', 'users.id')
            .leftJoin('floor_and_zones', 'property_units.floorZoneId', 'floor_and_zones.id')
            .where({ "floor_and_zones.isActive": true })
            .where({ "property_units.orgId": orgId })
            .first(),
          knex("property_units")
            .leftJoin('users', 'property_units.createdBy', 'users.id')
            .leftJoin('floor_and_zones', 'property_units.floorZoneId', 'floor_and_zones.id')
            .where({ "floor_and_zones.isActive": true })
            .select([
              "property_units.id as id",
              "property_units.unitNumber as Unit No",
              "property_units.description as Description",
              "property_units.area as Area",
              "property_units.isActive as Status",
              "users.name as Created By",
              "property_units.createdAt as Date Created"
            ])
            .where({ "property_units.orgId": orgId })
            .offset(offset)
            .limit(per_page)
          // .orderBy('desc','property_units.unitNumber')
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
          knex
            .count("* as count")
            .from("property_units")
            .leftJoin('users', 'property_units.createdBy', 'users.id')
            .leftJoin('floor_and_zones', 'property_units.floorZoneId', 'floor_and_zones.id')
            .where({ "floor_and_zones.isActive": true })
            .where({
              "property_units.orgId": orgId,
              "property_units.companyId": companyId
            })
            .first(),
          knex
            .from("property_units")
            .leftJoin("companies", "property_units.companyId", "companies.id")
            .leftJoin('users', 'property_units.createdBy', 'users.id')
            .leftJoin('floor_and_zones', 'property_units.floorZoneId', 'floor_and_zones.id')
            .where({ "floor_and_zones.isActive": true })
            .select([
              "property_units.id as id",
              "property_units.unitNumber as Unit No",
              "property_units.description as Description",
              "property_units.area as Area",
              "property_units.isActive as Status",
              "users.name as Created By",
              "property_units.createdAt as Date Created"
            ])
            .where({
              "property_units.companyId": companyId,
              "property_units.orgId": orgId
            })
            .offset(offset)
            .limit(per_page)
          //.orderBy('desc', 'property_units.unitNumber')

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
          propertyUnits: pagination
        },
        message: "Property Units List!"
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
  exportPropertyUnit: async (req, res) => {
    try {
      let orgId = req.orgId;

      let companyId = req.query.companyId;
      let reqData = req.query;
      let rows = null;

      if (!companyId) {
        [rows] = await Promise.all([
          knex("property_units")
            .innerJoin("companies", "property_units.companyId", "companies.id")
            .innerJoin("projects", "property_units.projectId", "projects.id")
            .innerJoin(
              "property_types",
              "property_units.propertyTypeId",
              "property_types.id"
            )
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
            .innerJoin("users", "property_units.createdBy", "users.id")
            .select([
              // "property_units.orgId as ORGANIZATION_ID",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY NAME",
              "projects.project as PROJECT",
              "projects.projectName as PROJECT NAME",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              // "property_units.buildingPhaseId as BUILDING_PHASE_CODE ID",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              // "property_units.floorZoneId as FLOOR_ZONE_CODE ID",
              "floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
              "property_units.unitNumber as UNIT_NUMBER",
              "property_units.description as DESCRIPTION",
              "property_units.area as ACTUAL SALE AREA",
              "property_units.houseId as HOUSE_ID",
              "property_units.productCode as PRODUCT_CODE"
              // "property_units.isActive as STAUS",
              // "users.name as CREATED BY",
              // "property_units.createdBy as CREATED BY ID",
              // "property_units.createdAt as DATE CREATED"
            ])
            .where({ "property_units.orgId": orgId })
            .where({ "floor_and_zones.isActive": true })
        ]);
      } else {
        [rows] = await Promise.all([
          knex
            .from("property_units")
            .innerJoin("companies", "property_units.companyId", "companies.id")
            .innerJoin("projects", "property_units.projectId", "projects.id")
            .innerJoin(
              "property_types",
              "property_units.propertyTypeId",
              "property_types.id"
            )
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
            .innerJoin("users", "property_units.createdBy", "users.id")
            .select([
              // "property_units.orgId as ORGANIZATION_ID",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY NAME",
              "projects.project as PROJECT",
              "projects.projectName as PROJECT NAME",
              // "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
              // "property_units.buildingPhaseId as BUILDING_PHASE_CODE ID",
              "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
              // "property_units.floorZoneId as FLOOR_ZONE_CODE ID",
              "floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
              "property_units.unitNumber as UNIT_NUMBER",
              "property_units.description as DESCRIPTION",
              "property_units.area as ACTUAL SALE AREA",
              "property_units.houseId as HOUSE_ID",
              "property_units.productCode as PRODUCT_CODE"
              // "property_units.isActive as STATUS",
              // "users.name as CREATED BY",
              // "property_units.createdBy as CREATED BY ID",
              // "property_units.createdAt as DATE CREATED"
            ])
            .where({
              "property_units.companyId": companyId,
              "property_units.orgId": orgId
            })
            .where({ "floor_and_zones.isActive": true })
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
      var ws

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
            FLOOR_ZONE_CODE: "",
            UNIT_NUMBER: "",
            DESCRIPTION: "",
            "SALE AREA": "",
            "HOUSE_ID": "",
            "PRODUCT_CODE": ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "PropertyUnitData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/PropertyUnit/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);

          } else {
            console.log("File uploaded Successfully");
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/PropertyUnit/" + filename;

            return res.status(200).json({
              data: rows,
              message: "Property Units Data Export Successfully!",
              url: url
            });
          }
        });
        // return res.status(200).json({
        //   data: rows,
        //   message: "Property Units Data Export Successfully!",
        //   // url: url
        // });

      });
      // let deleteFile = await fs.unlink(filepath, err => {
      //   console.log("File Deleting Error " + err);
      // });

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
  // PROPERTY UNIT DETAILS
  getPropertyUnitDetails: async (req, res) => {
    try {
      let orgId = req.orgId;

      let id = req.body.id;

      let resultData = await knex("property_units")
        .leftJoin("companies", "property_units.companyId", "companies.id")
        .leftJoin("projects", "property_units.projectId", "projects.id")
        .leftJoin(
          "property_types",
          "property_units.propertyTypeId",
          "property_types.id"
        )
        .leftJoin(
          "buildings_and_phases",
          "property_units.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "floor_and_zones",
          "property_units.floorZoneId",
          "floor_and_zones.id"
        )
        .leftJoin("users", "property_units.createdBy", "users.id")
        .select([
          "property_units.id as id",
          "property_units.description as description",
          "property_units.productCode as productCode",
          "property_units.houseId as houseId",
          "property_units.area as area",
          "property_units.unitNumber as unitNumber",
          "companies.companyName as companyName",
          "companies.companyId as companyId",
          "projects.project as project",
          "projects.projectName as projectName",
          "property_types.propertyType",
          "property_types.propertyTypeCode",
          "buildings_and_phases.buildingPhaseCode",
          "floor_and_zones.floorZoneCode",
          "users.name as createdBy"
        ])
        .where({ "property_units.id": id, "property_units.orgId": orgId });

      return res.status(200).json({
        data: {
          propertyUnitDetails: resultData[0]
        },
        message: "Property Unit Details!"
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
  getPropertyUnitListByFloor: async (req, res) => {
    try {
      let orgId = req.orgId;

      const { floorZoneId } = req.body;
      const unit = await knex("property_units")
        .select("*")
        .where({ floorZoneId, orgId: orgId });
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
  // PROPERTY UNIT NO LIST FOR DROPDOWN
  getPropertyUnitAllList: async (req, res) => {
    try {
      let orgId = req.orgId;

      let floorId = req.query.floorId;
      let result = await knex("property_units")
        .select(["id", "unitNumber", "houseId"])
        .where({ floorZoneId: floorId, orgId: orgId });

      return res.status(200).json({
        data: {
          unitData: result
        },
        message: "Property Unit List"
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  checkHouseId: async (req, res) => {
    try {
      const id = req.body.id;
      const [houseId, houseIdData] = await Promise.all([
        knex("user_house_allocation")
          .where({ houseId: id })
          .select("userId"),
        knex("property_units")
          .where({ houseId: id })
          .select("*")
      ]);

      return res.status(200).json({
        data: {
          exists: houseId,
          houseIdData: houseIdData
        }
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  importPropertyUnitData: async (req, res) => {
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
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;

        if (
          data[0].A == "Ã¯Â»Â¿COMPANY" ||
          //data[0].A == "Ã¯Â»Â¿ORGANIZATION_ID" &&
          (data[0].A == "COMPANY" &&
            data[0].B == "COMPANY NAME" &&
            data[0].C == "PROJECT" &&
            data[0].D == "PROJECT NAME" &&
            data[0].E == "PROPERTY_TYPE_CODE" &&
            // data[0].G == "BUILDING_PHASE_CODE ID" &&
            data[0].F == "BUILDING_PHASE_CODE" &&
            // data[0].I == "FLOOR_ZONE_CODE ID" &&
            data[0].G == "FLOOR_ZONE_CODE" &&
            data[0].H == "UNIT_NUMBER" &&
            data[0].I == "DESCRIPTION" &&
            data[0].J == "ACTUAL SALE AREA" &&
            data[0].K == "HOUSE_ID" && 
            data[0].L == "PRODUCT_CODE"
            )
          // &&
          // data[0].L == "STATUS" &&
          // data[0].M == "CREATED BY" &&
          // data[0].N == "CREATED BY ID" &&
          // data[0].O == "DATE CREATED"
        ) {
          if (data.length > 0) {
            let i = 1;
            console.log("Data[0]", data[0]);
            for (let propertyUnitData of data) {
              // Query from different tables and get data
              let companyId = null;
              let projectId = null;
              let propertyTypeId = null;
              let buildingPhaseId = null;
              let floorZoneId = null;
              console.log({ propertyUnitData });
              let companyIdResult = await knex("companies")
                .select("id")
                .where({ companyId: propertyUnitData.A, orgId: req.orgId });

              if (companyIdResult && companyIdResult.length) {
                companyId = companyIdResult[0].id;

                let projectIdResult = await knex("projects")
                  .select("id")
                  .where({ project: propertyUnitData.C, companyId: companyId, orgId: req.orgId });

                if (projectIdResult && projectIdResult.length) {
                  projectId = projectIdResult[0].id;

                  let buildingPhaseIdResult = await knex("buildings_and_phases")
                    .select("id")
                    .where({
                      buildingPhaseCode: propertyUnitData.F,
                      projectId: projectId,
                      orgId: req.orgId
                    });

                  if (buildingPhaseIdResult && buildingPhaseIdResult.length) {
                    buildingPhaseId = buildingPhaseIdResult[0].id;

                    let floorZoneIdResult = await knex("floor_and_zones")
                      .select("id")
                      .where({ floorZoneCode: propertyUnitData.G, buildingPhaseId: buildingPhaseId, orgId: req.orgId });

                    if (floorZoneIdResult && floorZoneIdResult.length) {
                      floorZoneId = floorZoneIdResult[0].id;

                    }
                  }
                }
              }

              let propertyTypeIdResult = await knex("property_types")
                .select("id")
                .where({
                  propertyTypeCode: propertyUnitData.E,
                  orgId: req.orgId
                });

              // console.log({ buildingPhaseIdResult, floorZoneIdResult });


              if (propertyTypeIdResult && propertyTypeIdResult.length) {
                propertyTypeId = propertyTypeIdResult[0].id;
              }



              console.log(
                "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&",
                {
                  propertyTypeId,
                  buildingPhaseId,
                  floorZoneId,
                  companyId,
                  projectId
                }
              );

              if (!propertyTypeId) {
                fail++;
                continue;
              }
              if (!buildingPhaseId) {
                fail++;
                continue;
              }
              if (!floorZoneId) {
                fail++;
                continue;
              }

              if (!companyId) {
                fail++;
                continue;
              }
              if (!projectId) {
                fail++;
                continue;
              }

              i++;
              if (i > 1) {

                console.log()
                let checkExist = await knex("property_units")
                  .select("id")
                  .where({
                    //companyId: companyId,
                    // projectId: projectId,
                    buildingPhaseId: buildingPhaseId,
                    // floorZoneId: floorZoneId,
                    // propertyTypeId: propertyTypeId,
                    orgId: req.orgId,
                    unitNumber: propertyUnitData.H
                  });
                if (checkExist.length < 1) {
                  let insertData = {
                    orgId: req.orgId,
                    companyId,
                    projectId,
                    propertyTypeId,
                    buildingPhaseId,
                    floorZoneId,
                    area: propertyUnitData.J,
                    unitNumber: propertyUnitData.H,
                    description: propertyUnitData.I,
                    houseId: propertyUnitData.K,
                    productCode: propertyUnitData.L,
                    isActive: true,
                    createdBy: req.me.id,
                    createdAt: new Date().getTime(),
                    updatedAt: new Date().getTime()
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("property_units");
                  success++;
                } else {
                  fail++;
                }
              }
            }
            fail = fail - 1;
            let message = null;
            if (totalData == success) {
              message =
                "System have processed ( " +
                totalData +
                " ) entries and added them successfully!";
            } else {
              message =
                "System have processed ( " +
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
  },
  toggleStatus: async (req, res) => {
    try {
      let id = req.body.id;
      let check = await knex('property_units').select('isActive').where({ orgId: req.orgId, id: id })
      if (check && check.length && Boolean(check[0].isActive)) {
        await knex('property_units').update({ isActive: false }).where({ id, orgId: req.orgId })
      } else {
        await knex('property_units').update({ isActive: true }).where({ id, orgId: req.orgId })
      }
      return res.status(200).json({
        data: {
          message: 'Done!'
        }
      })
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = propertyUnitController;
