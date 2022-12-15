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
const path = require('path');


const plantationTypeController = {
  addPlantationType: async (req, res) => {
    try {
      let orgId = req.orgId;
      let userId = req.me.id;

      let plantationType = null;

      const payload = req.body;

      const schema = Joi.object().keys({
        name: Joi.string().required(),
        code: Joi.string().required(),
        descriptionEng: Joi.string()
          .optional()
          .allow("")
          .allow(null)
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][addPlantationType]: JOi Result",
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
      let existValue = await knex('plantation_types')
        .where({ code: payload.code.toUpperCase(), orgId: orgId });
      if (existValue && existValue.length) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Plantation type code already exist!!" }
          ]
        });
      }
      /*CHECK DUPLICATE VALUES CLOSE */


      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        code: payload.code.toUpperCase(),
        orgId: orgId,
        createdBy: userId,
        createdAt: currentTime,
        updatedBy: userId,
        updatedAt: currentTime
      };
      //insertData     = _.omit(insertData[0], ['descriptionEng'])
      let insertResult = await knex
        .insert(insertData)
        .returning(["*"])
        .into("plantation_types");
      plantationType = insertResult[0];

      return res.status(200).json({
        data: {
          plantationType: plantationType
        },
        message: "Plantation Type added successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][addPlantationType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updatePlantationType: async (req, res) => {
    try {
      let plantationType = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      const payload = req.body;

      const schema = Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string().required(),
        code: Joi.string().required(),
        descriptionEng: Joi.string()
          .optional()
          .allow("").allow(null)
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][updatePlantationType]: JOi Result",
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
      let existValue = await knex('plantation_types')
        .where({ code: payload.code.toUpperCase(), orgId: orgId });
      if (existValue && existValue.length) {

        if (existValue[0].id === payload.id) {

        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Plantation type code Already exist!!" }
            ]
          });
        }
      }
      /*CHECK DUPLICATE VALUES CLOSE */

      let currentTime = new Date().getTime();
      let insertData = { ...payload, code: payload.code.toUpperCase(), updatedBy: userId, updatedAt: currentTime };
      let insertResult = await knex
        .update(insertData)
        .where({ id: payload.id, orgId: orgId })
        .returning(["*"])
        .into("plantation_types");
      plantationType = insertResult[0];

      return res.status(200).json({
        data: {
          plantationType: plantationType
        },
        message: "Plantation Type details updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][updatePlantationType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  deletePlantationType: async (req, res) => {
    try {
      let plantationType = null;
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

      let sqlResult;
      let currentTime = new Date().getTime();
      let checkStatus = await knex.from('plantation_types').where({ id: payload.id }).returning(['*'])
      // res.json({message:checkStatus[0]})
      if (checkStatus && checkStatus.length) {

        if (checkStatus[0].isActive === true) {

          sqlResult = await knex
            .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("plantation_types");

          message = "Plantation Type Inactive Successfully!"

        } else {
          sqlResult = await knex
            .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("plantation_types");
          message = "Plantation Type Active Successfully!"
        }

      }

      plantationType = sqlResult[0];
      return res.status(200).json({
        data: {
          plantationType: plantationType
        },
        message: message
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][deletePlantationType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationTypeList: async (req, res) => {
    try {

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "plantation_types.name";
        sortPayload.orderBy = "asc"
      }
      let reqData = req.query;
      let orgId = req.orgId;

      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let { name,
        code
      } = req.body;

      let total, rows;

      if (name || code) {

        [total, rows] = await Promise.all([
          knexReader
            .count("* as count")
            .from("plantation_types")
            .leftJoin("users", "plantation_types.createdBy", "users.id")
            .where({ "plantation_types.orgId": orgId })
            .where(qb => {
              if (name) {

                qb.where('plantation_types.name', 'iLIKE', `%${name}%`)
              }
              if (code) {
                qb.where('plantation_types.code', 'iLIKE', `%${code}%`)
              }
            })
            .first(),
          knexReader("plantation_types")
            .leftJoin("users", "plantation_types.createdBy", "users.id")
            .select([
              "plantation_types.id",
              "plantation_types.name as Plantation Type",
              "plantation_types.code as Code",
              "plantation_types.isActive as Status",
              "users.name as Created By",
              "plantation_types.createdAt as Date Created"
            ])
            .where({ "plantation_types.orgId": orgId })
            .where(qb => {
              if (name) {

                qb.where('plantation_types.name', 'iLIKE', `%${name}%`)
              }
              if (code) {
                qb.where('plantation_types.code', 'iLIKE', `%${code}%`)
              }
            })
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

        [total, rows] = await Promise.all([
          knexReader
            .count("* as count")
            .from("plantation_types")
            .leftJoin("users", "plantation_types.createdBy", "users.id")
            .where({ "plantation_types.orgId": orgId })
            .first(),
          knexReader("plantation_types")
            .leftJoin("users", "plantation_types.createdBy", "users.id")
            .select([
              "plantation_types.id",
              "plantation_types.name as Plantation Type",
              "plantation_types.code as Code",
              "plantation_types.isActive as Status",
              "users.name as Created By",
              "plantation_types.createdAt as Date Created"
            ])
            .where({ "plantation_types.orgId": orgId })
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
          plantationType: pagination
        },
        message: "Plantation Type List!"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getPlantationTypeList] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  exportPlantationType: async (req, res) => {
    try {
      let orgId = req.orgId;

      let reqData = req.query;
      let rows = null;
      [rows] = await Promise.all([
        knexReader("plantation_types")
          .leftJoin("users", "plantation_types.createdBy", "users.id")
          .select([
            //"plantation_types.orgId as ORGANIZATION_ID",
            //"plantation_types.id as ID ",
            "plantation_types.code as CODE",
            "plantation_types.name as PLANTATION_TYPE",
            "plantation_types.descriptionEng as DESCRIPTION",
            // "plantation_types.isActive as STATUS",
            //"users.name as CREATED BY",
            //"plantation_types.createdBy as CREATED BY ID",
            //"plantation_types.createdAt as DATE CREATED"
          ])
          .where({ "plantation_types.orgId": orgId })
      ]);

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
      //var ws = XLSX.utils.json_to_sheet(rows);

      // if(rows && rows.length) {

      // }

      var ws;
      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            CODE: "",
            PLANTATION_TYPE: "",
            DESCRIPTION: "",
          }
        ]);
      }
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "PlantationTypeData-" + moment(Date.now()).format("YYYYMMDD") + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/PlantationType/" + filename,
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
            let url = process.env.S3_BUCKET_URL + "/Export/PlantationType/" +
              filename;
            //let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/PlantationType/" + filename;
            return res.status(200).json({
              plantationType: rows,
              message: "Plantation Type Data Export Successfully!",
              url: url
            });
          }
        });
      })

    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][exportPlantationType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantationTypeDetails: async (req, res) => {
    try {
      let plantationType = null;
      let orgId = req.orgId;

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
      let sqlResult = await knexReader("plantation_types")
        .select()
        .where({ "id": payload.id, "orgId": orgId });

      plantationType = _.omit(sqlResult[0], [
        "createdAt",
        "updatedAt"
      ]);

      return res.status(200).json({
        data: {
          plantationType: plantationType
        },
        message: "Plantation Type Detail!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantationTypeDetails] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getAllPlantationTypeList: async (req, res) => {
    try {
      let pagination = {};
      let orgId = req.orgId;
      let [result] = await Promise.all([
        knexReader("plantation_types").select('id', 'name', 'code').where({ isActive: 'true', orgId: orgId })
      ]);
      pagination.data = result;
      return res.status(200).json({
        data: {
          plantationType: pagination
        },
        message: "Plantation Type List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getAllPlantationTypeList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /**IMPORT DATA */
  importPlantationTypeData: async (req, res) => {
    try {
      // if (req.file) {
      // console.log(req.file)
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
      console.log("+++++++++++++", data, "=========")
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)


      if (data[0].A == "Ã¯Â»Â¿CODE" || data[0].A == "CODE" &&
        data[0].B == "PLANTATION_TYPE" &&
        data[0].C == "DESCRIPTION"
        //&&
        //data[0].D == "STATUS"
      ) {

        if (data.length > 0) {

          let i = 0;
          for (let ptData of data) {
            i++;

            if (i > 1) {

              if (!ptData.A) {
                let values = _.values(ptData)
                values.unshift('Plantation Type Code can not empty')
                errors.push(values);
                fail++;
                continue;

              }

              if (!ptData.B) {
                let values = _.values(ptData)
                values.unshift('Plantation Type can not empty')
                errors.push(values);
                fail++;
                continue;

              }


              let checkExist = await knex('plantation_types').select('id')
                .where({ code: ptData.A.toUpperCase(), orgId: req.orgId })
              if (checkExist.length < 1) {

                let currentTime = new Date().getTime();
                let insertData = {
                  orgId: req.orgId,
                  code: ptData.A.toUpperCase(),
                  name: ptData.B,
                  descriptionEng: ptData.C,
                  isActive: true,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  createdBy: req.me.id,
                  updatedBy: userId,
                }

                resultData = await knex.insert(insertData).returning(['*']).into('plantation_types');

                if (resultData && resultData.length) {
                  success++;
                }
              } else {
                let values = _.values(ptData)
                values.unshift('Plantation Type Code already exists')
                errors.push(values);
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
          //  let deleteFile = await fs.unlink(file_path, (err) => { console.log("File Deleting Error " + err) })
          return res.status(200).json({
            message: message,
            errors: errors
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
      console.log("[controllers][administrationFeatures][importPlantationTypeData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = plantationTypeController;
