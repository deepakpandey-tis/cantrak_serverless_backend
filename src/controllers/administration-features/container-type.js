const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../../db/knex");
const knexReader = require("../../db/knex-reader");
const fs = require('fs');
const path = require('path');


const containerTypeController = {
  addContainerType: async (req, res) => {

    try {
      let orgId = req.orgId;
      let userId = req.me.id;
      let containerType = null;

      const payload = req.body;

      const schema = Joi.object().keys({
        code: Joi.string().required(),
        descriptionEng: Joi.string().required(),
        descriptionThai: Joi.string()
          .optional()
          .allow("")
          .allow(null)
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][addContainerType]: JOi Result",
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
      let existValue = await knex('container_types')
        .where({ code: payload.code.toUpperCase(), orgId: orgId });
      if (existValue && existValue.length) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Container Type code already exist!!" }
          ]
        });
      }
      /*CHECK DUPLICATE VALUES CLOSE */


      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        code: payload.code.toUpperCase(),
        orgId: orgId,
        createdBy: userId,
        createdAt: currentTime,
        updatedBy: userId,
        updatedAt: currentTime
      };
      //insertData     = _.omit(insertData[0], ['descriptionEng'])
      let insertResult = await knex
        .insert(insertData)
        .returning(["*"])
        .into("container_types");
      containerType = insertResult[0];


      return res.status(200).json({
        data: {
          containerType: containerType
        },
        message: "Container Type added successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][addContainerType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updateContainerType: async (req, res) => {
    try {
      let containerType = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      const payload = req.body;

      const schema = Joi.object().keys({
        id: Joi.string().required(),
        code: Joi.string().required(),
        descriptionEng: Joi.string().required(),
        descriptionThai: Joi.string()
          .optional()
          .allow("")
          .allow(null)
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][updateContainerType]: JOi Result",
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
      let existValue = await knex('container_types')
        .where({ code: payload.code.toUpperCase(), orgId: orgId });
      if (existValue && existValue.length) {

        if (existValue[0].id === payload.id) {

        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Container Type code Already exist!!" }
            ]
          });
        }
      }
      /*CHECK DUPLICATE VALUES CLOSE */

      let currentTime = new Date().getTime();
      let insertData = { ...payload, code: payload.code.toUpperCase(), updatedBy: userId, updatedAt: currentTime };
      let insertResult = await knex
        .update(insertData)
        .where({ id: payload.id, orgId: orgId })
        .returning(["*"])
        .into("container_types");
      containerType = insertResult[0];

      return res.status(200).json({
        data: {
          containerType: containerType
        },
        message: "Container Type detail updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][updateContainerType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  toggleContainerType: async (req, res) => {
    try {
      let containerType = null;
      let userId = req.me.id;
      let orgId = req.orgId;
      let message;

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

      let containerTypeResult;
      let currentTime = new Date().getTime();
      let checkStatus = await knex.from('container_types').where({ id: payload.id }).returning(['*'])
      // res.json({message:checkStatus[0]})
      if (checkStatus && checkStatus.length) {

        if (checkStatus[0].isActive === true) {

          containerTypeResult = await knex
            .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("container_types");

          message = "Container Type Inactive Successfully!"

        } else {
          containerTypeResult = await knex
            .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("container_types");
          message = "Container Type Active Successfully!"
        }

      }

      containerType = containerTypeResult[0];

      return res.status(200).json({
        data: {
          containerType: containerType
        },
        message: message
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][toggleContainerType] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getContainerTypeList: async (req, res) => {
    try {

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "container_types.code";
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
        knexReader
          .count("* as count")
          .from("container_types")
          .leftJoin("users", "container_types.createdBy", "users.id")
          .where(qb => {
            if (searchValue) {
              qb.where('container_types.code', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('container_types.descriptionEng', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('container_types.descriptionThai', 'iLIKE', `%${searchValue}%`)
            }
          })
          .where({ "container_types.orgId": orgId })
          .first(),
        knexReader("container_types")
          .leftJoin("users", "container_types.createdBy", "users.id")
          .select([
            "container_types.*",
            "users.name as Created By",
          ])
          .where(qb => {
            if (searchValue) {
              qb.where('container_types.code', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('container_types.descriptionEng', 'iLIKE', `%${searchValue}%`)
              qb.orWhere('container_types.descriptionThai', 'iLIKE', `%${searchValue}%`)
            }
          })
          .where({ "container_types.orgId": orgId })
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
          containerTypes: pagination
        },
        message: "Container Type List!"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getContainerTypeList] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }

  },

  getAllContainerTypeList: async (req, res) => {
    try {

      let orgId = req.orgId;
      let result = await Promise.all([
        knexReader("container_types").select('*').where({ isActive: true, orgId: orgId }).orderBy('code', 'asc')
      ]);
      return res.status(200).json({
        data: {
          containerTypes: result
        },
        message: "Container Type List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getAllContainerTypeList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getContainerTypeDetail: async (req, res) => {


    let id = req.query.id;
    let details = await knexReader('container_types').where({ id }).first();

    return res.status(200).json({
      data: {
        containerType: details
      },
      message: "Container Type detail!"
    });
  }

};

module.exports = containerTypeController;
