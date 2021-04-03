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

const agmTemplateController = {
  createAGMTemplate: async (req, res) => {
    try {
      console.log(
        "document name",
        req.body.proxyDocumentName
      );
      createTemplate = null;
      let proxyDocumentName = req.body.documentName;
      let payload = _.omit(req.body, ["proxyDocumentName"]);

      const schema = Joi.object().keys({
        templateName: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }
      let documentName = JSON.stringify(
        req.body.proxyDocumentName
      );

      let currentTime = new Date().getTime();

      let insertTemplateResult = await knex
        .insert({
          templateName: payload.templateName,
          proxyDocumentName: documentName,
          createdBy: req.me.id,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId,
        })
        .returning(["*"])
        .into("agm_proxy_template");

      createTemplate = insertTemplateResult;

      return res.status(200).json({
        data: {
          createTemplate,
        },
      });
    } catch (err) {
      console.log(
        "[controllers][AGM-Template][createAGMProxyTemplate] :  Error",
        err
      );

      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  updateTemplate: async (req, res) => {
    try {
      let updatedTemplate = null;
      let payload = _.omit(req.body, ["proxyDocumentName"]);

      const schema = Joi.object().keys({
        id: Joi.string().required(),
        templateName: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }
      let currentTime = new Date().getTime();

      let documentName = JSON.stringify(
        req.body.proxyDocumentName
      );

      updateData = {
        templateName: payload.templateName,
        proxyDocumentName: documentName,
        updatedAt: currentTime,
      };

      let updatedTemplateResult = await knex
        .update(updateData)
        .where({ id: payload.id })
        .returning(["*"])
        .into("agm_proxy_template");

      updatedTemplate = updatedTemplateResult;

      return res.status(200).json({
        data: {
          updatedTemplate,
        },
      });
    } catch (err) {
      console.log(
        "[controllers][AGM-Template][updateAGMProxyTemplate] :  Error",
        err
      );

      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getAGMTemplateList: async (req, res) => {
    try {
      let reqData = req.query;
      let filters = req.body;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let orgId = req.orgId;

      let [total, rows] = await Promise.all([
        knex("agm_proxy_template")
          .count("* as count")
          .where({ orgId: req.orgId })
          .where((qb) => {
            if (filters.templateName) {
              qb.where(
                "agm_proxy_template.templateName",
                "iLIKE",
                `%${filters.templateName}%`
              );
            }
          })
          .first(),
        knex("agm_proxy_template")
          .select("*")
          .where({ orgId: req.orgId })
          .where((qb) => {
            if (filters.templateName) {
              qb.where(
                "agm_proxy_template.templateName",
                "iLIKE",
                `%${filters.templateName}%`
              );
            }
          })
          .offset(offset)
          .limit(per_page),
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
          list: pagination,
        },
        message: "AGM template list",
      });
    } catch (err) {
      console.log(
        "[controllers][AGM-template][get-agm-template-list] :  Error",
        err
      );
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getAGMTemplateDetail: async (req, res) => {
    try {
      let id = req.body.id;

      let templateResult = await knex("agm_proxy_template")
        .select([
          "agm_proxy_template.id",
          "agm_proxy_template.templateName",
          "agm_proxy_template.proxyDocumentName",
        ])
        .where({
          "agm_proxy_template.id": id,
          "agm_proxy_template.orgId": req.orgId,
        });

      return res.status(200).json({
        data: {
          templateResult,
        },
        message: "AGM template Details",
      });
    } catch (err) {
      console.log(
        "[controllers][agm-template][get-agm-template-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
};
module.exports = agmTemplateController;
