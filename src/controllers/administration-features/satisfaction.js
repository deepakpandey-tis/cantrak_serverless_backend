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
const satisfactionController = {
  // Add New Satisfaction //

  addSatisfaction: async (req, res) => {
    try {
      let satisfaction = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let satisfactionPayload = req.body;

        const schema = Joi.object().keys({
          satisfactionCode: Joi.string().required(),
          descriptionEng: Joi.string().allow("").optional(),
          descriptionThai: Joi.string().allow("").optional(),
          remark: Joi.string()
            .allow("")
            .optional(),
          defaultFlag: Joi.string()
            .allow("")
            .optional()
        });

        const result = Joi.validate(satisfactionPayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATON_ERRORS", message: result.error.message }
            ]
          });
        }

        const existSatisfactionCode = await knex("satisfaction").where({
          satisfactionCode: satisfactionPayload.satisfactionCode
        });

        console.log(
          "[controllers][satisfaction][addsatisfaction]: Satisfaction Code",
          existSatisfactionCode
        );

        // Return error when satisfaction code exist

        if (existSatisfactionCode && existSatisfactionCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "STISFACTION_CODE_EXIST_ERROR",
                message: "Satisfaction Code already exist !"
              }
            ]
          });
        }

        // Insert in satisfaction table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...satisfactionPayload,
          satisfactionCode: satisfactionPayload.satisfactionCode.toUpperCase(),
          createdBy: userId,
          orgId: orgId,
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log(
          "[controllers][satisfaction][addsatisfaction]: Insert Data",
          insertData
        );

        const satisfactionResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("satisfaction");

        satisfactionData = satisfactionResult[0];
        trx.commit;
      });

      res.status(200).json({
        data: {
          satisfaction: satisfactionData
        }
      });
    } catch (err) {
      console.log("[controllers][satisfaction][addsatisfaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Update Satisfaction //

  updateSatisfaction: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;

      let updateSatisfactionPayload = null;

      await knex.transaction(async trx => {
        let satisfactionPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          satisfactionCode: Joi.string().required(),
          descriptionEng: Joi.string().allow("").optional(),
          descriptionThai: Joi.string().allow("").optional(),
          remark: Joi.string()
            .allow("")
            .optional(),
          defaultFlag: Joi.string()
            .allow("")
            .optional()
        });

        const result = Joi.validate(satisfactionPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existSatisfactionCode = await knex("satisfaction")
          .where({
            satisfactionCode: satisfactionPaylaod.satisfactionCode.toUpperCase()
          })
          .whereNot({ id: satisfactionPaylaod.id });

        console.log(
          "[controllers][satisfaction][updateSatisfaction]: Satisfaction Code",
          existSatisfactionCode
        );

        // Return error when satisfaction exist

        if (existSatisfactionCode && existSatisfactionCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "SATISFACTION_CODE_EXIST_ERROR",
                message: "Satisfaction Code already exist !"
              }
            ]
          });
        }

        // Insert in satisfaction table,
        const currentTime = new Date().getTime();

        const updateSatisfactionResult = await knex
          .update({
            satisfactionCode: satisfactionPaylaod.satisfactionCode.toUpperCase(),
            descriptionEng: satisfactionPaylaod.descriptionEng,
            descriptionThai: satisfactionPaylaod.descriptionThai,
            remark: satisfactionPaylaod.remark,
            defaultFlag: satisfactionPaylaod.defaultFlag,
            updatedAt: currentTime
          })
          .where({
            id: satisfactionPaylaod.id,
            createdBy: userId,
            orgId: orgId
          })
          .returning(["*"])
          .transacting(trx)
          .into("satisfaction");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][satisfaction][updatesatisfaction]: Update Data",
          updateSatisfactionResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        updateStatusPayload = updateSatisfactionResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          satisfaction: updateStatusPayload
        },
        message: "Satisfaction updated successfully !"
      });
    } catch (err) {
      console.log(
        "[controllers][satisfaction][updatesatisfaction] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Get List of Satisfaction

  getSatisfactionList: async (req, res) => {
    try {
      let reqData = req.query;
      let orgId = req.orgId;

      console.log("==============", orgId, "=================");

      let total = null;
      let rows = null;
      let companyId = reqData.companyId;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("satisfaction")
          .leftJoin("users", "users.id", "satisfaction.createdBy")
          .where({ "satisfaction.orgId": orgId })
          .first(),
        knex("satisfaction")
          .leftJoin("users", "users.id", "satisfaction.createdBy")
          .where({ "satisfaction.orgId": orgId })
          .select([
            "satisfaction.id",
            "satisfaction.satisfactionCode as Satisfaction Code",
            "satisfaction.descriptionEng as Description English",
            "satisfaction.descriptionThai as Description Thai",
            "satisfaction.isActive as Status",
            "users.name as Created By",
            "satisfaction.createdAt as Date Created"
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

      res.status(200).json({
        data: {
          commonAreaLists: pagination
        },
        message: "Satisfaction list successfully!"
      });
    } catch (err) {
      console.log("[controllers][satisfaction][getsatisfaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Delete Satisfaction Area //

  deleteSatisfaction: async (req, res) => {
    try {
      let orgId = req.orgId;
      let satisfaction = null;

      await knex.transaction(async trx => {
        let satisfactionPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(satisfactionPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const validSatisfactionId = await knex("satisfaction").where({
          id: satisfactionPaylaod.id
        });

        console.log(
          "[controllers][satisfaction][deletesatisfaction]: Satisfaction Code",
          validSatisfactionId
        );

        // Return error when username exist

        if (validSatisfactionId && validSatisfactionId.length) {
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
              id: satisfactionPaylaod.id,
              orgId: orgId
            })
            .returning(["*"])
            .transacting(trx)
            .into("satisfaction");

          console.log(
            "[controllers][satisfaction][deletesatisfaction]: Delete Data",
            updateDataResult
          );

          //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

          updateStatusPayload = updateDataResult[0];
        } else {
          return res.status(400).json({
            errors: [
              {
                code: "SATISFACTION_DOES_NOT_EXIST_ERROR",
                message: "Id does not exist!!"
              }
            ]
          });
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          satisfaction: updateStatusPayload
        },
        message: "Satisfaction deleted successfully !"
      });
    } catch (err) {
      console.log("[controllers][satisfaction][deletefaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // Export Satisfaction Data
  exportSatisfaction: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.query;
      let rows = null;
      let companyId = reqData.companyId;

      [rows] = await Promise.all([
        knex("satisfaction")
          .where({ "satisfaction.orgId": orgId })
          .select([
            "satisfaction.satisfactionCode as SATISFACTION_CODE",
            "satisfaction.descriptionEng as DESCRIPTION",
            "satisfaction.descriptionThai as ALTERNATE_DESCRIPTION",
            "satisfaction.defaultFlag as DEFAULT_FLAG"
          ])
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
            SATISFACTION_CODE: "",
            DESCRIPTION: "",
            ALTERNATE_DESCRIPTION: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "SatisfactionData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function(err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Satisfaction/" + filename,
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
            //let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Satisfaction/" +
              filename;
            res.status(200).json({
              data: rows,
              message: "Satisfaction data export successfully!",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][satisfaction][getsatisfaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Get Satisfaction Details

  satisfactionDetails: async (req, res) => {
    try {
      let satisfactionDetail = null;
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

        let current = new Date().getTime();
        let satisfactionResult = await knex("satisfaction")
          .select("satisfaction.*")
          .where({ id: payload.id, orgId: orgId });

        satisfactionDetail = _.omit(satisfactionResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          satisfactionDetails: satisfactionDetail
        },
        message: "Satisfaction Details"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewSatisfaction] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**IMPORT SATISFACTION DATA */
  importSatisfactionData: async (req, res) => {
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
        console.log("+++++++++++++", data, "=========");
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        let result = null;

        if (
          data[0].A == "Ã¯Â»Â¿SATISFACTION_CODE" ||
          (data[0].A == "SATISFACTION_CODE" &&
            data[0].B == "DESCRIPTION" &&
            data[0].C == "ALTERNATE_DESCRIPTION" && data[0].D == "DEFAULT_FLAG")
        ) {
          if (data.length > 0) {
            let i = 0;
            for (let statusData of data) {
              i++;

              if (i > 1) {
                let checkExist = await knex("satisfaction")
                  .select("id")
                  .where({ satisfactionCode: statusData.A, orgId: req.orgId });
                if (checkExist.length < 1) {
                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    satisfactionCode: statusData.A,
                    descriptionEng: statusData.B,
                    descriptionThai: statusData.C,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    defaultFlag:statusData.D,
                    createdBy:req.me.id
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("satisfaction");

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
  }
};

module.exports = satisfactionController;
