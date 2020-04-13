const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../../db/knex");
const fs = require('fs');
const path = require('path');


const propertyUnitTypeController = {
  addPropertyUnitType: async (req, res) => {

    try {
      let orgId = req.orgId;
      let userId = req.me.id;
      let propertyType = null;
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          propertyUnitTypeCode: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string()
            .optional()
            .allow("")
            .allow(null)
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



        /*CHECK DUPLICATE VALUES OPEN */
        let existValue = await knex('property_unit_type_master')
          .where({ propertyUnitTypeCode: payload.propertyUnitTypeCode.toUpperCase(), orgId: orgId });
        if (existValue && existValue.length) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Property Unit type code already exist!!" }
            ]
          });
        }
        /*CHECK DUPLICATE VALUES CLOSE */


        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          propertyUnitTypeCode: payload.propertyUnitTypeCode.toUpperCase(),
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
          .into("property_unit_type_master");
        propertyType = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          propertyType: propertyType
        },
        message: "Property Unit Type added successfully."
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
  updatePropertyUnitType: async (req, res) => {
    try {
      let PropertyType = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          propertyUnitTypeCode: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string()
            .optional()
            .allow("")
            .allow(null)
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

        /*CHECK DUPLICATE VALUES OPEN */
        let existValue = await knex('property_unit_type_master')
          .where({ propertyUnitTypeCode: payload.propertyUnitTypeCode.toUpperCase(), orgId: orgId });
        if (existValue && existValue.length) {

          if (existValue[0].id === payload.id) {

          } else {
            return res.status(400).json({
              errors: [
                { code: "VALIDATION_ERROR", message: "Property unit type code Already exist!!" }
              ]
            });
          }
        }
        /*CHECK DUPLICATE VALUES CLOSE */

        let currentTime = new Date().getTime();
        let insertData = { ...payload, propertyUnitTypeCode: payload.propertyUnitTypeCode.toUpperCase(), createdBy: userId, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("property_unit_type_master");
        PropertyType = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          PropertyType: PropertyType
        },
        message: "Property Unit Type details updated successfully."
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
  togglePropertyUnitType: async (req, res) => {
    try {
      let propertyType = null;
      let orgId = req.orgId;
      let message;
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

        let propertyTypeResult;
        let checkStatus = await knex.from('property_unit_type_master').where({ id: payload.id }).returning(['*'])
        // res.json({message:checkStatus[0]})
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive === true) {

            propertyTypeResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("property_unit_type_master");

            message = "Property Unit Type Inactive Successfully!"

          } else {
            propertyTypeResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("property_unit_type_master");
            message = "Property Unit Type Active Successfully!"
          }

        }

        propertyType = propertyTypeResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          PropertyType: propertyType
        },
        message: message
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
  getPropertyUnitTypeList: async (req, res) => {
    try {

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "property_unit_type_master.propertyUnitTypeCode";
        sortPayload.orderBy = "asc"
      }
      let reqData = req.query;
      let orgId = req.orgId;

      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let { searchValue } = req.body;

      let total, rows;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("property_unit_type_master")
          .leftJoin("users", "property_unit_type_master.createdBy", "users.id")
          .where(qb => {
            if (searchValue) {
              qb.where('property_unit_type_master.propertyUnitTypeCode', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('property_unit_type_master.descriptionEng', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('property_unit_type_master.descriptionThai', 'iLIKE', `%${searchValue}%`)
            }
          })
          .where({ "property_unit_type_master.orgId": orgId })
          .first(),
        knex("property_unit_type_master")
          .leftJoin("users", "property_unit_type_master.createdBy", "users.id")
          .select([
            "property_unit_type_master.*",
            "users.name as Created By",
          ])
          .where(qb => {
            if (searchValue) {
              qb.where('property_unit_type_master.propertyUnitTypeCode', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('property_unit_type_master.descriptionEng', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('property_unit_type_master.descriptionThai', 'iLIKE', `%${searchValue}%`)
            }
          })
          .where({ "property_unit_type_master.orgId": orgId })
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
          propertyUnitType: pagination
        },
        message: "Property Unit Type List!"
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

  },
  getAllPropertyUnitTypeList: async (req, res) => {
    try {
     
      let orgId = req.orgId;
      let result = await Promise.all([
        knex("property_unit_type_master").select('*').where({ isActive: true, orgId: orgId }).orderBy('propertyUnitTypeCode','asc')
      ]);
      return res.status(200).json({
        data:{
          result:result        } ,
        message: "Property Unit Type List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPropertyUnitTypeDetail: async (req, res) => {


    let id = req.query.id;
    let details = await knex('property_unit_type_master').where({ id }).first();

    return res.status(200).json({
      data: {
        details: details
      },
      message: "Property unit type details!"
    });
  }

};

module.exports = propertyUnitTypeController;
