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

const statusController = {
  // Add New Status //

  addStatus: async (req, res) => {
    try {
      let serviceStatus = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let statusPayload = req.body;

        const schema = Joi.object().keys({
          statusCode: Joi.string().required(),
          descriptionEng: Joi.string().allow("").optional(),
          descriptionThai: Joi.string().allow("").optional(),
          remark: Joi.string().required(),
          defaultFlag: Joi.string().required()
        });

        const result = Joi.validate(statusPayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATON_ERRORS", message: result.error.message }
            ]
          });
        }

        const existStatusCode = await knex("service_status").where({
          statusCode: statusPayload.statusCode
        });

        console.log(
          "[controllers][status][addstatus]: Status Code",
          existStatusCode
        );

        // Return error when username exist

        if (existStatusCode && existStatusCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "STATUS_CODE_EXIST_ERROR",
                message: "Status Code already exist !"
              }
            ]
          });
        }

        // Insert in common area table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...statusPayload,
          createdBy: userId,
          orgId: orgId,
          statusCode: statusPayload.statusCode.toUpperCase(),
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log(
          "[controllers][status][addstatus]: Insert Data",
          insertData
        );

        const statusResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("service_status");

        sstatus = statusResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          serviceStatus: sstatus
        }
      });
    } catch (err) {
      console.log("[controllers][status][addstatus] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Update Status //

  updateStatus: async (req, res) => {
    try {
      let updateStatusPayload = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let statusPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          statusCode: Joi.string().required(),
          descriptionEng: Joi.string().allow("").optional(),
          descriptionThai: Joi.string().allow("").optional(),
          remark: Joi.string().required(),
          defaultFlag: Joi.string().required()
        });

        const result = Joi.validate(statusPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existStatusCode = await knex("service_status")
          .where({ statusCode: statusPaylaod.statusCode.toUpperCase() })
          .whereNot({ id: statusPaylaod.id });

        console.log(
          "[controllers][status][updateStatus]: Status Code",
          existStatusCode
        );

        // Return error when username exist

        if (existStatusCode && existStatusCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "COMMON_AREA_CODE_EXIST_ERROR",
                message: "Status Code already exist !"
              }
            ]
          });
        }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        const updateStatusResult = await knex
          .update({
            statusCode: statusPaylaod.statusCode.toUpperCase(),
            descriptionEng: statusPaylaod.descriptionEng,
            descriptionThai: statusPaylaod.descriptionThai,
            remark: statusPaylaod.remark,
            defaultFlag: statusPaylaod.defaultFlag,
            updatedAt: currentTime
          })
          .where({
            id: statusPaylaod.id,
            createdBy: userId,
            orgId: orgId
          })
          .returning(["*"])
          .transacting(trx)
          .into("service_status");

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
          commonArea: updateStatusPayload
        },
        message: "Status updated successfully !"
      });
    } catch (err) {
      console.log("[controllers][status][updateStatus] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Get List of Common Area

  getStatusList: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.query;
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
          .from("service_status")
          .first(),
        knex("service_status")
          .select([
            "id",
            "statusCode as Status Code",
            "descriptionEng as Description English",
            "descriptionThai as Description Thai",
            "isActive as Status",
            //  "createdby as Created By",
            "createdAt as Date Created"
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
        message: "Status list successfully !"
      });
    } catch (err) {
      console.log("[controllers][status][getstatus] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Delete Common Area //

  deleteStatus: async (req, res) => {
    try {
      let delCommonPayload = null;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let statusPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(statusPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const validStatusId = await knex("service_status").where({
          id: statusPaylaod.id
        });

        console.log(
          "[controllers][status][deletestatus]: Status Code",
          validStatusId
        );

        // Return error when username exist

        if (validStatusId && validStatusId.length) {
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
              id: statusPaylaod.id,
              orgId: orgId
            })
            .returning(["*"])
            .transacting(trx)
            .into("service_status");

          console.log(
            "[controllers][status][deletestatus]: Delete Data",
            updateDataResult
          );

          //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

          updateStatusPayload = updateDataResult[0];
        } else {
          return res.status(400).json({
            errors: [
              {
                code: "STATUS_ID_DOES_NOT_EXIST_ERROR",
                message: "Id does not exist!!"
              }
            ]
          });
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          status: updateStatusPayload
        },
        message: "Status deleted successfully !"
      });
    } catch (err) {
      console.log("[controllers][commonArea][updatecommonArea] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
    // Export Status Data
  },
  exportStatus: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.query;
      let rows = null;
      [rows] = await Promise.all([
        knex("service_status")
          .select([
            "statusCode as STATUS_CODE",
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
            STATUS_CODE: "",
            DESCRIPTION: "",
            ALTERNATE_DESCRIPTION: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "ServiceStatusData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function(err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Service_Status/" + filename,
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
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Service_Status/" +
              filename;
            res.status(200).json({
              data: rows,
              message: "Status Data Export Successfully!",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][status][getstatus] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  statusDetails: async (req, res) => {
    try {
      let statusDetail = null;
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
        let StatusResult = await knex("service_status")
          .select("service_status.*")
          .where({ id: payload.id});

        statusDetail = _.omit(StatusResult[0], [
          "createdAt",
          "updatedAt"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          statusDetails: statusDetail
        },
        message: "Status Details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewStatus] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**IMPORT SERVICE STATUS DATA */
  importServiceStatusData: async (req, res) => {
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
          data[0].A == "Ã¯Â»Â¿STATUS_CODE" ||
          (data[0].A == "STATUS_CODE" &&
            data[0].B == "DESCRIPTION" &&
            data[0].C == "ALTERNATE_DESCRIPTION")
        ) {
          if (data.length > 0) {
            let i = 0;
            for (let statusData of data) {
              i++;

              if (i > 1) {
                let checkExist = await knex("service_status")
                  .select("id")
                  .where({ statusCode: statusData.A, orgId: req.orgId });
                if (checkExist.length < 1) {
                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    statusCode: statusData.A,
                    descriptionEng: statusData.B,
                    descriptionThai: statusData.C,
                    createdAt: currentTime,
                    updatedAt: currentTime
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("service_status");

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
  },
  /*GET ALL STATUS LIST FOR DROP DOWN */
  getAllStatus:async (req,res)=>{
    try{

      let orgId  = req.orgId;
      let result = await knex.from('service_status')
                   .select('id',"statusCode","descriptionEng",)
                   .where({orgId})
      return res.status(200).json({
        data:result,
        message:"All Status list"
      });

    }catch(err){
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = statusController;
