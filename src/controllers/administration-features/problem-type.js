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


const problemTypeController = {
  // Add New Problem Type //

  addProblemType: async (req, res) => {
    try {
      let problemType;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let problemTypePayload = req.body;

        const schema = Joi.object().keys({
          typeCode: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string().allow("").optional()
        });

        const result = Joi.validate(problemTypePayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATON_ERRORS", message: result.error.message }
            ]
          });
        }

        const existTypeCode = await knex("incident_type").where({
          typeCode: problemTypePayload.typeCode
        });

        console.log(
          "[controllers][problem][addproblem]: Type Code",
          existTypeCode
        );

        // Return error when username exist

        if (existTypeCode && existTypeCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Problem Type Code already exist !"
              }
            ]
          });
        }

        // Insert in common area table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...problemTypePayload,
          createdBy: userId,
          orgId: orgId,
          typeCode: problemTypePayload.typeCode.toUpperCase(),
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log(
          "[controllers][problem][addproblemtyep]: Insert Data",
          insertData
        );

        const problemResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("incident_type");
        problemTypes = problemResult[0];
        trx.commit;
      });

      res.status(200).json({
        data: {
          problemType: problemTypes
        },
        message: "Problem Type Added Successfully!!"
      });
    } catch (err) {
      console.log("[controllers][problem][addproblemtyep] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // Update ProblemType //

  updateProblemType: async (req, res) => {
    try {
      let updateStatusPayload = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let statusPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          typeCode: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string().allow("").allow(null).optional()
        });

        const result = Joi.validate(statusPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existStatusCode = await knex("incident_type")
          .where({ typeCode: statusPaylaod.typeCode.toUpperCase() })
          .whereNot({ id: statusPaylaod.id });

        console.log(
          "[controllers][status][updateStatus]: Status Code",
          existStatusCode
        );

        // Return error when username exist

        // if (existStatusCode && existStatusCode.length) {
        //   return res.status(400).json({
        //     errors: [
        //       {
        //         code: "COMMON_AREA_CODE_EXIST_ERROR",
        //         message: "Problem Type Code already exist !"
        //       }
        //     ]
        //   });
        // }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        const updateStatusResult = await knex
          .update({
            typeCode: statusPaylaod.typeCode.toUpperCase(),
            descriptionEng: statusPaylaod.descriptionEng,
            descriptionThai: statusPaylaod.descriptionThai,
            updatedAt: currentTime
          })
          .where({
            id: statusPaylaod.id,
            createdBy: userId,
            orgId: orgId
          })
          .returning(["*"])
          .transacting(trx)
          .into("incident_type");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][status][updateStatus]: Update Data",
          updateStatusResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        updateStatusPayload = updateStatusResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          problemTypes: updateStatusPayload
        },
        message: "Problem Type updated successfully !"
      });
    } catch (err) {
      console.log("[controllers][status][updateStatus] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProblemTypeList: async (req, res) => {
    try {
      let reqData = req.query;
      console.log("reqQuery", reqData);
      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("incident_type")
          .leftJoin("users", "users.id", "incident_type.createdBy")
          .where({ "incident_type.orgId": req.orgId })
          .offset(offset)
          .limit(per_page)
          .first(),
        knex
          .from("incident_type")
          .leftJoin("users", "users.id", "incident_type.createdBy")
          .where({ "incident_type.orgId": req.orgId })
          .select([
            "incident_type.id as id",
            "incident_type.typeCode as Problem Type Code",
            "incident_type.descriptionEng as Description Eng",
            "incident_type.descriptionThai as Description Thai",
            "incident_type.isActive as Status",
            "users.name as Created By",
            "incident_type.createdAt as Date Created"
          ])
          .orderBy('incident_type.id', 'desc')
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
          problemType: pagination
        },
        message: "problem type List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProblemType] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewProblemType: async (req, res) => {
    try {
      let problemTypeDetail = null;
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
        let problemResult = await knex("incident_type")
          .select("incident_type.*")
          .where({ id: payload.id, orgId: orgId });

        problemTypeDetail = _.omit(problemResult[0], [
          "createdAt",
          "updatedAt"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          problemTypeDetails: problemTypeDetail
        },
        message: "Problem Type Details !!"
      });
    } catch (err) {
      console.log(
        "[controllers][problem][viewProblemTypeDetails] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**EXPORT PROBLEM TYPE DATA */
  exportProblemTypeData: async (req, res) => {

    try {
      let reqData = req.query;
      let rows;
      [rows] = await Promise.all([
        knex
          .from("incident_type")
          .where({ "incident_type.orgId": req.orgId })
          .select([
            "incident_type.typeCode as PROBLEM_TYPE_CODE",
            "incident_type.descriptionEng as DESCRIPTION",
            "incident_type.descriptionThai as ALTERNATE_DESCRIPTION"
          ])
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
      var ws;

      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            PROBLEM_TYPE_CODE: "",
            DESCRIPTION: "",
            ALTERNATE_DESCRIPTION: "",
          }
        ]);
      }
      //var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "ProblemTypeData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Problem_Type/" + filename,
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
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Problem_Type/" + filename;
            res.status(200).json({
              data: rows,
              message: "Problem Type  data export successfully!",
              url: url
            });
          }
        });
      })
    } catch (err) {
      console.log("[controllers][generalsetup][viewProblemType] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**IMPORT PROBLEM TYPE DATA */
  importProblemTypeData: async (req, res) => {
    try {

      if (req.file) {
        const userId = req.me.id;
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
          tempraryDirectory = 'tmp/';
        } else {
          tempraryDirectory = '/tmp/';
        }
        let resultData = null;
        let file_path = tempraryDirectory + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: 'binary' });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });

        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        console.log("=======", data[0], "+++++++++++++++")
        let result = null;
        let errors = []
        let header = Object.values(data[0]);
        header.unshift('Error');
        errors.push(header)

        if (
          data[0].A == "Ã¯Â»Â¿PROBLEM_TYPE_CODE" ||
          (data[0].A == "PROBLEM_TYPE_CODE" &&
            data[0].B == "DESCRIPTION" &&
            data[0].C == "ALTERNATE_DESCRIPTION")
        ) {
          if (data.length > 0) {
            let i = 0;
            for (let problemData of data) {
              i++;

              if (i > 1) {
                let checkExist = await knex("incident_type")
                  .select("id")
                  .where({ typeCode: problemData.A, orgId: req.orgId });
                if (checkExist.length < 1) {
                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    typeCode: problemData.A,
                    descriptionEng: problemData.B,
                    descriptionThai: problemData.C,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    createdBy: userId
                  };
                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("incident_type");
                  if (resultData && resultData.length) {
                    success++;
                  }
                } else {
                  let values = _.values(problemData)
                  values.unshift('Problem type code already exists')
                  errors.push(values);
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
              message: message,
              errors:errors
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
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*TOGGLE PROBLEM TYPE */
  toggleProblemType: async (req, res) => {
    try {
      let problemType = null;
      let message;
      await knex.transaction(async trx => {
        let payload = req.body;
        let orgId = req.orgId;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let problemTypeResult;
        let checkStatus = await knex.from('incident_type').where({ id: payload.id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            problemTypeResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("incident_type");
            problemType = problemTypeResult[0];
            message = "Problem Type deactivate successfully!"

          } else {

            problemTypeResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("incident_type");
            problemType = problemTypeResult[0];
            message = "Problem Type activate successfully!"
          }
        }
        trx.commit;
      });

      return res.status(200).json({
        data: {
          problemType: problemType
        },
        message: message
      });
    } catch (err) {
      console.log(
        "[controllers][problem-type][toggleProblemType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = problemTypeController;
