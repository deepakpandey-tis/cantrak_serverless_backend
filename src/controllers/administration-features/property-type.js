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
const path = require('path');
//const trx = knex.transaction();

const propertyTypeController = {
  addPropertyType: async (req, res) => {
    try {
      let orgId = req.orgId;
      let userId = req.me.id;

      let propertyType = null;
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          propertyType: Joi.string().required(),
          propertyTypeCode: Joi.string().required(),
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
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          orgId: orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        //insertData     = _.omit(insertData[0], ['descriptionEng'])
        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("property_types");
        propertyType = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          propertyType: propertyType
        },
        message: "Property Type added successfully."
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
  updatePropertyType: async (req, res) => {
    try {
      let PropertyType = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          propertyType: Joi.string().required(),
          propertyTypeCode: Joi.string().required(),
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
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let currentTime = new Date().getTime();
        let insertData = { ...payload, createdBy: userId, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("property_types");
        PropertyType = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          PropertyType: PropertyType
        },
        message: "Property Type details updated successfully."
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
  deletePropertyType: async (req, res) => {
    try {
      let propertyType = null;
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
        let propertyTypeResult = await knex
          .update({ isActive: false })
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("property_types");
        propertyType = propertyTypeResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          PropertyType: propertyType
        },
        message: "Property Type deleted!"
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
  getPropertyTypeList: async (req, res) => {
    try {
      let reqData = req.query;
      let orgId = req.orgId;

      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("property_types")
          .leftJoin("users", "property_types.createdBy", "users.id")
          .where({ "property_types.isActive": true, "property_types.orgId": orgId })
          .first(),
        knex("property_types")
          .leftJoin("users", "property_types.createdBy", "users.id")
          .select([
            "property_types.id",
            "property_types.propertyType as Property Type",
            "property_types.propertyTypeCode as Property Type Code",
            "property_types.isActive as Status",
            "users.name as Created By",
            "property_types.createdAt as Date Created"
          ])
          .where({ "property_types.isActive": true, "property_types.orgId": orgId })
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
          propertyType: pagination
        },
        message: "Property Type List!"
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
    // Export Building Phase Data
  },
  exportPropertyType: async (req, res) => {
    try {
      let orgId = req.orgId;

      let reqData = req.query;
      let rows = null;
      [rows] = await Promise.all([
        knex("property_types")
          .leftJoin("users", "property_types.createdBy", "users.id")
          .select([
            //"property_types.orgId as ORGANIZATION_ID",
            //"property_types.id as ID ",
            "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
            "property_types.propertyType as PROPERTY_TYPE",
            "property_types.descriptionEng as DESCRIPTION",
            // "property_types.isActive as STATUS",
            //"users.name as CREATED BY",
            //"property_types.createdBy as CREATED BY ID",
            //"property_types.createdAt as DATE CREATED"
          ])
          .where({ "property_types.orgId": orgId })
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
      let filename = "PropertTypeData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/PropertyType/" + filename,
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
            //let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/PropertyType/" + filename;
            return res.status(200).json({
              propertyType: rows,
              message: "Property Type Data Export Successfully!",
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
  getPropertyDetails: async (req, res) => {
    try {
      let property = null;
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
        let propertyResult = await knex("property_types")
          .select()
          .where({ "id": payload.id, "orgId": orgId });

        property = _.omit(propertyResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          property: property
        },
        message: "property details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAllPropertyTypeList: async (req, res) => {
    try {
      let pagination = {};
      let orgId = req.orgId;
      let [result] = await Promise.all([
        knex("property_types").select('id', 'propertyType', 'propertyTypeCode').where({ isActive: 'true', orgId: orgId })
      ]);
      pagination.data = result;
      return res.status(200).json({
        data: {
          propertytype: pagination
        },
        message: "Property List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
   /**IMPORT PROPERTY TYPE DATA */
   importPropertyTypeData: async (req, res) => {
    try {
      if (req.file) {
        console.log(req.file)
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
        console.log("+++++++++++++", data, "=========")
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        let result = null;

        if (data[0].A == "Ã¯Â»Â¿PROPERTY_TYPE_CODE" || data[0].A == "PROPERTY_TYPE_CODE" &&
          data[0].B == "PROPERTY_TYPE" &&
          data[0].C == "DESCRIPTION" 
          //&&
          //data[0].D == "STATUS"
        ) {

          if (data.length > 0) {

            let i = 0;
            for (let propertyData of data) {
              i++;

              if (i > 1) {

                let checkExist = await knex('property_types').select('id')
                  .where({ propertyType: propertyData.B, propertyTypeCode: propertyData.A,orgId:req.orgId })
                if (checkExist.length < 1) {

                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    propertyTypeCode: propertyData.A,
                    propertyType: propertyData.B,
                    descriptionEng: propertyData.C,
                    isActive: true,
                    createdAt: currentTime,
                    updatedAt: currentTime
                  }

                  resultData = await knex.insert(insertData).returning(['*']).into('property_types');

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
              message = "System have processed ( " + totalData + " ) entries and added them successfully!";
            } else {
              message = "System have processed ( " + totalData + " ) entries out of which only ( " + success + " ) are added and others are failed ( " + fail + " ) due to validation!";
            }
            let deleteFile = await fs.unlink(file_path, (err) => { console.log("File Deleting Error " + err) })
            return res.status(200).json({
              message: message,
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
  }
};

module.exports = propertyTypeController;
