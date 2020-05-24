const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const serviceRequest = require("../servicerequest");
const fs = require("fs");
const request = require("request");
const path = require("path");

const courierStorageController = {
  addCourier: async (req, res) => {
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

          incident = incidentResult[0]

          trx.commit;
      });

      res.status(200).json({
        data: {
          category: incident
        },
        message: "Courier added successfully !"
      });
    } catch (err) {
      console.log("[controllers][courier][courierAdd] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },

  // addStorage:async(req,res)={
  //   try{

  //   }catch(err){}
  // },

  getCourierList: async (req, res) => {
    try {
      let sortPayLoad = req.body;
      if (!sortPayLoad.sortBy && !sortPayLoad.orderBy) {
        sortPayload.sortBy = "courierName";
        sortPayload.orderBy = "asc";
      }

      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let orgId = req.query.orgId;
      let total, rows;

      [total, rows] = await Promise.all([
        knex("courier_and_storage")
          .select([
            "courier_and_storage.id",
            "courier_and_storage.courierName as CourierName",
          ])
          .where({ orgId: orgId })
          .orderBy("courierName", "asc"),
      ]);
    } catch (err) {
      console.log("[controllers][couriers][getCouriers],Error", err);
    }
  },
};
module.exports = courierStorageController;
