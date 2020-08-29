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

const bannersController = {

  addBanner: async (req, res) => {
    // Define try/catch block
    try {
      let bannerImagesData = [];

      let userId = req.me.id;

      await knex.transaction(async trx => {
        let upNotesPayload = _.omit(req.body, ["images"]);
        console.log("[controllers][remarks][updateRemarksNotes] : Request Body", upNotesPayload);

        // validate keys
        const schema = Joi.object().keys({
          title: Joi.string().allow("").optional()
        });
        // validate params
        const result = Joi.validate(upNotesPayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          console.log("result errors", result);
          res.status(400).json({
            errors: [
              { code: "VALIDATION ERRORS", message: result.message.error }
            ]
          });
        }

        const currentTime = new Date().getTime();

        /*INSERT IMAGE TABLE DATA OPEN */

        if (req.body.images && req.body.images.length) {
          let imagesData = req.body.images;
          for (image of imagesData) {
            let d = await knex
              .insert({
                title: upNotesPayload.title,
                s3Url: image.s3Url,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
                createdBy: userId
              })
              .returning(["*"])
              .transacting(trx)
              .into("banners_master");
            bannerImagesData.push(d[0]);
          }
        }

        /*INSERT FILE TABLE DATA OPEN */

        /*INSERT IMAGE TABLE DATA CLOSE */
        if (bannerImagesData.length) {
          notesData = { s3Url: bannerImagesData[0].s3Url }
        }
        else {
          notesData = { s3Url: '' }
        }

        trx.commit;

        res.status(200).json({
          data: {
            bannerResponse: {
              notesData: [notesData]
            }
          },
          message: "Banners updated successfully !"
        });
      });
    } catch (err) {
      console.log("[controllers][banner][addBanner]:  : Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getBannerList: async (req, res) => {
    try {
      let sortPayload = req.body;

      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let { searchValue } = req.body;
      let orgId = req.query.orgId;
      let total, rows;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("banners_master")
          .leftJoin("users", "users.id", "banners_master.createdBy")
          .where({ "banners_master.orgId": req.orgId })
          .first(),
        knex
          .from("banners_master")
          .leftJoin("users", "users.id", "banners_master.createdBy")
          .where({ "banners_master.orgId": req.orgId })
          .select([
            "banners_master.id as id",
            "banners_master.title as Banner Title",
            "banners_master.s3Url as Banner Images",
            "banners_master.isActive as Status",
            "users.name as Created By",
            "banners_master.createdAt as Date Created",
          ])
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
          banners: pagination,
        },
        message: "Banners List!",
      });
    } catch (err) {
      console.log("[controllers][banners][getBanners],Error", err);
    }
  },

  toggleBanners: async (req, res) => {
    try {
      let banner = null
      let message;
      await knex.transaction(async trx => {
        let payload = req.body;
        let orgId = req.orgId;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let bannerResult
        let checkStatus = await knex.from('banners_master').where({ id: payload.id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            bannerResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("banners_master");
            banner = bannerResult[0];
            message = "Banner deactivate successfully!"

          } else {

            bannerResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("banners_master");
            banner = bannerResult[0];
            message = "Banner activate successfully!"
          }
        }
        trx.commit

      })
      return res.status(200).json({
        data: {
          banner: banner
        },
        message: message
      });
    } catch (err) {
      console.log(
        "[controllers][Banner][toggleBanner] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },

  addTheme: async (req, res) => {
    // Define try/catch block
    try {
      let userId = req.me.id;
      let payload = req.body;
      let orgId = req.orgId;
      let themes;

      await knex.transaction(async trx => {

        // validate keys
        const schema = Joi.object().keys({
          theme: Joi.number().required()
        });
        // validate params
        const result = Joi.validate(payload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          console.log("result errors", result);
          res.status(400).json({
            errors: [
              { code: "VALIDATION ERRORS", message: result.message.error }
            ]
          });
        }

        const currentTime = new Date().getTime();

        /*INSERT THEMES TABLE DATA */
        let checkThemeSettings = await knex.from('theme_master').where({ orgId: orgId }).returning(['*'])
        if (checkThemeSettings && checkThemeSettings.length) {
          themeResult = await knex
            .update({ theme: payload.theme })
            .where({ orgId: orgId })
            .returning(["*"])
            .transacting(trx)
            .into("theme_master");
          themes = themeResult[0];
          message = "Theme settings updated successfully!"

        } else {

          let insertData = {
            theme: payload.theme,
            orgId: orgId,
            createdBy: userId,
            createdAt: currentTime,
            updatedAt: currentTime
          };

          let insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("theme_master");
          themes = insertResult[0];
        }


        trx.commit;

        res.status(200).json({
          data: {
            themes: themes
          },
          message: "Theme managed successfully !"
        });
      });
    } catch (err) {
      console.log("[controllers][theme][addTheme]:  : Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getThemeList: async (req, res) => {
    try {
      let result = await knex('theme_master')
        .leftJoin('users', 'theme_master.createdBy', 'users.id')
        .select([
          'theme_master.*',
          'users.name'
        ])
        .where({ 'theme_master.orgId': req.orgId })
        .first()
      return res.status(200).json({
        data: result,
        message: "Theme List!"
      });
    } catch (err) {
      console.log("[controllers][banner][getTheme] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


};
module.exports = bannersController;
