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

const sourceofRequestController = {
  addsourceofRequest: async (req, res) => {
    try {
      let orgId = req.orgId;
      let userId = req.me.id;

      let sourceofRequest = null;
      //await knex.transaction(async trx => {
      const payload = req.body;

      const schema = Joi.object().keys({
        requestCode: Joi.string().required(),
        descriptionThai: Joi.string()
          .optional()
          .allow(""),
        descriptionEng: Joi.string()
          .optional()
          .allow("")
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][addbuildingPhase]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }



      const existCode = await knex("source_of_request")
      .where({
        requestCode: payload.requestCode.toUpperCase(),
        orgId:req.orgId
      })

    if (existCode && existCode.length) {
      return res.status(400).json({
        errors: [
          {
            code: "SOURCE_OF_REQUEST_CODE_EXIST_ERROR",
            message: "Source of request Code already exist !"
          }
        ]
      });
    }
      


      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        requestCode: payload.requestCode.toUpperCase(),
        createdBy: userId,
        orgId: orgId,
        createdAt: currentTime,
        updatedAt: currentTime
      };
      //insertData     = _.omit(insertData[0], ['descriptionEng'])
      let insertResult = await knex("source_of_request")
        .insert(insertData)
        .returning(["*"]);
      sourceofRequest = insertResult[0];

      // trx.commit;
      // })

      return res.status(200).json({
        data: {
          sourceofRequest: sourceofRequest
        },
        message: "Source of Request added successfully."
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
  updatesourceofRequest: async (req, res) => {
    try {
      let orgId = req.orgId;
      let userId = req.me.id;

      let sourceofRequest = null;
      // await knex.transaction(async trx => {
      const payload = req.body;

      const schema = Joi.object().keys({
        id: Joi.string().required(),
        requestCode: Joi.string().required(),
        descriptionThai: Joi.string()
          .optional()
          .allow("").allow(null),
        descriptionEng: Joi.string()
          .optional()
          .allow("").allow(null)
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][updatebuildingPhase]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }


      const existCode = await knex("source_of_request")
      .where({
        requestCode: payload.requestCode.toUpperCase(),
        orgId:req.orgId
      })
      .whereNot({ id: payload.id });

    if (existCode && existCode.length) {
      return res.status(400).json({
        errors: [
          {
            code: "SOURCE_OF_REQUEST_CODE_EXIST_ERROR",
            message: "Source of request Code already exist !"
          }
        ]
      });
    }


      let currentTime = new Date().getTime();
      let insertData = { ...payload,requestCode: payload.requestCode.toUpperCase(),updatedAt: currentTime };
      let insertResult = await knex("source_of_request")
        .update(insertData)
        .where({ id: payload.id, createdBy: userId, orgId: orgId })
        .returning(["*"]);
      sourceofRequest = insertResult[0];

      //  trx.commit;
      // })

      return res.status(200).json({
        data: {
          sourceofRequest: sourceofRequest
        },
        message: "Source of Request details updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][updatePropertyType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deletesourceofRequest: async (req, res) => {
    try {
      let sourceofRequest = null;
      let orgId = req.orgId;
      let userId = req.me.id;

      // await knex.transaction(async trx => {
      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required()
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let message;
      let sourceofRequestResult;
      let checkStatus = await knex.from('source_of_request').where({ id: payload.id }).returning(['*'])
      if (checkStatus && checkStatus.length) {

        if (checkStatus[0].isActive == true) {

          sourceofRequestResult = await knex("source_of_request")
            .update({ isActive: false })
            .where({ id: payload.id })
            .returning(["*"]);
          sourceofRequest = sourceofRequestResult[0];
          message = "Service Type deactivate successfully!"
        } else {

          sourceofRequestResult = await knex("source_of_request")
            .update({ isActive: true })
            .where({ id: payload.id })
            .returning(["*"]);
          sourceofRequest = sourceofRequestResult[0];
          message = "Service Type activate successfully!"
        }
      }
      // trx.commit;
      // })
      return res.status(200).json({
        data: {
          sourceofRequest: sourceofRequest
        },
        message: message
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
  // Get Source of Request List
  getsourceofRequestList: async (req, res) => {
    try {

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "source_of_request.requestCode";
        sortPayload.orderBy = "asc"
      }

      let orgId = req.orgId;
      let userId = req.me.id;

      let reqData = req.query;
      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let { searchValue } = req.body;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("source_of_request")
          .leftJoin('users', 'source_of_request.createdBy', 'users.id')
          .where({ 'source_of_request.orgId': orgId })
          .where(qb => {
            if (searchValue) {
              qb.where('source_of_request.requestCode', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('source_of_request.descriptionEng', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('source_of_request.descriptionThai', 'iLIKE', `%${searchValue}%`)
            }
          })
          .first(),
        knex("source_of_request")
          .leftJoin('users', 'source_of_request.createdBy', 'users.id')
          .select([
            "source_of_request.id",
            "source_of_request.requestCode as Source Code",
            "source_of_request.descriptionEng as Description English",
            "source_of_request.descriptionThai as Description Thai",
            "source_of_request.isActive as Status",
            "users.name as Created By",
            "source_of_request.createdAt as Date Created"
          ])
          .where({ 'source_of_request.orgId': orgId })
          .where(qb => {
            if (searchValue) {
              qb.where('source_of_request.requestCode', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('source_of_request.descriptionEng', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('source_of_request.descriptionThai', 'iLIKE', `%${searchValue}%`)
            }
          })
          .orderBy(sortPayload.sortBy, sortPayload.orderBy)
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
          sourceofRequest: pagination
        },
        message: "Source of Request List!"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][get-property-type-list] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
    // Export Source of Request Data
  },
  exportSourceOfRequest: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.query;

      let [rows] = await Promise.all([
        knex("source_of_request")
          .select([
            "requestCode as SOURCE_CODE",
            "descriptionEng as DESCRIPTION",
            "descriptionThai as ALTERNATE_DESCRIPTION"
          ])
          .where({ orgId: orgId })
      ]);

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
            SOURCE_CODE: "",
            DESCRIPTION: "",
            ALTERNATE_DESCRIPTION: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "SourceOfRequestData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Source_of_Request/" + filename,
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

            let url = process.env.S3_BUCKET_URL+"/Export/Source_of_Request/" +
            filename;

            // let url =
            //   "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Source_of_Request/" +
            //   filename;
            res.status(200).json({
              data: rows,
              message: "Source of Request List",
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
  sourceofRequestDetails: async (req, res) => {
    try {
      let requestDetails = null;
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
        let sourceOfReqeustResult = await knex
          .select()
          .where({ id: payload.id, orgId: req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("source_of_request");

        requestDetails = _.omit(sourceOfReqeustResult[0], [
          "createdAt",
          "updatedAt"
        ]);
        trx.commit;
      });
      return res.status(200).json({
        data: {
          requestDetails: requestDetails
        },
        message: "Source of Request details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][sourceOfRequest] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // importSourceOfRequest Import Data
  importSourceOfRequest: async (req, res) => {
    try {

      let data = req.body;
      console.log("+++++++++++++", data, "=========");
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)


      if (
        data[0].B == "DESCRIPTION" &&
        data[0].C == "ALTERNATE_DESCRIPTION" &&
        data[0].A == "SOURCE_CODE" || data[0].A == "Ã¯Â»Â¿SOURCE_CODE"
      ) {
        if (data.length > 0) {
          let i = 0;
          for (let requestData of data) {
            i++;

            if (i > 1) {


              if (!requestData.A) {
                let values = _.values(requestData)
                values.unshift("Source code can not empty")
                errors.push(values);
                fail++;
                continue;
              }


              if (!requestData.B) {
                let values = _.values(requestData)
                values.unshift("Description can not empty")
                errors.push(values);
                fail++;
                continue;
              }


              let checkExist = await knex("source_of_request")
                .select("requestCode")
                .where({ requestCode: requestData.A.toUpperCase(), orgId: req.orgId });
              console.log(checkExist);
              if (checkExist.length < 1) {
                let currentTime = new Date().getTime();
                let insertData = {
                  orgId: req.orgId,
                  requestCode: requestData.A.toUpperCase(),
                  descriptionEng: requestData.B,
                  descriptionThai: requestData.C,
                  isActive: true,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  createdBy: req.me.id
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("source_of_request");

                if (resultData && resultData.length) {
                  success++;
                }
              } else {
                fail++;
                let values = _.values(requestData)
                values.unshift('Source Code already exists.')
                errors.push(values);
                continue;
              }
            }
          }
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
  /*GET ALL SOURCE OF REQUEST LIST */
  getAllSourceOfRequest: async (req, res) => {

    try {
      let orgId = req.orgId;
      let result = await knex.from('source_of_request').where({ orgId: orgId, isActive: true })

      return res.status(200).json({
        data: result,
        message: " All Source of Request"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][sourceOfRequest] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }

  }
};

module.exports = sourceofRequestController;
