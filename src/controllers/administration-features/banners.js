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
    try {
      let courier = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        const courierPayLoad = req.body;
        console.log("[Controllers][Courier][add]", courierPayLoad);

        const schema = Joi.object().keys({
          courierCode: Joi.string().required(),
          courierName: Joi.string().required(),
          mobileNo: Joi.string().required(),
          website: Joi.string().optional(),
          address: Joi.string().required(),
        });
        const result = Joi.validate(courierPayLoad, schema);
        console.log("[Controller][Courier][add]:Joi result", result);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existCourierCode = await knex("courier").where({
          courierCode: courierPayLoad.courierCode.toUpperCase(),
          orgId: orgId,
        });
        console.log(
          "[controllers][courier][add]: courierCode",
          existCourierCode
        );
        if (existCourierCode && existCourierCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Courier Code already exist !",
              },
            ],
          });
        }
        const currentTime = new Date().getTime();

        const insertData = {
          ...courierPayLoad,
          orgId: orgId,
          createdBy: userId,
          courierCode: courierPayLoad.courierCode.toUpperCase(),
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        console.log("[controllers][courier][add]: Insert Data", insertData);

        const incidentResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("courier");

        incident = incidentResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          category: incident,
        },
        message: "Courier added successfully !",
      });
    } catch (err) {
      console.log("[controllers][courier][courierAdd] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
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
  
  toggleBanners:async(req,res)=>{
    try{
      let banner = null
      let message;
      await knex.transaction(async trx=>{
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
    }catch(err){
      console.log(
        "[controllers][Banner][toggleBanner] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },
  
};
module.exports = bannersController;
