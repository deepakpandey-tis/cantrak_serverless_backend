const Joi = require("@hapi/joi");
const moment = require("moment");
// const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");
const uuid = require("uuid/v4");
const QRCODE = require("qrcode");

const knex = require("../db/knex");

const fs = require("fs");
const https = require("https");
const { whereIn } = require("../db/knex");

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
      // let qrUpdateResult ;
      let images = [];
      let orgId = req.orgId;
      let payLoad = req.body;
      console.log("payload data for image", payLoad);
      let pickedUpType = req.body.pickedUpType;
      payLoad = _.omit(req.body, [
        "image",
        "img_url",
        "non_org_user_data",
        "org_user_data",
        "newParcelId",
      ]);
      console.log("payloa data", payLoad);
      await knex.transaction(async (trx) => {
        const schema = Joi.object().keys({
          pickedUpType: Joi.string().required(),
          trackingNumber: Joi.string().allow("").optional(),
          carrierId: Joi.number().required(),
          parcelType: Joi.number().required(),
          description: Joi.string().allow("").optional(),
          parcelCondition: Joi.string().required(),
          parcelStatus: Joi.number().required(),
          parcelPriority: Joi.number().optional(),
          barcode: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payLoad, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        // let qrCode = "org-" + req.orgId + "-parcel-" + payload.id
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
          .update(insertData)
          .where({ id: req.body.newParcelId })
          .returning(["*"])
          .transacting(trx)
          .into("parcel_management");
        // console.log("add parcel result", addResult);

        parcelResult = addResult[0];

        // console.log("parcel result id", parcelResult.id);

        let noOrgUserDataPayload = req.body.non_org_user_data;

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

        let qrCode = "org-" + req.orgId + "-parcel-" + parcelResult.id;

        console.log("parcel result id for qr code", parcelResult.id);
        let updateResult = await knex("parcel_management")
          .update({ qrCode: qrCode })
          .returning(["*"])
          .transacting(trx)
          .where({ id: parcelResult.id });

        // let insertResult = await knex.raw(`update "parcel_management" set "qrCode" = ${qrCode} where "id" = ${parcelResult.id} `)

        // console.log("inserted result qr",insertResult)

        // let updateResult = await knex
        // .update({qrCode : qrCode})
        // .where({id:parcelResult.id})
        // .returning(["*"])
        // .into("parcel_management");

        let imagesData = req.body.image;
        console.log("imagesData", imagesData);
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
              .returning(["*"]);
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
        message: "Parcel added successfully !",
      });
    } catch (err) {
      console.log("[controllers][parcel_management][addParcel] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  generateParcelId: async (req, res) => {
    try {
      const generatedId = await knex("parcel_management")
        .insert({ createdAt: new Date().getTime() })
        .returning(["*"]);
      return res.status(200).json({
        data: {
          id: generatedId[0].id,
        },
      });
    } catch (err) {
      console.log("[controllers][parcelManagement][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /*parcel list */

  getParcelList: async (req, res) => {
    try {
      let reqData = req.query;
      // console.log("requested data parcel", reqData);
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let filters = {};

      let {
        unitId,
        trackingNo,
        tenantId,
        status,
        companyId,
        projectId,
        buildingPhaseId,
      } = req.body;

      // console.log("request body", req.body);
      if (
        unitId ||
        trackingNo ||
        tenantId ||
        status ||
        companyId ||
        projectId ||
        buildingPhaseId
      ) {
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
              .leftJoin(
                "companies",
                "parcel_user_tis.companyId",
                "companies.id"
              )
              .leftJoin("projects", "parcel_user_tis.projectId", "projects.id")
              .leftJoin(
                "buildings_and_phases",
                "parcel_user_tis.buildingPhaseId",
                "buildings_and_phases.id"
              )
              // .leftJoin("images", "parcel_management.id", "images.entityId")
              .where("parcel_management.orgId", req.orgId)
              .where((qb) => {
                if (unitId) {
                  qb.where("property_units.id", unitId);
                }
                if (trackingNo) {
                  qb.where("parcel_management.trackingNumber", trackingNo);
                }
                if (tenantId) {
                  qb.where("users.id", tenantId);
                }
                // if (status) {
                //   qb.where("parcel_management.parcelStatus", status);
                // }
                if (status) {
                  console.log("value of status", status);
                  if (status == 1) {
                    qb.where({
                      "parcel_management.parcelStatus": 1,
                      "parcel_management.pickedUpType": 1,
                    });
                  }
                  if (status == 2) {
                    qb.where({
                      "parcel_management.parcelStatus": 2,
                      "parcel_management.pickedUpType": 1,
                    });
                  }
                  if (status == 6) {
                    console.log("value 6", status);
                    qb.where({
                      "parcel_management.parcelStatus": 1,
                      "parcel_management.pickedUpType": 2,
                    });
                  }
                  if (status == 7) {
                    console.log("value 7", status);
                    qb.where({
                      "parcel_management.parcelStatus": 2,
                      "parcel_management.pickedUpType": 2,
                    });
                  }
                  if (status == 3) {
                    qb.where({ "parcel_management.parcelStatus": 3 });
                  }
                  if (status == 4) {
                    qb.where({ "parcel_management.parcelStatus": 4 });
                  }
                  if (status == 5) {
                    qb.where({ "parcel_management.parcelStatus": 5 });
                  }
                }
                if (companyId) {
                  console.log("company id", companyId);
                  qb.where("parcel_user_tis.companyId", companyId);
                }
                if (projectId) {
                  qb.where("parcel_user_tis.projectId", projectId);
                }
                if (buildingPhaseId) {
                  qb.where("parcel_user_tis.buildingPhaseId", buildingPhaseId);
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
              .leftJoin(
                "companies",
                "parcel_user_tis.companyId",
                "companies.id"
              )
              .leftJoin("projects", "parcel_user_tis.projectId", "projects.id")
              .leftJoin(
                "buildings_and_phases",
                "parcel_user_tis.buildingPhaseId",
                "buildings_and_phases.id"
              )
              // .leftJoin("images", "parcel_management.id", "images.entityId")
              .select([
                "parcel_management.id",
                "parcel_user_tis.unitId",
                "property_units.unitNumber",
                "parcel_user_tis.parcelId",
                "parcel_management.trackingNumber",
                "parcel_management.parcelStatus",
                "users.name as tenant",
                "parcel_management.createdAt",
                "parcel_management.pickedUpType",
                "parcel_management.pickedUpAt",
                "parcel_management.receivedDate",
                "buildings_and_phases.buildingPhaseCode",
                "buildings_and_phases.description",
                "parcel_user_non_tis.name",
                "parcel_management.updatedAt",
                // "images.s3Url",
              ])
              .where("parcel_management.orgId", req.orgId)
              .where((qb) => {
                if (unitId) {
                  qb.where("property_units.id", unitId);
                }
                if (trackingNo) {
                  console.log("tracking number", trackingNo);
                  qb.where("parcel_management.trackingNumber", trackingNo);
                }
                if (tenantId) {
                  qb.where("users.id", tenantId);
                }
                // if (status) {
                //   qb.where("parcel_management.parcelStatus", status);
                // }
                if (status) {
                  console.log("value of status", status);
                  if (status == 1) {
                    qb.where({
                      "parcel_management.parcelStatus": 1,
                      "parcel_management.pickedUpType": 1,
                    });
                  }
                  if (status == 2) {
                    qb.where({
                      "parcel_management.parcelStatus": 2,
                      "parcel_management.pickedUpType": 1,
                    });
                  }
                  if (status == 6) {
                    console.log("value 6", status);
                    qb.where({
                      "parcel_management.parcelStatus": 1,
                      "parcel_management.pickedUpType": 2,
                    });
                  }
                  if (status == 7) {
                    console.log("value 7", status);
                    qb.where({
                      "parcel_management.parcelStatus": 2,
                      "parcel_management.pickedUpType": 2,
                    });
                  }
                  if (status == 3) {
                    qb.where({ "parcel_management.parcelStatus": 3 });
                  }
                  if (status == 4) {
                    qb.where({ "parcel_management.parcelStatus": 4 });
                  }
                  if (status == 5) {
                    qb.where({ "parcel_management.parcelStatus": 5 });
                  }
                }
                if (companyId) {
                  console.log("company id", companyId);
                  qb.where("parcel_user_tis.companyId", companyId);
                }
                if (projectId) {
                  qb.where("parcel_user_tis.projectId", projectId);
                }
                if (buildingPhaseId) {
                  qb.where("parcel_user_tis.buildingPhaseId", buildingPhaseId);
                }
              })
              .orderBy("parcel_management.createdAt", "desc")
              .offset(offset)
              .limit(per_page),
          ]);
          console.log("rows", rows);
          const Parallel = require("async-parallel");
          rows = await Parallel.map(rows, async (pd) => {
            let imageResult = await knex
              .from("images")
              .select("s3Url", "title", "name")
              .where({
                entityId: pd.id,
                entityType: "parcel_management",
                // orgId: req.orgId,
              })
              .first();
            return {
              ...pd,
              uploadedImages: imageResult,
            };
          });

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
            .leftJoin("companies", "parcel_user_tis.companyId", "companies.id")
            .leftJoin("projects", "parcel_user_tis.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            // .leftJoin("images", "parcel_management.id", "images.entityId")
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
            .leftJoin("companies", "parcel_user_tis.companyId", "companies.id")
            .leftJoin("projects", "parcel_user_tis.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin("images", "parcel_management.id", "images.entityId")
            .select([
              "parcel_management.id",
              "parcel_user_tis.unitId",
              "property_units.unitNumber",
              "parcel_user_tis.parcelId",
              "parcel_management.trackingNumber",
              "parcel_management.parcelStatus",
              "users.name as tenant",
              "parcel_management.createdAt",
              "parcel_management.pickedUpType",
              "parcel_management.pickedUpAt",
              "parcel_management.receivedDate",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description",
              "parcel_user_non_tis.name",
              "parcel_management.updatedAt",

              // "images.s3Url",
            ])
            .where("parcel_management.orgId", req.orgId)
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id",
              "parcel_user_tis.unitId",
              "parcel_user_tis.parcelId",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description",
              "parcel_user_non_tis.name",
              // "images.s3Url"
            ])
            .orderBy("parcel_management.createdAt", "desc")
            .offset(offset)
            .limit(per_page),
        ]);
        console.log("rows", rows);
        const Parallel = require("async-parallel");
        rows = await Parallel.map(rows, async (pd) => {
          let imageResult = await knex
            .from("images")
            .select("s3Url", "title", "name")
            .where({
              entityId: pd.id,
              entityType: "parcel_management",
              // orgId: req.orgId,
            })
            .first();
          return {
            ...pd,
            uploadedImages: imageResult,
          };
        });

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

  getPendingParcelList: async (req, res) => {
    try {
      let payload = req.body;
      let parcelList;
      let {
        unitId,
        tenantId,
        buildingPhaseId,
        trackingNumber,
        id,
        parcelId,
      } = req.body;
      console.log(
        "parcel payload for filter",
        unitId,
        tenantId,
        buildingPhaseId,
        trackingNumber,
        id,
        parcelId
      );
      if (
        unitId ||
        tenantId ||
        buildingPhaseId ||
        trackingNumber ||
        id ||
        parcelId
      ) {
        try {
          let parcelType;

          if (parcelId) {
            parcelType = await knex
              .from("parcel_management")
              .select("parcel_management.pickedUpType")
              .where("parcel_management.id", parcelId);
          }
          // console.log("parcelType1",parcelType[0].pickedUpType)

          parcelList = await knex
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
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .select([
              "parcel_management.id",
              "parcel_user_tis.unitId",
              "parcel_management.trackingNumber",
              "parcel_management.parcelStatus",
              "users.name as tenant",
              "users.id as tenantId",
              "parcel_management.createdAt",
              "parcel_management.pickedUpType",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description as buildingName",
              "parcel_user_non_tis.name",
              "property_units.unitNumber",
            ])
            .where("parcel_management.orgId", req.orgId)
            .where("parcel_management.parcelStatus", 1)
            .where((qb) => {
              if (unitId) {
                qb.where("property_units.unitNumber", unitId);
              }
              if (trackingNumber) {
                qb.where("parcel_management.trackingNumber", trackingNumber);
              }
              if (tenantId) {
                qb.where("users.id", tenantId);
              }
              if (buildingPhaseId) {
                qb.where("parcel_user_tis.buildingPhaseId", buildingPhaseId);
              }
              if (id && parcelId) {
                qb.where({
                  "property_units.unitNumber": id,
                  "parcel_management.pickedUpType": parcelType[0].pickedUpType,
                });
              }
            })
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id",
              "parcel_user_tis.unitId",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description",
              "parcel_user_non_tis.name",
            ])
            .orderBy("parcel_management.createdAt", "desc");
        } catch (err) {
          console.log("[controllers][parcel_management][list] :  Error", err);
          return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
          });
        }
      } else {
        parcelList = await knex
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
          .leftJoin(
            "buildings_and_phases",
            "parcel_user_tis.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .select([
            "parcel_management.id",
            "parcel_user_tis.unitId",
            "parcel_management.trackingNumber",
            "parcel_management.parcelStatus",
            "users.name as tenant",
            "users.id as tenantId",
            "parcel_management.createdAt",
            "parcel_management.pickedUpType",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingName",
            "parcel_user_non_tis.name",
            "property_units.unitNumber",
          ])
          .where("parcel_management.orgId", req.orgId)
          .where("parcel_management.parcelStatus", 1)
          .groupBy([
            "parcel_management.id",
            "property_units.id",
            "users.id",
            "parcel_user_tis.unitId",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description",
            "parcel_user_non_tis.name",
          ])
          .orderBy("parcel_management.createdAt", "desc");
      }

      const Parallel = require("async-parallel");
      parcelList = await Parallel.map(parcelList, async (pd) => {
        let imageResult = await knex
          .from("images")
          .select("s3Url", "title", "name")
          .where({
            entityId: pd.id,
            entityType: "parcel_management",
            // orgId: req.orgId,
          })
          .first();
        return {
          ...pd,
          uploadedImages: imageResult,
        };
      });

      return res.status(200).json({
        data: {
          parcel: parcelList,
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

      let [
        parcelDetails,
        parcelImages,
        pickedUpImages,
        pickedUpRemark,
      ] = await Promise.all([
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
          .leftJoin("courier", "parcel_management.carrierId", "courier.id")
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
            "users.name as tenantName",
            "property_units.unitNumber",
            "courier.courierName",
            "parcel_management.barcode",
          ])
          .where("parcel_management.id", payload.id)
          .first(),
        knex
          .from("images")
          .where({ entityId: payload.id, entityType: "parcel_management" }),

        knex
          .from("images")
          .where({ entityId: payload.id, entityType: "pickup_parcel" }),

        knex.from("remarks_master").where({
          entityId: payload.id,
          entityType: "pickup_parcel_remarks",
          orgId: req.orgId,
        }),
      ]);

      return res.status(200).json({
        parcelDetails: {
          ...parcelDetails,
          parcelImages,
          pickedUpImages,
          pickedUpRemark,
        },
        message: "Parcel Details !",
      });
    } catch (err) {
      console.log("controller[parcel-management][parcelDetails]");

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  updateParcelDetails: async (req, res) => {
    try {
      let parcel = null;
      let insertedImages = [];
      let id = req.body.id;

      let parcelResult = null;
      let noOrgUserData = [];
      let orgUserData = [];
      parcelRemarks = [];
      // let qrUpdateResult ;
      let images = [];
      let orgId = req.orgId;
      console.log("update parcel payload", req.body);
      await knex.transaction(async (trx) => {
        const payload = req.body;

        parcelPayload = _.omit(
          payload,
          "image",
          "id",
          "img_url",
          "non_org_user_data",
          "org_user_data",
          "newParcelId"
        );

        const schema = Joi.object().keys({
          pickedUpType: Joi.string().required(),
          trackingNumber: Joi.string().allow("").optional(),
          carrierId: Joi.number().required(),
          parcelType: Joi.number().required(),
          description: Joi.string().allow("").optional(),
          parcelCondition: Joi.string().required(),
          parcelStatus: Joi.number().required(),
          parcelPriority: Joi.number().required(),
          barcode: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(parcelPayload, schema);
        console.log("result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        let currentTime = new Date().getTime();

        const insertData = {
          ...parcelPayload,
          orgId: orgId,
          // createdBy: req.me.id,
          // createdAt: currentTime,
          updatedAt: currentTime,
        };

        let updateResult = await knex
          .update(insertData)
          .where({ id: payload.id })
          .returning(["*"])
          .transacting(trx)
          .into("parcel_management");
        // console.log("add parcel result", addResult);
        parcelResult = updateResult[0];

        let noOrgUserDataPayload = req.body.non_org_user_data;

        noOrgUserData = await knex("parcel_user_non_tis")
          .update({
            ...noOrgUserDataPayload,
            updatedAt: currentTime,
          })
          .where({ parcelId: payload.id })
          .returning(["*"]);

        let orgUserDataPayload = req.body.org_user_data;

        orgUserData = await knex("parcel_user_tis")
          .update({
            ...orgUserDataPayload,
            updatedAt: currentTime,
          })
          .where({ parcelId: payload.id })
          .returning(["*"]);

        let imagesData = req.body.image;
        console.log("imagesData", imagesData);
        if (imagesData && imagesData.length > 0) {
          for (let image of imagesData) {
            let d = await knex("images").insert({
              ...image,
              entityId: id,
              entityType: "parcel_management",
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            });

            images.push(d[0]);
          }
        }

        trx.commit;
      });

      res.status(200).json({
        data: parcelResult,
        noOrgUserData: noOrgUserData,
        orgUserData: orgUserData,
        message: "Parcel updated Successfully !",
      });
    } catch (err) {
      console.log(
        "[controllers][parcel_management][updateParcel] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getTrackingNumberList: async (req, res) => {
    try {
      let trackingNumberList = await knex
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
        .select(["parcel_management.id", "parcel_management.trackingNumber"])
        .where("parcel_management.orgId", req.orgId)
        .where("parcel_management.parcelStatus", 1);

      return res.status(200).json({
        data: {
          trackingNumber: trackingNumberList,
          message: "Tracking Number list",
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  deliverParcel: async (req, res) => {
    try {
      // let payload = req.body
      let insertedImages = [];
      let id = req.body.id;
      let parcelResult = null;
      let parcelRemarks = [];
      // let {parcelStatus,description}
      console.log("requested data for image", req.body);

      const payload = _.omit(req.body, [
        "id",
        "image",
        "signImage",
        "signName",
        "description",
      ]);

      const schema = Joi.object().keys({
        parcelStatus: Joi.string().required(),
        // description: Joi.string().allow("").optional(),
        signature: Joi.string().allow("").optional(),
      });
      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      const currentTime = new Date().getTime();

      let deliverParcelResult = await knex("parcel_management")
        .update({
          ...payload,
          updatedAt: currentTime,
          // pickedUpAt: currentTime,
          receivedDate: currentTime,
        })
        .whereIn("parcel_management.id", id)
        .where("parcel_management.orgId", req.orgId)
        .returning(["*"]);

      let description = req.body.description;
      let idLength = req.body.id.length;
      for (let i = 0; i < idLength; i++) {
        parcelRemarks = await knex("remarks_master").insert({
          description: description,
          entityId: req.body.id[i],
          entityType: "pickup_parcel_remarks",
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId,
        });
      }

      return res.status(200).json({
        data: {
          deliverParcel: deliverParcelResult,
          addedImages: insertedImages,
          parcelRemarks,
        },
      });
    } catch (err) {}
  },

  getParcelStatusForCheckOut: async (req, res) => {
    try {
      let parcelId = req.body.parcelId;
      console.log("request", parcelId);

      let parcelStatus = await knex
        .from("parcel_management")
        .select(["parcel_management.id", "parcel_management.parcelStatus"])
        .where({
          "parcel_management.orgId": req.orgId,
          "parcel_management.id": parcelId,
          "parcel_management.parcelStatus": 2,
        })
        .orWhere({
          "parcel_management.orgId": req.orgId,
          "parcel_management.id": parcelId,
          "parcel_management.parcelStatus": 5,
        });
      return res.status(200).json({
        data: {
          parcelStatus: parcelStatus,
          message: "Parcel Status",
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getQrCodeImageUrl: async (req, res) => {
    try {
      let unitNumber = req.body.unitNumber;
      let parcelId = req.body.parcelId;
      let orgId = req.orgId;

      let qrCode1 =
        "org~" + orgId + "~unitNumber~" + unitNumber + "~parcel~" + parcelId;
      let qrCode;
      if (qrCode1) {
        qrCode = await QRCODE.toDataURL(qrCode1);
      }

      let fileName = "parcel-"+ parcelId +".png";
      let filePath = fileName
      let base64Data;
      if (qrCode) {
        base64Data = new Buffer.from(
          qrCode.replace(/^data:([A-Za-z-+/]+);base64,/, "")
        );
        fs.writeFile("parcel.jpeg", base64Data, "base64", (err) => {
          console.log("error in file", err);

        });
      }
      const AWS = require("aws-sdk");
      fs.readFile(filePath, function(err,file){
        var s3 = new AWS.S3();
        var params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: "parcel/" + fileName,
          Body: file,
          ContentType: "image/jpeg",
        };

        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadImageOnS3Bucket function", err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
            });
          } else {
            console.log("File uploaded Successfully");
            let url = process.env.S3_BUCKET_URL + "/parcel/" + fileName;
  
            console.log("url of image", url);
  
        return res.status(200).json({
          data: {
            message: "Qr code Get Successfully!",
            url: url,
          },
        });
          }
        });

      })

      
    } catch (err) {
      console.log("[controllers][generalsetup][exoportCompany] :  Error", err);
    }
  },

  dispatchOutgoingParcel: async (req, res) => {
    try {
      let parcelId = req.body.parcelId;

      const currentTime = new Date().getTime();
      console.log(
        "REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7",
        req.body
      );

      const status = await knex("parcel_management")
        .update({ parcelStatus: "2", receivedDate: currentTime })
        .where("parcel_management.id", parcelId);

      return res.status(200).json({
        data: {
          status: "Dispatched",
        },
        message: "Parcel Dispatched successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  approvePendingStatus: async (req, res) => {
    try {
      let parcelId = req.body.parcelId;

      const pendingApproval = await knex("parcel_management")
        .update({ isPendingForApproval: true })
        .where("parcel_management.id", parcelId);

      return res.status(200).json({
        data: {
          message: "Pending Approved",
          pendingApproval: pendingApproval,
        },
      });
    } catch (error) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
};
module.exports = parcelManagementController;
