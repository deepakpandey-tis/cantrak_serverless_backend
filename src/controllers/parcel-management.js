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
      let noOrgUserData = [];
      let orgUserData = [];
      let images = [];
      let orgId = req.orgId;
      let payLoad = req.body;
      console.log("payload data for image",payLoad)
      let pickedUpType = req.body.pickedUpType;
      payLoad = _.omit(req.body, [
        "image",
        "img_url",
        "non_org_user_data",
        "org_user_data",
      ]);
      console.log("payloa data", payLoad);
      // let payload = req.body
      await knex.transaction(async (trx) => {
        const schema = Joi.object().keys({
          pickedUpType: Joi.string().required(),
          trackingNumber: Joi.string().required(),
          carrierId: Joi.number().required(),
          parcelType: Joi.number().required(),
          description: Joi.string().allow("").optional(),
          parcelCondition: Joi.string().required(),
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

        let addResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("parcel_management");
        console.log("add parcel result", addResult);

        parcelResult = addResult[0];

        console.log("parcel result id",parcelResult.id)

        let noOrgUserDataPayload = req.body.non_org_user_data;

        // console.log("noOrgUserDataPayload",noOrgUserDataPayload)
        noOrgUserData = await knex("parcel_user_non_tis")
          .insert({
            parcelId: parcelResult.id,
            ...noOrgUserDataPayload,
            updatedAt: currentTime,
            createdAt: currentTime,
            createdBy: req.me.id,
            orgId: req.orgId,
          })
          .returning(["*"]);

        let orgUserDataPayload = req.body.org_user_data;

        orgUserData = await knex("parcel_user_tis").insert({
          parcelId: parcelResult.id,
          ...orgUserDataPayload,
          updatedAt: currentTime,
          createdAt: currentTime,
          createdBy: req.me.id,
          orgId: req.orgId,
        });

        // if(pickedUpType == 1){
        //   let parcelNonUserData = await knex("")
        // }

        let imagesData = req.body.image;
        console.log("imagesData",imagesData)
        if (imagesData && imagesData.length > 0) {
          // console.log("imagesData",imagesData)
          for (let image of imagesData) {
            // console.log("image and parcel result",image,parcelResult.id)
            let d = await knex("images")
              .insert({
                entityType: "parcel_management",
                entityId: parcelResult.id,
                s3Url: image.s3Url,
                name: image.filename,
                title: image.title,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"])
              // .transacting(trx)
              // .into("images");
            images.push(d[0]);
          }
        }

        trx.commit;
      });
      res.status(200).json({
        data: parcelResult,
        noOrgUserData: noOrgUserData,
        orgUserData: orgUserData,
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

  /*parcel list */

  getParcelList: async (req, res) => {
    try {
      let reqData = req.query;
      console.log("requested data", reqData);
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let filters = {};

      let { unitId, trackingNumber, tenant, status } = req.body;

      if (unitId || trackingNumber || tenant || status) {
        try {
          [total, rows] = await Promise.all([
            knex
              .count("* as count")
              .from("parcel_management")
              .leftJoin(
                "parcel_user_tis",
                "parcel_management.id",
                "parcel_user_tis.parcelId"
              )
              .leftJoin(
                "parcel_user_non_tis",
                "parcel_management.id",
                "parcel_user_non_tis.parcelId"
              )
              .leftJoin(
                "property_units",
                "parcel_user_tis.unitId",
                "property_units.id"
              )
              .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
              .where("parcel_management.orgId", req.orgId)
              .where((qb) => {
                if (unitId) {
                  qb.where("property_units.id", unitId);
                }
                if (trackingNumber) {
                  qb.where("parcel_management.trackingNumber", trackingNumber);
                }
                if (tenant) {
                  qb.where("users.id", tenant);
                }
                if (status) {
                  qb.where("parcel_management.parcelStatus", status);
                }
              })
              .groupBy([
                "parcel_management.id",
                "property_units.id",
                "users.id",
                "parcel_user_tis.unitId",
              ]),
            knex
              .from("parcel_management")
              .leftJoin(
                "parcel_user_tis",
                "parcel_management.id",
                "parcel_user_tis.parcelId"
              )
              .leftJoin(
                "parcel_user_non_tis",
                "parcel_management.id",
                "parcel_user_non_tis.parcelId"
              )
              .leftJoin(
                "property_units",
                "parcel_user_tis.unitId",
                "property_units.id"
              )
              .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
              .select([
                "parcel_management.id",
                "parcel_user_tis.unitId",
                "parcel_management.trackingNumber",
                "parcel_management.parcelStatus",
                "users.name as tenant",
                "parcel_management.createdAt",
                "parcel_management.pickedUpType",
              ])
              .where("parcel_management.orgId", req.orgId)
              .where((qb) => {
                if (unitId) {
                  qb.where("property_units.id", unitId);
                }
                if (trackingNumber) {
                  qb.where("parcel_management.trackingNumber", trackingNumber);
                }
                if (tenant) {
                  qb.where("users.id", tenant);
                }
                if (status) {
                  qb.where("parcel_management.parcelStatus", status);
                }
              })
              .orderBy("parcel_management.id", "asc")
              .offset(offset)
              .limit(per_page),
          ]);

          let count = total.length;

          pagination.total = count;
          pagination.per_page = per_page;
          pagination.offset = offset;
          pagination.to = offset + rows.length;
          pagination.last_page = Math.ceil(count / per_page);
          pagination.current_page = page;
          pagination.from = offset;
          pagination.data = rows;
        } catch (err) {
          console.log(err);
        }
      } else {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("parcel_management")
            .leftJoin(
              "parcel_user_tis",
              "parcel_management.id",
              "parcel_user_tis.parcelId"
            )
            .leftJoin(
              "parcel_user_non_tis",
              "parcel_management.id",
              "parcel_user_non_tis.parcelId"
            )
            .leftJoin(
              "property_units",
              "parcel_user_tis.unitId",
              "property_units.id"
            )
            .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
            .where("parcel_management.orgId", req.orgId)
            .groupBy(["parcel_management.id", "property_units.id", "users.id"]),
          knex
            .from("parcel_management")
            .leftJoin(
              "parcel_user_tis",
              "parcel_management.id",
              "parcel_user_tis.parcelId"
            )
            .leftJoin(
              "parcel_user_non_tis",
              "parcel_management.id",
              "parcel_user_non_tis.parcelId"
            )
            .leftJoin(
              "property_units",
              "parcel_user_tis.unitId",
              "property_units.id"
            )
            .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
            .select([
              "parcel_management.id",
              "parcel_user_tis.unitId",
              "parcel_management.trackingNumber",
              "parcel_management.parcelStatus",
              "users.name as tenant",
              "parcel_management.createdAt",
              "parcel_management.pickedUpType",
            ])
            .where("parcel_management.orgId", req.orgId)
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id",
              "parcel_user_tis.unitId",
            ])
            .orderBy("parcel_management.id", "asc")
            .offset(offset)
            .limit(per_page),
        ]);

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
    } catch (err) {
      console.log("[controllers][parcel_management][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /*Parcel Details */
  getParcelDetails: async (req, res) => {
    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });
      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let [parcelDetails, parcelImages] = await Promise.all([
        knex
          .from("parcel_management")
          .leftJoin(
            "parcel_user_tis",
            "parcel_management.id",
            "parcel_user_tis.parcelId"
          )
          .leftJoin(
            "parcel_user_non_tis",
            "parcel_management.id",
            "parcel_user_non_tis.parcelId"
          )
          .leftJoin(
            "property_units",
            "parcel_user_tis.unitId",
            "property_units.id"
          )
          .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
          .leftJoin("companies", "parcel_user_tis.companyId", "companies.id")
          .leftJoin("projects", "parcel_user_tis.projectId", "projects.id")
          .leftJoin(
            "buildings_and_phases",
            "parcel_user_tis.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "parcel_user_tis.floorZoneId",
            "floor_and_zones.id"
          )
          .select([
            "parcel_management.*",
            "parcel_user_tis.*",
            "parcel_user_non_tis.*",
            "companies.companyId",
            "companies.id as cid",
            "projects.id as pid",
            "buildings_and_phases.id as bid",
            "floor_and_zones.id as fid",
            "companies.companyName",
            "projects.project as projectId",
            "projects.projectName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingName",
            "floor_and_zones.floorZoneCode",
            "floor_and_zones.description as floorName",
            "users.name as tenantName"
          ])
          .where("parcel_management.id", payload.id)
          .first(),
        knex
          .from("images")
          .where({ entityId: payload.id, entityType: "parcel_management" }),
        // .where("parcel_management.orgId", req.orgId)
      ]);

      return res.status(200).json({
        parcelDetails:{
          ...parcelDetails,
          parcelImages
        },
        message:"Parcel Details !"
      })
    } catch (err) {
      console.log("controller[parcel-management][parcelDetails]");

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
};
module.exports = parcelManagementController;
