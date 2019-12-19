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
        descriptionThai: Joi.string()
          .optional()
          .allow(""),
        descriptionEng: Joi.string()
          .optional()
          .allow("")
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
          .where({ orgId: orgId })
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
          .where({ orgId: orgId })
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

      fs.readFile(filepath, function(err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Source_of_Request/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function(err, data) {
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
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Source_of_Request/" +
              filename;
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
  },
  // importSourceOfRequest Import Data
  importSourceOfRequest: async (req, res) => {
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
        console.log("+++++++++++++", data, "=========");
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        let result = null;

        if (
          data[0].A == "SOURCE_CODE" ||
          (data[0].A == "Ã¯Â»Â¿SOURCE_CODE" &&
            data[0].B == "DESCRIPTION" &&
            data[0].C == "ALTERNATE_DESCRIPTION")
        ) {
          if (data.length > 0) {
            let i = 0;
            for (let requestData of data) {
              i++;

              if (i > 1) {
                let checkExist = await knex("source_of_request")
                  .select("requestCode")
                  .where({ requestCode: requestData.A, orgId: req.orgId });
                console.log("Check list company: ", checkExist);
                if (checkExist.length < 1) {
                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    requestCode: requestData.A,
                    descriptionEng: requestData.B,
                    descriptionThai: requestData.C,
                    isActive: true,
                    createdAt: currentTime,
                    updatedAt: currentTime
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

module.exports = sourceofRequestController;
