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
        const existAssetCategory = await knex("asset_category_master").where({
          categoryName: payload.categoryName, orgId:req.orgId
        });

        console.log(
          "[controllers][generalsetup][addAssetCategory]: ServiceCode",existAssetCategory
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
         .where({ categoryName: payload.categoryName, orgId:req.orgId })
         .whereNot({ id: payload.id});

        console.log(
          "[controllers][generalsetup][addAssetCategory]: ServiceCode",existAssetCategory
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
  getAssetCategoryList: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("asset_category_master")
          .leftJoin("users", "users.id", "asset_category_master.createdBy")
          .where({ "asset_category_master.orgId": req.orgId })
          .offset(offset)
          .limit(per_page)
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
  exportAssetCategory: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")
            .first(),
          knex("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")
            .select([
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "projects.isActive as Status",
              "users.name as Created By",
              "projects.createdAt as Date Created"
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
      } else {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")
            .where({ "projects.companyId": companyId })
            .offset(offset)
            .limit(per_page)
            .first(),
          knex
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")
            .where({ "projects.companyId": companyId })
            .select([
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "projects.isActive as Status",
              "users.name as Created By",
              "projects.createdAt as Date Created"
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
      }
      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(pagination.data);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "uploads/ProjectData-" + Date.now() + ".csv";
      let check = XLSX.writeFile(wb, filename);

      return res.status(200).json({
        data: pagination.data,
        message: "Project Data Export Successfully!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = AssetCategoryController;
