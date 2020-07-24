const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");

const knex = require("../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const AWS = require("aws-sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const https = require("https");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1",
});

const parcelManagementController = {
  addParcel: async (req, res) => {
    try {
      let addParcelResult = null;
      let insertedImages = [];

      const schema = Joi.object.keys({});
    } catch (err) {}
  },

  getStorageList: async (req, res) => {
    try {
    } catch (err) {}
  },

  getCompanyListHavingPropertyUnit: async (req, res) => {
    try {
      let pagination = {};
      let result;
      let companyHavingPU;
      let companyArr = [];

      let houseIds = req.me.houseIds;

      companyHavingPU = await knex("property_units")
        .select(["companyId"])
        .where({ orgId: req.orgId, isActive: true })
        .whereIn("property_units.id", houseIds);

      companyArr = companyHavingPU.map((v) => v.companyId);
      result = await knex("companies")
        .innerJoin("property_units", "companies.id", "property_units.companyId")
        .select(
          "companies.id",
          "companies.companyId",
          "companies.companyName as CompanyName"
        )
        .where({ "companies.isActive": true, "companies.orgId": req.orgId })
        .whereIn("companies.id", companyArr)
        .groupBy([
          "companies.id",
          "companies.companyName",
          "companies.companyId",
        ])
        .orderBy("companies.companyName", "asc");
      pagination.data = result;
      return res.status(200).json({
        data: {
          companies: pagination,
        },
        message: "Companies List!",
      });
    } catch (err) {
      console.log(
        "[controllers][propertysetup][getCompanyListHavingPropertyUnits] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /**ADD PARCEL */

  addParcelRequest: async (req, res) => {
    try {
      console.log("add parcel body", req.body);
      let parcelResult = null;
      let images = [];
      let orgId = req.orgId;
      let payLoad = req.body;
      payLoad = _.omit(req.body, ['image'], ['img_url']);
      console.log("payloa data", payLoad);
      // let payload = req.body
      await knex.transaction(async (trx) => {
        const schema = Joi.object().keys({
          pickedUpType: Joi.string().required(),
          trackingNumber: Joi.string().required(),
          carrierId: Joi.number().required(),
          parcelType: Joi.number().required(),
          description: Joi.string().required(),
          parcelCondition: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          buildingPhaseId: Joi.string().required(),
          floorZoneId: Joi.string().required(),
          unitId: Joi.string().required(),
          recipientName: Joi.string().required(),
          senderName: Joi.string().required(),
          parcelStatus: Joi.number().required(),
          parcelPriority: Joi.number().required(),
        });

        const result = Joi.validate(payLoad, schema);
        console.log("result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const currentTime = new Date().getTime();

        const insertData = {
          ...payLoad,
          orgId: orgId,
          createdBy: req.me.id,
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        console.log(
          "[controllers][parcel_management][addParcel]: Insert Data",
          insertData
        );

        const addResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("parcel_management");
        console.log("add parcel result", addResult);

        parcelResult = addResult[0];

        let imagesData = req.body.image;
        console.log("image data",imagesData)
        if (imagesData && imagesData.length > 0) {
          for (image of imagesData) {
            let d = await knex
              .insert({
                entityId: parcelResult.id,
                ...image,
                entityType: "parcel_management",
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"])
              .transacting(trx)
              .into("images");
            images.push(d[0]);
          }
        }

        trx.commit;
      });
      res.status(200).json({
        data: parcelResult,
        message: "Parcel added",
      });
    } catch (err) {
      console.log("[controllers][parcel_management][addParcel] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getParcelList:async(req,res)=>{
    try{
      let reqData
      let total ,rows

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let filters = {};

      let {
        unitId,
        trackingNumber,
        tenant,
        status
      }= req.body

      if(unitId || trackingNumber || tenant || status){
        try{
          [total,rows] = await Promise.all([
            knex
            .count("* as count")
            .from("parcel_management")
            .leftJoin("property_units","parcel_management.unitId","property_units.id")
            .leftJoin("users","parcel_management.createdBy","users.id")
            .where("parcel_management.orgId",orgId)
            .where((qb)=>{
              if(unitId){
                qb.where(
                  "property_units.id",unitId
                )
              }
              if(trackingNumber){
                qb.where("parcel_management.trackingNumber",trackingNumber)
              }
              if(tenant){
                qb.where("users.id",tenant)
              }
              if(status){
                qb.where("parcel_management.parcelStatus",status)
              }
            })
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id"
            ]),
            knex
            .from("parcel_management")
            .leftJoin("property_units","parcel_management.unitId","property_units.id")
            .leftJoin("users","parcel_management.createdBy","users.id")
            .select([
              "parcel_management.unitId",
              "parcel_management.trackingNumber",
              "parcel_management.parcelStatus",
              "users.name",
              "parcel_management.recipientName",
              "parcel_management.senderName",
              "parcel_management.createdAt",
              // "parcel_management."
            ])
            .where("parcel_management.orgId",orgId)
            .where((qb)=>{
              if(unitId){
                qb.where(
                  "property_units.id",unitId
                )
              }
              if(trackingNumber){
                qb.where("parcel_management.trackingNumber",trackingNumber)
              }
              if(tenant){
                qb.where("users.id",tenant)
              }
              if(status){
                qb.where("parcel_management.parcelStatus",status)
              }
            })
            .orderBy("parcel_management.id","asc")
            .offset(offset)
            .limit(per_page),

          ])

          let count = total.length;

          pagination.total = count;
          pagination.per_page = per_page;
          pagination.offset = offset;
          pagination.to = offset + rows.length;
          pagination.last_page = Math.ceil(count / per_page);
          pagination.current_page = page;
          pagination.from = offset;
          pagination.data = rows;
        }catch(err){
          console.log(err)
        }
      }else{
        [total,rows] = await Promise.all([
          knex
          .count("* as count")
            .from("parcel_management")
            .leftJoin("property_units","parcel_management.unitId","property_units.id")
            .leftJoin("users","parcel_management.createdBy","users.id")
            .where("parcel_management.orgId",orgId)
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id"
            ]),
            knex
            .from("parcel_management")
            .leftJoin("property_units","parcel_management.unitId","property_units.id")
            .leftJoin("users","parcel_management.createdBy","users.id")
            .select([
              "parcel_management.unitId",
              "parcel_management.trackingNumber",
              "parcel_management.parcelStatus",
              "users.name",
              "parcel_management.recipientName",
              "parcel_management.senderName",
              "parcel_management.createdAt",
              // "parcel_management."
            ])
            .where("parcel_management.orgId",orgId)
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id"
            ])
            .orderBy("parcel_management.id","asc")
            .offset(offset)
            .limit(per_page)
        ])

        let count = total.length;

          pagination.total = count;
          pagination.per_page = per_page;
          pagination.offset = offset;
          pagination.to = offset + rows.length;
          pagination.last_page = Math.ceil(count / per_page);
          pagination.current_page = page;
          pagination.from = offset;
          pagination.data = rows;
      }
      return res.status(200).json({
        data: {
          parcel: pagination,
        },
        message: "parcel List!",
      });


    }catch(err){
      console.log("[controllers][parcel_management][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  }
};
module.exports = parcelManagementController;
