const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");


const whtController = {
  // Add New WHT Taxes //

  addWht: async (req, res) => {
    try {
      let whtView = null;
      await knex.transaction(async trx => {
        let whtPayload = req.body;
        const userId = req.me.id;

        const schema = Joi.object().keys({
          whtCode: Joi.string().required(),
          taxPercentage: Joi.string().required(),
          descriptionEng: Joi.string()
            .allow("")
            .optional(),
          descriptionThai: Joi.string()
            .allow("")
            .optional(),
          glAccountCode: Joi.string()
            .allow("")
            .optional()
        });

        const result = Joi.validate(whtPayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATON_ERRORS", message: result.error.message }
            ]
          });
        }

        const existWhtCode = await knex("wht_master").where({
          whtCode: whtPayload.whtCode,
          orgId: req.orgId
        });

        console.log("[controllers][tax][addwht]: Wht Code", existWhtCode);

        // Return error when satisfaction code exist

        if (existWhtCode && existWhtCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TAX_CODE_EXIST_ERROR",
                message: "WHT Code already exist !"
              }
            ]
          });
        }

        // Insert in satisfaction table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...whtPayload,
          whtCode: whtPayload.whtCode.toUpperCase(),
          createdBy: userId,
          orgId: req.orgId,
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log("[controllers][tax][addtax]: Insert Data", insertData);

        const taxResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("wht_master");

        whtView = taxResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          whtadds: whtView
        },
        message: "WHT Tax added successfully !"
      });
    } catch (err) {
      console.log("[controllers][tax][addtax] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Update Taxes //

  updateWht: async (req, res) => {
    try {
      let updateWhtPayload = null;

      await knex.transaction(async trx => {
        let taxesPaylode = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          whtCode: Joi.string().required(),
          taxPercentage: Joi.string().required(),
          descriptionEng: Joi.string()
            .allow("")
            .optional(),
          descriptionThai: Joi.string()
            .allow("")
            .optional(),
          glAccountCode: Joi.string()
            .allow("")
            .optional()
        });

        const result = Joi.validate(taxesPaylode, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).jtaxson({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existTaxesCode = await knex("wht_master")
          .where({ whtCode: taxesPaylode.whtCode.toUpperCase() })
          .whereNot({ id: taxesPaylode.id });

        console.log("[controllers][tax][updateTax]: Tax Code", existTaxesCode);

        // Return error when satisfaction exist

        if (existTaxesCode && existTaxesCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TAX_CODE_EXIST_ERROR",
                message: "Tax Code already exist !"
              }
            ]
          });
        }

        // Insert in satisfaction table,
        const currentTime = new Date().getTime();

        const updateTaxResult = await knex
          .update({
            whtCode: taxesPaylode.whtCode.toUpperCase(),
            glAccountCode: taxesPaylode.glAccountCode,
            descriptionEng: taxesPaylode.descriptionEng,
            descriptionThai: taxesPaylode.descriptionThai,
            taxPercentage: taxesPaylode.taxPercentage,
            glAccountCode: taxesPaylode.glAccountCode,
            updatedAt: currentTime
          })
          .where({
            id: taxesPaylode.id
          })
          .returning(["*"])
          .transacting(trx)
          .into("wht_master");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][tax][updateTax]: Update Taxes",
          updateTaxResult
        );

        updateWhtPayload = updateTaxResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          whtUpdate: updateWhtPayload
        },
        message: "WHT Tax updated successfully !"
      });
    } catch (err) {
      console.log("[controllers][tax][updateTax] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Get List of Taxes

  getWhtList: async (req, res) => {
    try {
      let reqData = req.query;
      let total = null;
      let rows = null;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("wht_master")
          .leftJoin("users", "users.id", "wht_master.createdBy")
          .where({ "wht_master.orgId": req.orgId })
          .offset(offset)
          .limit(per_page)
          .first(),
        knex
          .from("wht_master")
          .leftJoin("users", "users.id", "wht_master.createdBy")
          .where({ "wht_master.orgId": req.orgId })
          .select([
            "wht_master.id",
            "wht_master.whtCode as Wht Code",
            "wht_master.taxPercentage as Tax Percentage",
            "wht_master.isActive as Status",
            "users.name as Created By",
            "wht_master.createdAt as Date Created"
          ])
          .orderBy('wht_master.id','desc')
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
          whtList: pagination
        },
        message: "Wht list successfully !"
      });
    } catch (err) {
      console.log("[controllers][tax][getwhttax] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Delete Tax //

  deleteWht: async (req, res) => {
    try {
      let delTaxPayload = null;

      await knex.transaction(async trx => {
        let taxPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(taxPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const validTaxesId = await knex("taxes").where({ id: taxPaylaod.id });

        console.log("[controllers][tax][deletetax]: Taxes Code", validTaxesId);

        // Return error when username exist

        if (validTaxesId && validTaxesId.length) {
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
              id: taxPaylaod.id
            })
            .returning(["*"])
            .transacting(trx)
            .into("taxes");

          console.log(
            "[controllers][tax][deletetax]: Delete Data",
            updateDataResult
          );

          //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

          updateTaxPayload = updateDataResult[0];
        } else {
          return res.status(400).json({
            errors: [
              {
                code: "TAXES_DOES_NOT_EXIST_ERROR",
                message: "Id does not exist!!"
              }
            ]
          });
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          taxes: updateTaxPayload
        },
        message: "Taxes deleted successfully !"
      });
    } catch (err) {
      console.log("[controllers][tax][deletetax] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // View Details Wht //
  viewWhtDetails: async (req, res) => {
    try {
      let whtDetail = null;
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
        let whtsResult = await knex("wht_master")
          .select("wht_master.*")
          .where({ id: payload.id });

        whtDetail = _.omit(whtsResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          whtDetails: whtDetail
        },
        message: "Wht Tax details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][whttax] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  exportWhtData: async (req, res) => {
    try {
      let reqData = req.query;
      let orgId = req.orgId;

      let rows = null;

      [rows] = await Promise.all([
        knex
          .from("wht_master")
          .leftJoin("users", "users.id", "wht_master.createdBy")
          .where({ "wht_master.orgId": req.orgId })
          .select([
            "wht_master.whtCode as WHT_CODE",
            "wht_master.taxPercentage as TAX_PERCENTAGE",
            "wht_master.descriptionEng as DESCRIPTION",
            "wht_master.descriptionThai as ALTERNATE_LANGUAGE_DESCRIPTION",
            "wht_master.glAccountCode as GL_ACCOUNT_CODE",
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
            WHT_CODE: "",
            TAX_PERCENTAGE: "",
            DESCRIPTION: "",
            ALTERNATE_LANGUAGE_DESCRIPTION: "",
            GL_ACCOUNT_CODE: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "WhtData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Wht/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Wht/" +
              filename;

            res.status(200).json({
              data: {
                taxes: rows
              },
              message: "Wht export successfully !",
              url: url
            });
          }
        });
      });
      //let deleteFile   = await fs.unlink(filepath,(err)=>{ console.log("File Deleting Error "+err) })

    } catch (err) {
      console.log("[controllers][tax][gettax] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  importWhtData: async (req, res) => {
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
        let currentTime = new Date().getTime();

        //console.log('DATA: ',data)
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        let errors = []
        let header = Object.values(data[0]);
        header.unshift('Error');
        errors.push(header)

        if (
          data[0].A == "Ã¯Â»Â¿WHT_CODE" ||
          (data[0].A == "WHT_CODE" &&
            data[0].B == "TAX_PERCENTAGE" &&
            data[0].C == "DESCRIPTION" &&
            data[0].D == "ALTERNATE_LANGUAGE_DESCRIPTION" &&
            data[0].E == "GL_ACCOUNT_CODE"
          )
        ) {
          if (data.length > 0) {
            let i = 0;
            console.log("Data[0]", data[0]);
            for (let whtData of data) {
              i++;
              if (i > 1) {
                let checkExist = await knex("wht_master")
                  .select("whtCode")
                  .where({
                    whtCode: whtData.A,
                    orgId: req.orgId
                  });
                if (checkExist.length < 1) {
                  let insertData = {
                    orgId: req.orgId,
                    whtCode: whtData.A,
                    taxPercentage: whtData.B,
                    isActive: true,
                    createdBy: req.me.id,
                    createdAt: currentTime,
                    descriptionEng: whtData.C,
                    descriptionThai: whtData.D,
                    glAccountCode: whtData.E,

                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("wht_master");
                  if (resultData && resultData.length) {
                    success++;
                  }
                } else {
                  let values = _.values(whtData)
                  values.unshift('WHT code already exists')
                  errors.push(values);
                  fail++;
                }
              }
            }

            let deleteFile = await fs.unlink(file_path, err => {
              console.log("File Deleting Error " + err);
            });

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

module.exports = whtController;
