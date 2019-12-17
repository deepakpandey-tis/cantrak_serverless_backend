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

const PartCategoryController = {
  addPartCategory: async (req, res) => {
    try {
      let partCategory = null;
      let userId = req.me.id;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          categoryName: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addpartCategory]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check partCategory already exists
        const existpartCategory = await knex("part_category_master").where({
          categoryName: payload.categoryName, orgId:req.orgId
        });

        console.log(
          "[controllers][generalsetup][addpartCategory]: ServiceCode",existpartCategory
        );

        // Return error when username exist

        if (existpartCategory && existpartCategory.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Part Category already exist !"
              }
            ]
          });
        }

        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        };

        console.log("Part Category Payload: ", insertData);

        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("part_category_master");
        partCategory = insertResult[0];
        trx.commit;
      });

      return res.status(200).json({
        data: {
          partCategory: partCategory
        },
        message: "Part Category added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][partCategory] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updatePartCategory: async (req, res) => {
    try {
      let partCategory = null;
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          categoryName: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updatepartCategory]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check partCategory already exists
         const existpartCategory = await knex("part_category_master")
         .where({ categoryName: payload.categoryName, orgId:req.orgId })
         .whereNot({ id: payload.id});

        console.log(
          "[controllers][generalsetup][addpartCategory]: ServiceCode",existpartCategory
        );

        // Return error when username exist

        if (existpartCategory && existpartCategory.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Part Category already exist !"
              }
            ]
          });
        }

        let currentTime = new Date().getTime();
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id, orgId: req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("part_category_master");
        partCategory = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          partCategory: partCategory
        },
        message: "Part Category updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][updatepartCategory] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewPartCategory: async (req, res) => {
    try {
      let partCategory = null;
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
        let assetCateResult = await knex("part_category_master")
          .select("part_category_master.*")
          .where({ id: payload.id, orgId: req.orgId });

        partCategory = _.omit(assetCateResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          partCategory: partCategory
        },
        message: "Part Category details"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewpartCategory] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deletePartCategory: async (req, res) => {
    try {
      let Project = null;
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
        let ProjectResult = await knex
          .update({ isActive: false })
          .where({ id: payload.id, orgId: req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("projects");
        Project = ProjectResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          Project: Project
        },
        message: "Project deleted!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPartCategoryList: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};
      let orgId   = req.orgId;

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("part_category_master")
          .leftJoin("users", "users.id", "part_category_master.createdBy")
          .where({"part_category_master.orgId":orgId})
          .offset(offset)
          .limit(per_page)
          .first(),
        knex
          .from("part_category_master")
          .leftJoin("users", "users.id", "part_category_master.createdBy")
          .select([
            "part_category_master.id",
            "part_category_master.categoryName as Category Name",
            "part_category_master.isActive as Status",
            "users.name as Created By",
            "part_category_master.createdAt as Date Created"
          ])
          .where({"part_category_master.orgId":orgId})
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
          partCategory: pagination
        },
        message: "Part Category List!"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewpartCategory] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  exportPartCategory: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData   = req.query;
    
      let [rows] = await Promise.all([
        knex
          .from("part_category_master")
          .where({"part_category_master.orgId": req.orgId })
          .select([
            "part_category_master.categoryName as CATEGORY_NAME",
            "part_category_master.isActive as STATUS",
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
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "PartCategoryData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Part_Category/" + filename,
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
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Part_Category/" + filename;
            res.status(200).json({
              data: rows,
              message: "Part Category Data Export Successfully!",
              url: url
            });
          }
        });
      })
      
    } catch (err) {
      console.log("[controllers][partcategory][exportPartCategoy] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = PartCategoryController;
