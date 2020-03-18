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

const AssetCategoryController = {
  addAssetCategory: async (req, res) => {
    try {
      let assetCategory = null;
      let userId = req.me.id;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          categoryName: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addAssetCategory]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check assetCategory already exists
        const existAssetCategory = await knex("asset_category_master")
          .where('categoryName', 'iLIKE', payload.categoryName)
          .where({ orgId: req.orgId });

        console.log(
          "[controllers][generalsetup][addAssetCategory]: ServiceCode",
          existAssetCategory
        );

        // Return error when username exist

        if (existAssetCategory && existAssetCategory.length) {

          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Asset Category already exist!!" }
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

        console.log("Asset Category Payload: ", insertData);

        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("asset_category_master");
        assetCategory = insertResult[0];
        trx.commit;
      });

      return res.status(200).json({
        data: {
          assetCategory: assetCategory
        },
        message: "Asset Category added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][AssetCategory] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateAssetCategory: async (req, res) => {
    try {
      let assetCategory = null;
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          categoryName: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updateAssetCategory]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check assetCategory already exists
        const existAssetCategory = await knex("asset_category_master")
          .where('categoryName', 'iLIKE', payload.categoryName)
          .where({ orgId: req.orgId })
          .whereNot({ id: payload.id });

        console.log(
          "[controllers][generalsetup][addAssetCategory]: ServiceCode",
          existAssetCategory
        );

        // Return error when username exist

        if (existAssetCategory && existAssetCategory.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Asset Category Code already exist !"
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
          .into("asset_category_master");
        assetCategory = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          assetCategory: assetCategory
        },
        message: "Asset Category updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][updateAssetCategory] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewAssetCategory: async (req, res) => {
    try {
      let assetCategory = null;
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
        let assetCateResult = await knex("asset_category_master")
          .select("asset_category_master.*")
          .where({ id: payload.id, orgId: req.orgId });

        assetCategory = _.omit(assetCateResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          assetCategory: assetCategory
        },
        message: "Asset Category details"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewAssetCategory] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deleteAssetCategory: async (req, res) => {
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
        let check = await knex('asset_category_master').select('isActive').where({ id: payload.id, orgId: req.orgId }).first()
        let ProjectResult
        if (check.isActive) {
          ProjectResult = await knex
            .update({ isActive: false })
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .transacting(trx)
            .into("asset_category_master");
        } else {
          ProjectResult = await knex
            .update({ isActive: true })
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .transacting(trx)
            .into("asset_category_master");
        }
        // ProjectResult = await knex
        //   .update({ isActive: false })
        //   .where({ id: payload.id, orgId: req.orgId })
        //   .returning(["*"])
        //   .transacting(trx)
        //   .into("asset_category_master");
        Project = ProjectResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          Project: Project
        },
        message: "asset category status changed"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAssetCategoryList: async (req, res) => {
    try {

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "categoryName";
        sortPayload.orderBy = "asc"
      }
      let reqData = req.query;
      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let { categoryName } = req.body;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("asset_category_master")
          .leftJoin("users", "users.id", "asset_category_master.createdBy")
          .where({ "asset_category_master.orgId": req.orgId })
          .where(qb => {
            if (categoryName) {
              qb.where('asset_category_master.categoryName', 'iLIKE', `%${categoryName}%`)
            }
          })
          .first(),
        knex
          .from("asset_category_master")
          .leftJoin("users", "users.id", "asset_category_master.createdBy")
          .where({ "asset_category_master.orgId": req.orgId })
          .select([
            "asset_category_master.id",
            "asset_category_master.categoryName as Category Name",
            "asset_category_master.isActive as Status",
            "users.name as Created By",
            "asset_category_master.createdAt as Date Created"
          ])
          .where(qb => {
            if (categoryName) {
              qb.where('asset_category_master.categoryName', 'iLIKE', `%${categoryName}%`)
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
          assetCategory: pagination
        },
        message: "Asset Category List!"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewAssetCategory] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**EXPORT ASSET CATEGORY DATA */
  exportAssetCategory: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let orgId = req.orgId;
      let rows = null;
      if (!companyId) {
        [rows] = await Promise.all([
          knex("asset_category_master")
            .leftJoin(
              "companies",
              "asset_category_master.companyId",
              "companies.id"
            )
            .select([
              "asset_category_master.categoryName as CATEGORY_NAME",
              //"companies.companyId as COMPANY",
              //"companies.companyName as COMPANY_NAME",
              // "asset_category_master.isActive as STATUS"
            ])
            .where({ "asset_category_master.orgId": orgId })
        ]);
      } else {
        [rows] = await Promise.all([
          knex("asset_category_master")
            .leftJoin(
              "companies",
              "asset_category_master.companyId",
              "companies.id"
            )
            .select([
              "asset_category_master.categoryName as CATEGORY_NAME",
              //"companies.companyId as COMPANY",
              //"companies.companyName as COMPANY_NAME",
              // "asset_category_master.isActive as STATUS"
            ])
            .where({
              "asset_category_master.orgId": orgId,
              "asset_category_master.companyId": companyId
            })
        ]);
      }
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
      var ws

      if (rows && rows.length) {
        var ws = XLSX.utils.json_to_sheet(rows);

      } else {
        ws = XLSX.utils.json_to_sheet([{ CATEGORY_NAME: '' }]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "AssetCategoryData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Asset_Category/" + filename,
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
            // let deleteFile = fs.unlink(filepath, err => {
            //   console.log("File Deleting Error " + err);
            // });
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Asset_Category/" +
              filename;
            res.status(200).json({
              data: rows,
              message: "Asset Category Data Export Successfully!",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  importAssetCategoryData: async (req, res) => {
    try {
      // if (req.file) {
      //   console.log(req.file);
      //   let tempraryDirectory = null;
      //   if (process.env.IS_OFFLINE) {
      //     tempraryDirectory = "tmp/";
      //   } else {
      //     tempraryDirectory = "/tmp/";
      //   }
      //   let resultData = null;
      //   let file_path = tempraryDirectory + req.file.filename;
      //   let wb = XLSX.readFile(file_path, { type: "binary" });
      //   let ws = wb.Sheets[wb.SheetNames[0]];
      //   let data = XLSX.utils.sheet_to_json(ws, {
      //     type: "string",
      //     header: "A",
      //     raw: false
      //   });
      let data = req.body;
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      let result = null;
      let currentTime = new Date().getTime();
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)


      if (
        data[0].A == "Ã¯Â»Â¿CATEGORY_NAME" ||
        (data[0].A == "CATEGORY_NAME")
      ) {
        if (data.length > 0) {
          let i = 0;
          console.log("Data[0]", data[0]);
          for (let assetCategoryData of data) {
            i++;
            if (i > 1) {




              if (!assetCategoryData.A) {
                let values = _.values(assetCategoryData)
                values.unshift('Asset Category can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              let checkExist = await knex("asset_category_master")
                .select("categoryName")
                .where('categoryName', 'iLIKE', assetCategoryData.A)
                .where({ orgId: req.orgId })
              // .where({
              //   categoryName: assetCategoryData.A,
              //   orgId: req.orgId
              // });
              if (checkExist.length < 1 && assetCategoryData.A) {
                // let categoryIdResult = await knex("companies")
                //   .select("id")
                //   .where({
                //     orgId: req.orgId,
                //     companyId: assetCategoryData.B
                //   });
                //if (categoryIdResult && categoryIdResult.length) {
                success++;
                let insertData = {
                  orgId: req.orgId,
                  categoryName: assetCategoryData.A,
                  isActive: true,
                  createdBy: req.me.id,
                  createdAt: currentTime
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("asset_category_master");
                // } else {
                //   fail++
                // }
              } else {
                let values = _.values(assetCategoryData)
                values.unshift('Asset category already exists')
                errors.push(values);
                fail++;
              }
            }
          }

          // let deleteFile = await fs.unlink(file_path, err => {
          //   console.log("File Deleting Error " + err);
          // });
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

module.exports = AssetCategoryController;
