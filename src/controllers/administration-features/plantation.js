const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");
const knexReader = require("../../db/knex-reader");

const bcrypt = require('bcryptjs');
const saltRounds = 10;
const fs = require('fs');
const path = require('path')


const PlantationController = {
  addPlantation: async (req, res) => {
    try {
      let plantation = null;
      let userId = req.me.id;

      const payload = req.body;
      let orgId;
      if (payload.orgId) {
        orgId = payload.orgId;
      } else {
        orgId = req.orgId;
      }


      const schema = Joi.object().keys({
        companyId: Joi.string().required(),
        code: Joi.string().required(),
        name: Joi.string().required(),
        locationThai: Joi.string().allow('').allow(null).optional(),
        locationEng: Joi.string().allow('').allow(null).optional(),
        currency: Joi.string().allow('').allow(null).optional(),
        orgId: Joi.string().allow('').allow(null).optional()
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][addPlantation]: Joi Result",
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
      let existValue = await knex('plantations')
        .where({ code: payload.code.toUpperCase(), companyId: payload.companyId, orgId: orgId });
      if (existValue && existValue.length) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Plantation Code already exist!" }
          ]
        });
      }
      console.log("===============NOT A DUPLICATE===================");
      /*CHECK DUPLICATE VALUES CLOSE */

      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        code: payload.code.toUpperCase(),
        createdBy: userId,
        createdAt: currentTime,
        updatedBy: userId,
        updatedAt: currentTime,
        orgId: orgId
      };

      console.log('Plantation Payload: ', insertData)

      let insertResult = await knex
        .insert(insertData)
        .returning(["*"])
        .into("plantations");
      plantation = insertResult[0];

      return res.status(200).json({
        data: {
          plantation: plantation
        },
        message: "Plantation added successfully."
      });
    } catch (err) {
      console.log("===============INSIDE CATCH===================");
      console.log("[controllers][administrationFeatures][addPlantation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updatePlantation: async (req, res) => {
    try {
      let plantation = null;
      let userId = req.me.id;

      const payload = req.body;
      let orgId;
      if (payload.orgId) {
        orgId = payload.orgId;
      } else {
        orgId = req.orgId;
      }

      const schema = Joi.object().keys({
        id: Joi.string().required(),
        companyId: Joi.string().required(),
        code: Joi.string().required(),
        name: Joi.string().required(),
        locationThai: Joi.string().allow('').allow(null).optional(),
        locationEng: Joi.string().allow('').allow(null).optional(),
        currency: Joi.string().allow('').allow(null).optional(),
        orgId: Joi.string().allow('').allow(null).optional()
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][updatePlantation]: JOi Result",
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
      let existValue = await knex('plantations')
        .where({ code: payload.code.toUpperCase(), companyId: payload.companyId, orgId: orgId });
      if (existValue && existValue.length) {

        if (existValue[0].id === payload.id) {

        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Plantation Code already exist!" }
            ]
          });
        }
      }
      /*CHECK DUPLICATE VALUES CLOSE */


      let currentTime = new Date().getTime();
      let insertData = { ...payload, code: payload.code.toUpperCase(), orgId: orgId, updatedBy: userId, updatedAt: currentTime };
      let insertResult = await knex
        .update(insertData)
        .where({ id: payload.id })
        .returning(["*"])
        .into("plantations");

      plantation = insertResult[0];

      return res.status(200).json({
        data: {
          plantation: plantation
        },
        message: "Plantation detail updated successfully."
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][updatePlantation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  viewPlantation: async (req, res) => {
    try {
      let plantation = null;

      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required()
      });
      const validationResult = Joi.validate(payload, schema);
      if (validationResult && validationResult.hasOwnProperty("error") && validationResult.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: validationResult.error.message }
          ]
        });
      }
      let current = new Date().getTime();

      let role = req.me.roles[0];
      let name = req.me.name;
      let result
      if (role === "superAdmin" && name === "superAdmin") {

        result = await knexReader("plantations")
          .leftJoin("companies", "plantations.companyId", "companies.id")
          .select("plantations.*", "companies.companyId as compId", "companies.companyName")
          .where({ "plantations.id": payload.id })

        plantation = _.omit(result[0], [
          "createdAt",
          "updatedAt"
        ]);

      } else {

        result = await knexReader("plantations")
          .leftJoin("companies", "plantations.companyId", "companies.id")
          .select("plantations.*", "companies.companyId as compId", "companies.companyName")
          .where({ "plantations.id": payload.id, 'plantations.orgId': req.orgId })

        plantation = _.omit(result[0], [
          "createdAt",
          "updatedAt"
        ]);

      }

      return res.status(200).json({
        data: {
          plantation: plantation
        },
        message: "Plantation details"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][viewPlantation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  deletePlantation: async (req, res) => {
    try {
      let userId = req.me.id;
      let plantation = null;
      let message;

      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required()
      });
      const ValidationResult = Joi.validate(payload, schema);
      if (ValidationResult && ValidationResult.hasOwnProperty("error") && ValidationResult.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: ValidationResult.error.message }
          ]
        });
      }
      let result;
      let currentTime = new Date().getTime();
      let checkStatus = await knex.from('plantations').where({ id: payload.id }).returning(['*']);

      if (checkStatus.length) {

        if (checkStatus[0].isActive == true) {

          result = await knex
            .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("plantations");
          plantation = result[0];
          message = "Plantation Inactive Successfully!"

        } else {
          result = await knex
            .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("plantations");
          plantations = result[0];
          message = "Plantation Active Successfully!"
        }
      }
      return res.status(200).json({
        data: {
          plantation: plantation
        },
        message: message
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][deletePlantation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationList: async (req, res) => {
    try {

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "plantations.name";
        sortPayload.orderBy = "asc"
      }
      let companyId = req.query.companyId;
      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let total, rows
      let { organisation, company, name } = req.body;
      let role = req.me.roles[0];
      let userName = req.me.name;

      if (role === "superAdmin" && userName === "superAdmin") {
        [total, rows] = await Promise.all([
          knexReader
            .count("* as count")
            .from("plantations")
            .leftJoin("companies", "plantations.companyId", "companies.id")
            .leftJoin("users", "users.id", "plantations.createdBy")
            .where('companies.isActive', true)
            .where(qb => {
              if (organisation) {
                qb.where('plantations.orgId', organisation)
              }
              if (company) {
                qb.where('plantations.companyId', company)
              }
              if (name) {
                qb.where('plantations.name', 'iLIKE', `%${name}%`)
              }
            })
            .first(),
          knexReader("plantations")
            .leftJoin("companies", "plantations.companyId", "companies.id")
            .leftJoin("users", "users.id", "plantations.createdBy")
            .where('companies.isActive', true)
            .where(qb => {
              if (organisation) {
                qb.where('plantations.orgId', organisation)
              }
              if (company) {
                qb.where('plantations.companyId', company)
              }
              if (name) {
                qb.where('plantations.name', 'iLIKE', `%${name}%`)
              }
            })
            .select([
              "plantations.id as id",
              "plantations.name as Plantation Name",
              "companies.companyName as Company Name",
              "plantations.isActive as Status",
              "users.name as Created By",
              "plantations.createdAt as Date Created",
              "plantations.code as code",
              "companies.companyId"
            ])
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

        [total, rows] = await Promise.all([
          knexReader
            .count("* as count")
            .from("plantations")
            .leftJoin("companies", "plantations.companyId", "companies.id")
            .leftJoin("users", "users.id", "plantations.createdBy")
            .where({ "plantations.orgId": req.orgId })
            .where('companies.isActive', true)
            .where(qb => {
              if (organisation) {
                qb.where('plantations.orgId', organisation)
              }
              if (company) {
                qb.where('plantations.companyId', company)
              }
              if (name) {
                qb.where('plantations.name', 'iLIKE', `%${name}%`)
              }
            })
            .first(),
          knexReader("plantations")
            .leftJoin("companies", "plantations.companyId", "companies.id")
            .leftJoin("users", "users.id", "plantations.createdBy")
            .where('companies.isActive', true)
            .where({ "plantations.orgId": req.orgId })
            .where(qb => {
              if (organisation) {
                qb.where('plantations.orgId', organisation)
              }
              if (company) {
                qb.where('plantations.companyId', company)
              }
              if (name) {
                qb.where('plantations.name', 'iLIKE', `%${name}%`)
              }
            })
            .select([
              "plantations.id as id",
              "plantations.name as Plantation Name",
              "companies.companyName as Company Name",
              "plantations.isActive as Status",
              "users.name as Created By",
              "plantations.createdAt as Date Created",
              "plantations.code as code",
              "companies.companyId"
            ])
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
        ]);
      }

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
          plantations: pagination
        },
        message: "Plantation List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  exportPlantation: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let rows = null;
      let orgId = req.orgId;

      if (!companyId) {

        [rows] = await Promise.all([

          knexReader("plantations")
            .leftJoin("companies", "plantations.companyId", "companies.id")
            .leftJoin("users", "users.id", "plantations.createdBy")
            .where('companies.isActive', true)
            .where({ "plantations.orgId": orgId })
            .select([
              // "plantations.orgId as ORGANIZATION_ID",
              "plantations.code as CODE",
              "plantations.name as NAME",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "plantations.locationEng as LOCATION",
              "plantations.locationThai as LOCATION_ALTERNATE_LANGUAGE",
              "plantations.currency as CURRENCY"
              // "users.name as CREATED BY",
              // "plantations.createdBy as CREATED BY ID",
              // "plantations.createdAt as DATE CREATED"
            ])
        ]);

      } else {

        [rows] = await Promise.all([
          knexReader
            .from("plantations")
            .leftJoin("companies", "plantations.companyId", "companies.id")
            .leftJoin("users", "users.id", "plantations.createdBy")
            .where('companies.isActive', true)
            .where({ "plantations.companyId": companyId, "plantations.orgId": orgId })
            .select([
              // "plantations.orgId as ORGANIZATION_ID",
              "plantations.code as CODE",
              "plantations.name as NAME",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "plantations.locationEng as LOCATION",
              "plantations.locationThai as LOCATION_ALTERNATE_LANGUAGE",
              "plantations.currency as CURRENCY"
              // "users.name as CREATED BY",
              // "plantations.createdBy as CREATED BY ID",
              // "plantations.createdAt as DATE CREATED"
            ])
        ]);
      }

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = process.env.S3_BUCKET_NAME;
        tempraryDirectory = 'tmp/';
      } else {
        tempraryDirectory = '/tmp/';
        bucketName = process.env.S3_BUCKET_NAME;
      }
      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws;
      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            CODE: "",
            NAME: "",
            COMPANY: "",
            COMPANY_NAME: "",
            LOCATION: "",
            LOCATION_ALTERNATE_LANGUAGE: "",
            CURRENCY: ""
          }
        ]);
      }
      //var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "PlantationData-" + moment(Date.now()).format("YYYYMMDD") + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Plantation/" + filename,
          Body: file_buffer,
          ACL: 'public-read'
        }
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
            let url = process.env.S3_BUCKET_URL + "/Export/Plantation/" +
              filename;
            // let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Plantation/" + filename;
            return res.status(200).json({
              data: rows,
              message: "Plantation Data Export Successfully!",
              url: url
            });
          }
        });
      })

    } catch (err) {
      console.log("[controllers][administrationFeatures][exportPlantation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationByCompany: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let plantations = _.flatten(
        req.userPlantationResources.map(v => v.plantations)
      ).map(v => Number(v));

      console.log("==========", plantations, "==========")

      let pagination = {}
      console.log("companyId", companyId);

      let rows = await knexReader("plantations")
        .innerJoin("companies", "plantations.companyId", "companies.id")
        .where({ "plantations.companyId": companyId, "plantations.isActive": true })
        .whereIn('plantations.id', plantations)
        .select([
          "plantations.id as id",
          "plantations.name",
          "companies.companyName",
          "companies.id as cid",
          "companies.companyId",
          "plantations.code as code"
        ])
        .orderBy('plantations.name', 'asc')

      console.log("rows", rows);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          plantations: pagination
        },
        message: "Plantation List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationByCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationByMultipleCompany: async (req, res) => {
    try {
      console.log("conpany id in req", req.body);
      let companyId = [];
      companyId = req.body;

      // const index = companyId.indexOf(0);
      // if(index !== -1){
      //     companyId.splice(index,1)
      // }
      let rows = await knexReader("plantations")
        .where({ "plantations.isActive": true })
        .whereIn("plantations.companyId", companyId)
        .select([
          "plantations.id as id",
          "plantations.name",
          "plantations.code as code"
        ])
        .orderBy('plantations.name', 'asc')

      return res.status(200).json({
        data: {
          plantations: rows
        },
        message: "Plantation List!"
      });

    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationByMultipleCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationAllList: async (req, res) => {
    try {

      let orgId = req.orgId

      let rows = await knexReader("plantations")
        .select([
          "plantations.id as id",
          "plantations.name",
          "plantations.code as code",
        ]).where({ orgId: req.orgId, isActive: true })

      return res.status(200).json({
        data: {
          plantations: rows
        },
        message: "Plantation all List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationAllList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /**IMPORT DATA */
  importPlantationData: async (req, res) => {
    try {

      // if (req.file) {
      // let tempraryDirectory = null;
      // if (process.env.IS_OFFLINE) {
      //   tempraryDirectory = 'tmp/';
      // } else {
      //   tempraryDirectory = '/tmp/';
      // }
      // let resultData = null;
      // let file_path = tempraryDirectory + req.file.filename;
      // let wb = XLSX.readFile(file_path, { type: 'binary' });
      // let ws = wb.Sheets[wb.SheetNames[0]];
      // let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });
      let data = req.body;
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      console.log("=======", data, "+++++++++++++++")
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)


      if (data[0].B == "NAME" &&
        data[0].C == "COMPANY" &&
        data[0].D == "COMPANY_NAME" &&
        data[0].E == "LOCATION" &&
        data[0].F == "LOCATION_ALTERNATE_LANGUAGE" &&
        data[0].G == "CURRENCY" &&
        data[0].A == "CODE" || data[0].A == "Ã¯Â»Â¿CODE"
      ) {
        if (data.length > 0) {
          let i = 0;
          for (let plantationData of data) {
            i++;

            if (i > 1) {

              if (!plantationData.A) {
                let values = _.values(plantationData)
                values.unshift('Plantation Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantationData.B) {
                let values = _.values(plantationData)
                values.unshift('Plantation name can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantationData.C) {
                let values = _.values(plantationData)
                values.unshift('Company Id can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantationData.E) {
                let values = _.values(plantationData)
                values.unshift('Plantation location can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              let companyData = await knex("companies")
                .select("id")
                .where({ companyId: plantationData.C.toUpperCase(), orgId: req.orgId });
              let companyId = null;
              if (!companyData.length) {
                let values = _.values(plantationData)
                values.unshift('Company ID does not exists')
                errors.push(values);
                fail++;
                continue;
              }
              if (companyData && companyData.length) {
                companyId = companyData[0].id;
              }

              let checkExist = await knex("plantations")
                .select("name")
                .where({ code: plantationData.A.toUpperCase(), companyId: companyId, orgId: req.orgId });
              if (checkExist.length < 1) {
                let currentTime = new Date().getTime();
                let insertData = {
                  orgId: req.orgId,
                  companyId: companyId,
                  name: plantationData.B,
                  code: plantationData.A.toUpperCase(),
                  locationEng: plantationData.E,
                  locationThai: plantationData.F,
                  currency: plantationData.G,
                  isActive: true,
                  createdBy: req.me.id,
                  createdAt: currentTime,
                  updatedBy: req.me.id,
                  updatedAt: currentTime
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("plantations");
                if (resultData && resultData.length) {
                  success++;
                }
              } else {
                fail++;
                let values = _.values(plantationData)
                values.unshift('Plantation Code already exists')
                errors.push(values);
              }
            }
          }

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
      console.log("[controllers][administrationFeatures][importPlantationData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getUserPlantationByCompany: async (req, res) => {
    try {
      let companyId = req.query.companyId;


      let pagination = {}
      console.log("companyId", companyId);

      let rows = await knexReader("plantations")
        .innerJoin("companies", "plantations.companyId", "companies.id")
        .where({ "plantations.companyId": companyId, "plantations.isActive": 'true' })
        .select([
          "plantations.id as id",
          "plantations.name",
          "companies.companyName",
          "companies.id as cid",
          "companies.companyId",
          "plantations.code as code"
        ])

      console.log("rows", rows);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          plantations: pagination
        },
        message: "Plantation List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getUserPlantationByCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationListHavingPlantContainers: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let plantations = _.flatten(
        req.userPlantationResources.map(v => v.plantations)
      ).map(v => Number(v));

      console.log("==========", plantations, "==========")

      let pagination = {}
      console.log("companyId", companyId);
      let companyHavingPlantations = []
      let companyArr1 = []
      let rows = []

      if (req.query.areaName === 'common') {

        companyHavingPlantations = await knex('plantations').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingPlantations.map(v => v.companyId)
        rows = await knexReader("plantations")
          .innerJoin('companies', 'plantations.companyId', 'companies.id')
          .innerJoin('plant_containers', 'plantations.id', 'plant_containers.plantationId')
          .where({ "plantations.companyId": companyId, "plantations.isActive": true })
          .whereIn('plantations.id', plantations)
          .whereIn('plantations.companyId', companyArr1)
          .select([
            "plantations.id as id",
            "plantations.name",
            "companies.companyName",
            "companies.id as cid",
            "companies.companyId",
            "plantations.code as code"
          ]).groupBy(["plantations.id",
            "plantations.name",
            "companies.companyName",
            "companies.id",
            "companies.companyId",
            "plantations.code"])
          .orderBy('plantations.name', 'asc')
      } else if (req.query.areaName === 'all' && companyId === '') {
        companyHavingPlantations = await knexReader('plantations').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingPlantations.map(v => v.companyId)
        rows = await knexReader("plantations")
          .innerJoin('companies', 'plantations.companyId', 'companies.id')
          .innerJoin('plant_containers', 'plantations.id', 'plant_containers.plantationId')
          .where({ "plantations.isActive": true })
          .whereIn('plantations.id', plantations)
          .whereIn('plantations.companyId', companyArr1)
          .select([
            "plantations.id as id",
            "plantations.name",
            "companies.companyName",
            "companies.id as cid",
            "companies.companyId",
            "plantations.code as code"
          ]).groupBy(["plantations.id",
            "plantations.name",
            "companies.companyName",
            "companies.id",
            "companies.companyId",
            "plantations.code"])
          .orderBy('plantations.name', 'asc')
      } else if (req.query.areaName === 'all') {
        companyHavingPlantations = await knexReader('plantations').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingPlantations.map(v => v.companyId)
        rows = await knexReader("plantations")
          .innerJoin('companies', 'plantations.companyId', 'companies.id')
          .innerJoin('plant_containers', 'plantations.id', 'plant_containers.plantationId')
          .where({ "plantations.companyId": companyId, "plantations.isActive": true, })
          .whereIn('plantations.id', plantations)
          .whereIn('plantations.companyId', companyArr1)
          .select([
            "plantations.id as id",
            "plantations.name",
            "companies.companyName",
            "companies.id as cid",
            "companies.companyId",
            "plantations.code as code"
          ]).groupBy(["plantations.id",
            "plantations.name",
            "companies.companyName",
            "companies.id",
            "companies.companyId",
            "plantations.code"])
          .orderBy('plantations.name', 'asc')
      } else {

        companyHavingPlantations = await knexReader('plantations').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingPlantations.map(v => v.companyId)
        rows = await knexReader("plantations")
          .innerJoin('companies', 'plantations.companyId', 'companies.id')
          .innerJoin('plant_containers', 'plantations.id', 'plant_containers.plantationId')
          .where({ "plantations.companyId": companyId, "plantations.isActive": true })
          .whereIn('plantations.id', plantations)
          .whereIn('plantations.companyId', companyArr1)
          .select([
            "plantations.id as id",
            "plantations.name",
            "companies.companyName",
            "companies.id as cid",
            "companies.companyId",
            "plantations.code as code"
          ]).groupBy(["plantations.id",
            "plantations.name",
            "companies.companyName",
            "companies.id",
            "companies.companyId",
            "plantations.code"])
          .orderBy('plantations.name', 'asc')
      }

      console.log("rows", rows);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          plantations: pagination
        },
        message: "Plantation List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationListHavingPlantContainers] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationById: async (req, res) => {
    try {
      let plantationId = req.body.id
      let orgId = req.orgId

      let result = await knexReader("plantations")
        .select([
          "plantations.id",
          "plantations.name"
        ])
        .where("plantations.id", plantationId)
        .where("plantations.orgId", orgId)

      return res.status(200).json({
        data: {
          plantations: result
        },
        message: "Plantation Record!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationById] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }

};

module.exports = PlantationController;
