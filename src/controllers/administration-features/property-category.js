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


const propertyCategoryController = {
  addCategory: async (req, res) => {
    try {
      let incident = null;
      let orgId = req.orgId;
      let userId = req.me.id;

      await knex.transaction(async trx => {
        const categoryPayload = req.body;

        console.log("[controllers][category][add]", categoryPayload);

        // validate keys
        const schema = Joi.object().keys({
          categoryCode: Joi.string().required(),
          descriptionEng: Joi.string().allow("").optional(),
          descriptionThai: Joi.string().allow("").optional(),
          remark: Joi.string().required()
        });

        const result = Joi.validate(categoryPayload, schema);
        console.log("[controllers][category][add]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check typeCode already exists
        const existCategoryCode = await knex("incident_categories").where({
          categoryCode: categoryPayload.categoryCode,
          orgId: orgId
        });

        console.log(
          "[controllers][category][add]: CategoryCode",
          existCategoryCode
        );

        // Return error when username exist

        if (existCategoryCode && existCategoryCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Category Code already exist !"
              }
            ]
          });
        }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        const insertData = {
          ...categoryPayload,
          orgId: orgId,
          createdBy: userId,
          categoryCode: categoryPayload.categoryCode.toUpperCase(),
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log("[controllers][category][add]: Insert Data", insertData);

        const incidentResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("incident_categories");

        incident = incidentResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          category: incident
        },
        message: "Problem Category added successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryAdd] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updateCategory: async (req, res) => {
    try {
      let incident = null;
      let orgId = req.orgId;
      let userId = req.me.id;

      await knex.transaction(async trx => {
        const categoryTypePayload = req.body;

        console.log(
          "[controllers][Category][categoryType]",
          categoryTypePayload
        );

        // validate keys
        const schema = Joi.object().keys({
          id: Joi.number().required(),
          categoryCode: Joi.string().required(),
          descriptionEng: Joi.string().allow("").optional(),
          descriptionThai: Joi.string().allow("").optional(),
          remark: Joi.string().required()
        });

        const result = Joi.validate(categoryTypePayload, schema);
        console.log(
          "[controllers][Category][categoryType]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check typeCode already exists
        const existCateoryTypeCode = await knex("incident_categories").where({
          categoryCode: categoryTypePayload.categoryCode,
          orgId: orgId
        });

        console.log(
          "[controllers][Category][categoryType]: CategoryTypeCode",
          existCateoryTypeCode
        );

        // Return error when username exist

        if (existCateoryTypeCode && existCateoryTypeCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Category Code already exist !"
              }
            ]
          });
        }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        const updateDataResult = await knex
          .update({
            categoryCode: categoryTypePayload.categoryCode.toUpperCase(),
            descriptionEng: categoryTypePayload.descriptionEng,
            descriptionThai: categoryTypePayload.descriptionThai,
            remark: categoryTypePayload.remark,
            updatedAt: currentTime
          })
          .where({ id: categoryTypePayload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("incident_categories");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][Category][incidentType]: Update Data",
          updateDataResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
        incident = updateDataResult[0];
        trx.commit;
      });

      res.status(200).json({
        data: {
          category: incident
        },
        message: "Problem Category updated successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryUpdate] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      let incident = null;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const categoryDelPayload = req.body;

        console.log(
          "[controllers][category][categoryDelete]",
          categoryDelPayload
        );

        // validate keys
        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(categoryDelPayload, schema);
        console.log(
          "[controllers][category][categoryDelete]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check typeCode already exists
        const notexistCategoryCode = await knex("incident_categories").where({
          id: categoryDelPayload.id
        });

        console.log(
          "[controllers][category][categoryDelete]: CategoryId",
          notexistCategoryCode
        );

        // Return error when username exist

        if (notexistCategoryCode == "") {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Category does not exist !"
              }
            ]
          });
        }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        const updateDataResult = await knex
          .update({ isActive: "false", updatedAt: currentTime })
          .where({ id: categoryDelPayload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("incident_categories");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][category][categoryDelete]: Update Data",
          updateDataResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        incident = updateDataResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          category: incident
        },
        message: "Category deleted successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryDelete] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  propertyCategoryList: async (req, res) => {
    try {
      let listCategories = null;
      let orgId = req.orgId;

      //await knex.transaction(async (trx) => {

      // Insert in users table,

      const DataResult = await knex("property_types")
        .innerJoin("users", "property_types.createdBy", "users.id")
        .select([
          "property_types.propertyType as Property Type",
          "property_types.propertyTypeCode as Property Code",
          "property_types.isActive as Status",
          "users.name as Created By",
          "property_types.createdAt as Date Created"
        ])
        .where({ "property_types.isActive": "true", orgId: orgId });

      //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
      //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

      // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

      console.log(
        "[controllers][category][categoryDelete]: View Data",
        DataResult
      );

      //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

      listCategories = DataResult;

      //  trx.commit;
      //});

      res.status(200).json({
        data: {
          categories: listCategories
        },
        message: "Property Categories list successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  categoryList: async (req, res) => {
    try {
      let listCategories = null;
      let orgId = req.orgId;

      let reqData = req.query;
      let total = null;
      let rows = null;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      //await knex.transaction(async (trx) => {

      [total, rows] = await Promise.all([
        knex.count("* as count").from("incident_categories"),
        knex("incident_categories")
          .select([
            "id as id",
            "categoryCode as Category",
            "descriptionEng as Decription Eng",
            "descriptionThai as Description Thai",
            "isActive as Status",
            "createdBy as Created By",
            "createdAt as Date Created"
          ])
          .where({ orgId: orgId })
          .offset(offset)
          .limit(per_page)
      ]);

      let count = total[0].count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows;

      //  trx.commit;
      //});

      res.status(200).json({
        data: {
          categories: pagination
        },
        message: "Categories list successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**EXPORT PROBLEM CATEGORY */
  exportCategory: async (req, res) => {
    try {
      let orgId = req.orgId;
      const DataResult = await knex("incident_categories")
        .select([
          "categoryCode as CATEGORY_CODE",
          "descriptionEng as DESCRIPTION",
          "descriptionThai as ALTERNATE_DESCRIPTION",
          "remark as REMARK"
        ])
        .where({ orgId: orgId });

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
      if (DataResult && DataResult.length) {
        ws = XLSX.utils.json_to_sheet(DataResult);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            CATEGORY_CODE: "",
            DESCRIPTION: "",
            ALTERNATE_DESCRIPTION: "",
            REMARK: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "ProblemCategoryData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function(err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Problem_Category/" + filename,
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
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Problem_Category/" +
              filename;
            res.status(200).json({
              data: DataResult,
              message: "Problem category data export successfully!",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][category][categoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getCategoryDetails: async (req, res) => {
    try {
      let categoryDetails = null;
      let orgId = req.orgId;
      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.number().required()
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      let categoryResults = await knex("incident_categories")
        .select()
        .where({ id: payload.id, orgId: orgId });

      categoryDetails = _.omit(categoryResults[0], [
        "createdAt",
        "updatedAt",
        "isActive"
      ]);
      return res.status(200).json({
        data: {
          categoryDetail: categoryDetails
        },
        message: "Category details"
      });
    } catch (err) {
      console.log("[controllers][category][viewCategory] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
    // Export Category Data
  },
  exportPropertyCategory: async (req, res) => {
    try {
      let listCategories = null;
      let orgId = req.orgId;

      //await knex.transaction(async (trx) => {

      // Insert in users table,

      const DataResult = await knex("property_types")
        .innerJoin("users", "property_types.createdBy", "users.id")
        .select([
          "property_types.propertyType as Property Type",
          "property_types.propertyTypeCode as Property Code",
          "property_types.isActive as Status",
          "users.name as Created By",
          "property_types.createdAt as Date Created"
        ])
        .where({ "property_types.isActive": "true", orgId: orgId });

      //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
      //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

      // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

      console.log(
        "[controllers][category][categoryDelete]: View Data",
        DataResult
      );

      //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

      listCategories = DataResult;

      //  trx.commit;
      //});

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(listCategories);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "uploads/PropertTypeData-" + Date.now() + ".csv";
      let check = XLSX.writeFile(wb, filename);

      res.status(200).json({
        data: {
          categories: listCategories
        },
        message: "Categories Data Export Successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // ASSET CATEGORY LIST FOR DROP DOWN
  assetCategoryList: async (req, res) => {
    let orgId = req.orgId;

    try {
      let assetCategoryList = await knex("asset_category_master")
        .returning("*")
        .where({ orgId: orgId });

      res.status(200).json({
        data: {
          assetCategoryList: assetCategoryList
        },
        message: "Asset Category List Successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Part CATEGORY LIST FOR DROP DOWN
  partCategoryList: async (req, res) => {
    let orgId = req.orgId;

    try {
      let assetCategoryList = await knex("part_category_master")
        .returning("*")
        .where({ orgId: orgId });

      res.status(200).json({
        data: {
          assetCategoryList: assetCategoryList
        },
        message: "Part Category List Successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**IMPORT PROBLEM CATEGORY DATA */
  importProblemCategoryData: async (req, res) => {
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
          data[0].A == "Ã¯Â»Â¿CATEGORY_CODE" ||
          (data[0].A == "CATEGORY_CODE" &&
            data[0].B == "DESCRIPTION" &&
            data[0].C == "ALTERNATE_DESCRIPTION" &&
            data[0].D == "REMARK")
        ) {
          if (data.length > 0) {
            let i = 0;
            for (let categoryData of data) {
              i++;

              if (i > 1) {
                let checkExist = await knex("incident_categories")
                  .select("id")
                  .where({ categoryCode: categoryData.A, orgId: req.orgId });
                if (checkExist.length < 1) {
                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    categoryCode: categoryData.A,
                    descriptionEng: categoryData.B,
                    descriptionThai: categoryData.C,
                    remark: categoryData.D,
                    createdAt: currentTime,
                    updatedAt: currentTime
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("incident_categories");

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
        "[controllers][propertycategory][importProblemCategoryData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = propertyCategoryController;
