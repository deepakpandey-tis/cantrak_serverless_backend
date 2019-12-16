const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
//const trx = knex.transaction();
const fs = require('fs');
const path = require('path');

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
        descriptionThai: Joi.string().optional().allow(""),
        descriptionEng: Joi.string().optional().allow("")
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

      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
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
        descriptionThai: Joi.string().optional().allow(""),
        descriptionEng: Joi.string().optional().allow("")
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

      let currentTime = new Date().getTime();
      let insertData = { ...payload, updatedAt: currentTime };
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
      let sourceofRequestResult = await knex("source_of_request")
        .update({ isActive: false })
        .where({ id: payload.id, orgId: orgId })
        .returning(["*"]);
      sourceofRequest = sourceofRequestResult[0];
      // trx.commit;
      // })
      return res.status(200).json({
        data: {
          sourceofRequest: sourceofRequest
        },
        message: "Source of Request deleted!"
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
      let orgId = req.orgId;
      let userId = req.me.id;

      let reqData = req.query;
      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("source_of_request")
          .where({"orgId": orgId})
          .first(),
        knex("source_of_request")
          .select([
            "id",
            "requestCode as Source Code",
            "descriptionEng as Description English",
            "descriptionThai as Description Thai",
            "isActive as Status",
            "createdBy as Created By",
            "createdAt as Date Created"
          ])
          .where({"orgId": orgId})
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
            "descriptionThai as DESCRIPTION_ALTERNATE",
            "isActive as STATUS"
          ])
          .where({"orgId":orgId})
      ]);

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
      let filename = "SourceOfRequestData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Source_of_Request/" + filename,
          Body: file_buffer,
          ACL: 'public-read'
        }
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            res.status(500).json({
              errors: [
                { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
              ],
            });
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Source_of_Request/" + filename;
            res.status(200).json({
              data: rows,
              message: "Source of Request List",
              url: url
            });
          }
        });
      })

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
          .where({ id: payload.id,orgId:req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("source_of_request");

          requestDetails = _.omit(sourceOfReqeustResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
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
  }
};

module.exports = sourceofRequestController;
