const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;


const propertysubCategoryController = {
  addSubCategory: async (req, res) => {
    try {
      let subCategory = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const subcategoryPayload = req.body;

        console.log("[controllers][subcategory][add]", subcategoryPayload);

        // validate keys
        const schema = Joi.object().keys({
          incidentCategoryId: Joi.number().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          remark: Joi.string().required(),
          incidentTypeId: Joi.number().required()
        });

        const result = Joi.validate(subcategoryPayload, schema);
        console.log("[controllers][subcategory][add]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check typeCode already exists
        // const existSubCategoryCode = await knex('incident_categories').where({ categoryCode: categoryPayload.categoryCode });

        // console.log('[controllers][category][add]: CategoryCode', existCategoryCode);

        // Return error when username exist

        // if (existCategoryCode && existCategoryCode.length) {
        //     return res.status(400).json({
        //         errors: [
        //             { code: 'TYPE_CODE_EXIST_ERROR', message: 'Category Code already exist !' }
        //         ],
        //     });
        // }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        const insertData = {
          ...subcategoryPayload,
          orgId: orgId,
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log("[controllers][subcategory][add]: Insert Data", insertData);

        const incidentResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("incident_sub_categories");

        subCategory = incidentResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          subCategory: subCategory
        },
        message: "SubCategory added successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryAdd] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updateSubCategory: async (req, res) => {
    try {
      let subCategory = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const subCategoryPayload = req.body;

        console.log(
          "[controllers][SubCategory][updateSubCategory]",
          subCategoryPayload
        );

        // validate keys
        const schema = Joi.object().keys({
          id: Joi.number().required(),
          incidentCategoryId: Joi.number().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          remark: Joi.string().required(),
          incidentTypeId: Joi.number().required()
        });

        const result = Joi.validate(subCategoryPayload, schema);
        console.log(
          "[controllers][SubCategory][updateSubCategory]: JOi Result",
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
        // const existCateoryTypeCode = await knex('incident_categories').where({ categoryCode: categoryTypePayload.categoryCode });

        // console.log('[controllers][Category][categoryType]: CategoryTypeCode', existCateoryTypeCode);

        // Return error when username exist

        // if (existCateoryTypeCode && existCateoryTypeCode.length) {
        //     return res.status(400).json({
        //         errors: [
        //             { code: 'TYPE_CODE_EXIST_ERROR', message: 'Category Code already exist !' }
        //         ],
        //     });
        // }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        const updateDataResult = await knex
          .update({
            // descriptionEng: subCategoryPayload.descriptionEng,
            // descriptionThai: subCategoryPayload.descriptionThai,
            ...subCategoryPayload,
            updatedAt: currentTime
          })
          .where({ id: subCategoryPayload.id})
          .returning(["*"])
          .transacting(trx)
          .into("incident_sub_categories");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][SubCategory][updateSubCategory]: Update Data",
          updateDataResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        subCategory = updateDataResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          subCategory: subCategory
        },
        message: "SubCategory updated successfully !"
      });
    } catch (err) {
      console.log(
        "[controllers][Subcategory][subcategoryUpdate] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  deleteSubCategory: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;

      let subCategory = null;

      await knex.transaction(async trx => {
        const subCategoryPayload = req.body;

        console.log(
          "[controllers][Subcategory][subcategoryDelete]",
          subCategoryPayload
        );

        // validate keys
        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(subCategoryPayload, schema);
        console.log(
          "[controllers][Subcategory][subcategoryDelete]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        // Check subcategory Id is exists or not
        const notexistSubCategory = await knex(
          "incident_sub_categories"
        ).where({ id: subCategoryPayload.id,orgId:orgId });

        console.log(
          "[controllers][Subcategory][subcategoryDelete]: SubCategoryId",
          notexistSubCategory
        );

        // Return error when username exist

        if (notexistSubCategory == "") {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "SubCategory does not exist !"
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
          .where({ id: subCategoryPayload.id })
          .returning(["*"])
          .transacting(trx)
          .into("incident_sub_categories");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][category][categoryDelete]: Update Data",
          updateDataResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        subCategory = updateDataResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          subCategory: subCategory
        },
        message: "SubCategory deleted successfully !"
      });
    } catch (err) {
      console.log("[controllers][category][categoryDelete] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  subCategoryList: async (req, res) => {
    try {
      let listSubCategories = null;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        // Get Listing of all active records,

        const DataResult = await knex("incident_sub_categories").where({
          isActive: "true","orgId":orgId
        });

        console.log(
          "[controllers][category][categoryDelete]: View Data",
          DataResult
        );

        listSubCategories = DataResult;

        trx.commit;
      });

      const Parallel = require("async-parallel");
      listSubCategories = await Parallel.map(listSubCategories, async item => {
        let incidentCategory = await knex("incident_categories")
          .where({ id: item.incidentCategoryId,orgId:orgId })
          .select("*");
        item.incidentCategoryDetail = incidentCategory[0];
        delete item.incidentCategoryId;

        let incidentType = await knex("incident_type")
          .where({ id: item.incidentTypeId,orgId:orgId })
          .select("*");
        item.incidentTypeDetail = incidentType[0];
        delete item.incidentTypeId;

        return item;
      });

      res.status(200).json({
        data: {
          Subcategories: listSubCategories
        },
        message: "SubCategories list successfully !"
      });
    } catch (err) {
      console.log("[controllers][subcategory][subcategoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getSubCategoryByCategoryId: async (req, res) => {
    try {
      let incidentCategoryId = req.body.incidentCategoryId;
      let orgId = req.orgId;

      const subCategories = await knex("incident_sub_categories")
        .select("*")
        .where({ incidentCategoryId, "orgId":orgId });
      return res.status(200).json({
        data: {
          subCategories
        },
        message: "List of sub categories"
      });
    } catch (err) {
      console.log("[controllers][subcategory][subcategoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*GET PROBLEM TYPE ALL LIST FOR DROPDOWN */
  getProblemTypeAllList:async (req,res)=>{
    try{
      let orgId = req.orgId;
      let result = await knex.from('incident_type').where({orgId})
      return res.status(200).json({
        data: result,
        message: "List of Problem type"
      });

    } catch (err) {
      console.log("[controllers][subcategory][subcategoryList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = propertysubCategoryController;
