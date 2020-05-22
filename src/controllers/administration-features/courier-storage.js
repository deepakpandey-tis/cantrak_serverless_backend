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
