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

const redisHelper = require("../helpers/redis");

const fs = require("fs");
const https = require("https");
const { whereIn, select } = require("../db/knex");
const parcelCollectedNotification = require("../notifications/parcel/parcel-collected-notification");
const addOutGoingNotification = require("../notifications/parcel/add-outgoing-parcel-notification");
const parcelRejectedNotification = require("../notifications/parcel/parcel-rejected-notification");
const parcelReturnedNotification = require("../notifications/parcel/parcel-return-notification");
const parcelPickedUpNotification = require("../notifications/parcel/parcel-pickedup-notification");
const parcelCanceledNotification = require("../notifications/parcel/parcel-canceled-notification");

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
        .innerJoin(
          "property_units",
          "companies.id",
          "property_units.companyId"
        )
        .select(
          "companies.id",
          "companies.companyId",
          "companies.companyName as CompanyName"
        )
        .where({
          "companies.isActive": true,
          "companies.orgId": req.orgId,
        })
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
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /**ADD PARCEL */

  addParcelRequest: async (req, res) => {
    try {
      // console.log("add parcel body", req.body);
      let parcelResult = null;
      let noOrgUserData = [];
      let orgUserData = [];
      let noOrgUserTenant = [];
      // let qrUpdateResult ;
      let images = [];
      let orgId = req.orgId;
      let payLoad = req.body;
      // console.log("payload data for image", payLoad);
      let pickedUpType = req.body.pickedUpType;
      payLoad = _.omit(req.body, [
        "image",
        "img_url",
        "non_org_user_data",
        "org_user_data",
        "newParcelId",
        "isChecked",
      ]);
      console.log("payloa data", payLoad);
      await knex.transaction(async (trx) => {
        const schema = Joi.object().keys({
          pickedUpType: Joi.string().required(),
          trackingNumber: Joi.string().allow("").optional(),
          carrierId: Joi.number().allow(null).optional(),
          parcelType: Joi.number().required(),
          description: Joi.string().allow("").optional(),
          parcelCondition: Joi.string().required(),
          parcelStatus: Joi.number().required(),
          parcelPriority: Joi.number()
            .allow(null)
            .optional(),
          // barcode: Joi.string().allow("").optional(),
          storage: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
        });

        const result = Joi.validate(payLoad, schema);

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
        // let qrCode = "org-" + req.orgId + "-parcel-" + payload.id

        let qrCode =
          "org-" +
          req.orgId +
          "-parcel-" +
          req.body.newParcelId;

        const currentTime = new Date().getTime();
        payLoad = _.omit(payLoad, ["storage"]);

        const insertData = {
          ...payLoad,
          storageLocation: req.body.storage,
          companyId: req.body.org_user_data.companyId,
          qrCode: qrCode,
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

        parcelResult = addResult[0];

        let noOrgUserDataPayload =
          req.body.non_org_user_data;
        if (noOrgUserDataPayload) {
          noOrgUserData = await knex("parcel_user_non_tis")
            .insert({
              parcelId: parcelResult.id,
              // ...noOrgUserDataPayload,
              name: noOrgUserDataPayload.name,
              email: noOrgUserDataPayload.email,
              phoneNo: noOrgUserDataPayload.phoneNo,
              address: noOrgUserDataPayload.address,
              updatedAt: currentTime,
              createdAt: currentTime,
              createdBy: req.me.id,
              orgId: req.orgId,
              type: 2,
            })
            .returning(["*"]);

          noOrgUserTenant = await knex(
            "parcel_user_non_tis"
          ).insert({
            parcelId: parcelResult.id,
            // ...noOrgUserDataPayload,
            name: noOrgUserDataPayload.tenantName,
            email: noOrgUserDataPayload.tenantEmail,
            phoneNo: noOrgUserDataPayload.tenantPhoneNo,
            address: noOrgUserDataPayload.tenantAddress,
            updatedAt: currentTime,
            createdAt: currentTime,
            createdBy: req.me.id,
            orgId: req.orgId,
            type: 1,
          });
        }

        let orgUserDataPayload = req.body.org_user_data;

        console.log("parcel user tis", orgUserDataPayload)

        orgUserData = await knex("parcel_user_tis").insert({
          parcelId: parcelResult.id,
          ...orgUserDataPayload,
          updatedAt: currentTime,
          createdAt: currentTime,
          createdBy: req.me.id,
          orgId: req.orgId,
        });

        // let qrCode =
        //   "org-" + req.orgId + "-parcel-" + parcelResult.id;

        console.log(
          "parcel result id for qr code",
          parcelResult.id
        );
        // let updateResult = await knex("parcel_management")
        //   .update({ qrCode: qrCode })
        //   .returning(["*"])
        //   .transacting(trx)
        //   .where({ id: parcelResult.id });

        // let imagesData = req.body.image;
        // console.log("imagesData", imagesData);
        // if (imagesData && imagesData.length > 0) {
        //   for (let image of imagesData) {
        //     let d = await knex("images")
        //       .insert({
        //         entityType: "parcel_management",
        //         entityId: parcelResult.id,
        //         s3Url: image.s3Url,
        //         name: image.filename,
        //         title: image.title,
        //         createdAt: currentTime,
        //         updatedAt: currentTime,
        //         orgId: req.orgId,
        //       })
        //       .returning(["*"]);
        //     images.push(d[0]);
        //   }
        // }

        let orgMaster = await knex
          .from("organisations")
          .where({ id: req.orgId })
          .first();

        let dataNos = {
          payload: {
            orgData: orgMaster,
            parcelId: parcelResult.id,
          },
        };

        console.log("OrgData+++++", dataNos);
        let tenantId = req.body.org_user_data.tenantId;

        let receiver = await knex
          .from("users")
          .where({ id: tenantId })
          .first();

        console.log("[Reciever]", receiver);
        if (
          req.body.pickedUpType[0] == 2 &&
          req.body.isChecked == true
        ) {
          const ALLOWED_CHANNELS = [
            "IN_APP",
            "EMAIL",
            "WEB_PUSH",
            "SOCKET_NOTIFY",
          ];
          let sender = await knex
            .from("users")
            .where({ id: req.me.id })
            .first();

          if (receiver) {
            await addOutGoingNotification.send(
              sender,
              receiver,
              dataNos,
              ALLOWED_CHANNELS
            );
          }
        }

        let propertyUnitData = await knex("property_units")
          .leftJoin(
            "companies",
            "property_units.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "property_units.projectId",
            "projects.id"
          )
          .select([
            "companies.companyId",
            "projects.project",
            "property_units.unitNumber",
            "property_units.description as houseIdDescription",
            "property_units.houseId",
          ])
          .where({
            "property_units.id": orgUserDataPayload.unitId,
          })
          .first();

        let imageUrl = [];
        imageUrl = await knex.from("images").where({
          entityId: req.body.newParcelId,
          entityType: "parcel_management",
        });

        console.log("[Image][URL]", imageUrl);

        let receiverData;
        let senderData;
        let parcelDetail;
        let priority;
        if (payLoad.parcelPriority == 1) {
          priority = "Normal";
        } else if (payLoad.parcelPriority == 2) {
          priority = "High";
        } else {
          priority = "Urgent";
        }
        let parcelType;
        if (payLoad.parcelType == 1) {
          parcelType = "Envelope";
        } else if (payLoad.parcelType == 2) {
          parcelType = "Bag";
        } else if (payLoad.parcelType == 3) {
          parcelType = "Small Box (Box)";
        } else if (payLoad.parcelType == 4) {
          parcelType = "Large Box (Crate)";
        }
        let parcelCondition;

        if (payLoad.parcelCondition == 1) {
          parcelCondition = "Appears Fine";
        } else if (payLoad.parcelCondition == 2) {
          parcelCondition = "Minor Damage";
        } else if (payLoad.parcelCondition == 3) {
          parcelCondition = "Moderate Damage";
        } else if ((payLoad, parcelCondition == 4)) {
          parcelCondition = "Major Damage";
        } else if (payLoad.parcelCondition == 5) {
          parcelCondition = "Water Damage";
        }

        if (pickedUpType == 1) {
          parcelDetail = {
            parcelId: parcelResult.id,
            parcelType: "Incoming Parcel",
            trackingNumber: payLoad.trackingNumber,
            parcelPriority: priority,
            parcelType: parcelType,
            parcelCondition: parcelCondition,
            remark: payLoad.description,
            qrcode: qrCode,
            imageUrl:
              imageUrl && imageUrl[0]
                ? imageUrl[0].s3Url
                : null,
          };
          senderData = {
            ...noOrgUserDataPayload,
          };
          if (receiver) {
            receiverData = {
              name: receiver.name,
              email: receiver.email,
              mobileNumber: receiver.mobileNo,
              propertyUnitData,
            };
          } else {
            receiverData = {
              name: noOrgUserDataPayload.tenantName,
              email: noOrgUserDataPayload.tenantEmail,
              mobileNumber:
                noOrgUserDataPayload.tenantPhoneNo,
              address: noOrgUserDataPayload.tenantAddress,
              propertyUnitData
            };
          }
        } else {
          parcelDetail = {
            parcelId: parcelResult.id,
            parcelType: "Outgoing Parcel",
            trackingNumber: payLoad.trackingNumber,
            parcelPriority: priority,
            parcelType: parcelType,
            parcelCondition: parcelCondition,
            remark: payLoad.description,
            qrcode: qrCode,
            imageUrl:
              imageUrl && imageUrl[0]
                ? imageUrl[0].s3Url
                : null,
          };
          if (receiver) {
            senderData = {
              name: receiver.name,
              email: receiver.email,
              mobileNumber: receiver.mobileNo,
              propertyUnitData,
            };
          } else {
            senderData = {
              name: noOrgUserDataPayload.tenantName,
              email: noOrgUserDataPayload.tenantEmail,
              mobileNumber:
                noOrgUserDataPayload.tenantPhoneNo,
              address: noOrgUserDataPayload.tenantAddress,
            };
          }

          receiverData = {
            ...noOrgUserDataPayload, propertyUnitData
          };
        }

        //Import SNS Helper..
        const parcelSNSHelper = require("../helpers/parcel");

        await parcelSNSHelper.parcelSNSNotification({
          orgId: req.orgId,
          module: "PARCEL",
          data: { parcelDetail, senderData, receiverData },
          receiver,
        });

        let updateResultss = await knex
          .update({ isActive: true })
          .where({ isActive: true })
          .returning(["*"])
          .into("parcel_user_tis");

        trx.commit;
      });

      // await knex("parcel_management")
      //   .update({ isActive: true })
      //   .where({ isActive: true });
      // update public.parcel_user_tis  set "isActive" = true where "isActive"=true;

      res.status(200).json({
        data: parcelResult,
        noOrgUserData: { noOrgUserData, noOrgUserTenant },
        orgUserData: orgUserData,
        message: "Parcel added successfully !",
      });
    } catch (err) {
      console.log(
        "[controllers][parcel_management][addParcel] :  Error",
        err
      );
      //trx.rollback
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
      console.log(
        "[controllers][parcelManagement][list] :  Error",
        err
      );
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  generatePdfOfParcelDocument: async (req, res) => {
    try {
      let projectIds = req.accessibleProjects;

      // console.log("Project Ids", projectIds)
      let {
        unitId,
        tenantId,
        buildingPhaseId,
        trackingNumber,
        id,
        parcelId,
        tenantName,
        createdDateFrom,
        createdDateTo,
        displayId,
      } = req.body;

      let parcel;


      let createDateFrom = moment(createdDateFrom)
        .startOf("date")
        .format();
      let createDateTo = moment(createdDateTo)
        .endOf("date", "days")
        .format();

      let fromNewDate = new Date(createDateFrom).getTime();
      let toNewDate = new Date(createDateTo).getTime();

      if (tenantName) {
        parcel = await knex("parcel_user_non_tis")
          .select("parcel_user_non_tis.parcelId")
          .where(
            "parcel_user_non_tis.name",
            "iLIKE",
            `%${tenantName}%`
          )
          .where("parcel_user_non_tis.type", 1)
          .first();
      }

      let parcelType;
      let parcelUserData;

      if (parcelId) {
        parcelType = await knex
          .from("parcel_management")
          .select("parcel_management.pickedUpType")
          .where("parcel_management.id", parcelId);

        parcelUserData = await knex("parcel_user_tis")
          .select([
            "parcel_user_tis.tenantId",
            "parcel_user_tis.unitId",
          ])
          .where("parcel_user_tis.parcelId", parcelId);

        console.log(
          "parcel user data",
          parcelUserData[0]
        );
      }

      let parcelData = await knex
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
        .leftJoin(
          "users",
          "parcel_user_tis.tenantId",
          "users.id"
        )
        .leftJoin(
          "projects",
          "parcel_user_tis.projectId",
          "projects.id"
        )
        .leftJoin(
          "buildings_and_phases",
          "parcel_user_tis.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .select([
          "parcel_management.id",
          "parcel_management.orgId",
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
          "parcel_management.description as remarks",
          "parcel_management.displayId",
          "parcel_management.qrCode",
        ])
        .where("parcel_management.orgId", req.orgId)
        .where("parcel_management.parcelStatus", 1)
        .whereIn("projects.id", projectIds)
        .whereNot(
          "parcel_management.pickedUpType",
          null
        )
        .where((qb) => {
          if (unitId) {
            qb.where(
              "property_units.unitNumber",
              unitId
            );
          }
          if (trackingNumber) {
            qb.where(
              "parcel_management.trackingNumber",
              trackingNumber
            );
          }
          if (tenantId) {
            qb.where("users.id", tenantId);
          }
          if (buildingPhaseId) {
            qb.where(
              "parcel_user_tis.buildingPhaseId",
              buildingPhaseId
            );
          }
          if (tenantName && parcel) {
            qb.where(
              "parcel_management.id",
              parcel.parcelId
            );
          }
          if (parcelUserData) {
            console.log(
              "parcel user data1",
              parcelUserData
            );
            qb.where({
              "parcel_management.pickedUpType":
                parcelType[0].pickedUpType,
            });
            qb.where(
              "users.id",
              parcelUserData[0].tenantId
            );
            qb.where(
              "property_units.id",
              parcelUserData[0].unitId
            );
          }
          if (createdDateFrom && createdDateTo) {
            qb.whereBetween(
              "parcel_management.createdAt",
              [fromNewDate, toNewDate]
            );
          }
          if (displayId) {
            qb.where("parcel_management.displayId", displayId)
          }
        })
        .where((qb) => {
          qb.where("parcel_user_non_tis.type", 2);
          qb.orWhere(
            "parcel_user_non_tis.type",
            null
          );
        })
        .orderBy(
          "parcel_management.createdAt",
          "desc"
        )

      const Parallel = require("async-parallel");
      parcelData = await Parallel.map(parcelData, async (pd) => {
        let tenantData = await knex
          .from("parcel_user_non_tis")
          .select("*")
          .where({
            parcelId: pd.id,
            type: 1,
          });

        return { ...pd, tenantData };
      });
      parcelData = await Parallel.map(parcelData, async (pd) => {
        let imageResult = await knex
          .from("images")
          .select("s3Url", "title", "name")
          .where({
            entityId: pd.id,
            entityType: "parcel_management",
          })
          .first();
        return {
          ...pd,
          uploadedImages: imageResult,
        };
      });

      console.log(
        "[controllers][agm][generatePdfOfParcelDocument]: Parecel Details:",
        parcelData
      );

      let requestId = uuid();

      let parcelSlipKey = `parcel-docs-link-${req.orgId}-${new Date().getTime()}`

      console.log(
        "[controllers][agm][generatePdfOfParcelDocument]: Parecel key:",
        parcelSlipKey
      );

      const queueHelper = require("../helpers/queue");
      await queueHelper.addToQueue(
        {
          uuid: requestId,
          data: {
            parcelList: parcelData,
            orgId: req.orgId,
          },
          orgId: req.orgId,
          parcelSlipKey: parcelSlipKey,
          requestedBy: req.me,
        },
        "long-jobs",
        "PARCEL_PREPARE_PENDING_LIST_DOCUMENT"
      );

      let orgData = await knex("organisations")
        .where({ id: req.orgId })
        .first();

      let keyPattern = `parcel-docs-link-${req.orgId}*`;

      let keys = await redisHelper.getKeys(keyPattern);

      console.log("[Parcel][Controller][Parcel-slip-keys]", keys)
      await redisHelper.setValueWithExpiry(
        parcelSlipKey,
        [
          {
            requestId: requestId,
            generatedBy: req.me,
            orgData: orgData,
            s3Url: null,
            generatedAt: moment().format(
              "MMMM DD, yyyy, hh:mm:ss A"
            ),
          },
        ],
        24 * 60 * 60
      );
      return res.status(200).json({
        data: parcelData,
        message:
          "We are preparing Pending Parcel List Document. Please wait for few minutes. Once generated we will notify you via App Notification & Email",
      });
    } catch (err) {
      console.log(
        "[controllers][parcelManagement][list] :  Error",
        err
      );
      res.status(500).json({ failed: true, error: err });
    }
  },

  /*parcel slip list */
  getParcelSlip: async (req, res) => {
    try {


      let keyPattern = `parcel-docs-link-${req.orgId}*`;

      let keys = await redisHelper.getKeys(keyPattern);

      console.log("[Parcel][Controller][Parcel-slip-keys]", keys)
      let i = 0;
      let parcelSlipDocGeneratedList = [];
      for (let key of keys) {
        console.log("parcel keys", i, key)

        let parcelDocs = await redisHelper.getValue(key);

        console.log("Parcel documents", i, parcelDocs)
        // if (parcelDocs.generatedBy && parcelDocs.orgId) {
        parcelSlipDocGeneratedList.push(parcelDocs[0]);

        // }

        i++;

      }
      // let parcelSlipDocGeneratedList =
      //   await redisHelper.getValue(key);

      console.log("[Parcel-management][Controller][parcel-slip-docs]", parcelSlipDocGeneratedList)

      // let parcelSlipDoc = []
      // parcelSlipDocGeneratedList.map((d) => {
      //   d.map((v) => {
      //     console.log("value of v", v)
      //     if (v.requestId) {
      //       parcelSlipDoc.push(v)
      //     }
      //   })
      // })

      return res.status(200).json({
        data: parcelSlipDocGeneratedList,
        message: "",
      });
    } catch (err) {
      res.status(500).json({ failed: true, error: err });
    }
  },

  /*parcel list */

  getParcelList: async (req, res) => {
    try {
      let projectIds = [];
      projectIds = req.accessibleProjects;
      // console.log("ProjectIds:", projectIds);T

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
        createdDateFrom,
        createdDateTo,
        tenantName,
        displayId,
      } = req.body;

      let createDateFrom = moment(createdDateFrom)
        .startOf("date")
        .format();
      let createDateTo = moment(createdDateTo)
        .endOf("date", "days")
        .format();

      let fromNewDate = new Date(createDateFrom).getTime();
      let toNewDate = new Date(createDateTo).getTime();

      let parcelId;

      if (tenantName) {
        parcelId = await knex("parcel_user_non_tis")
          .select("parcel_user_non_tis.parcelId")
          .where(
            "parcel_user_non_tis.name",
            "iLIKE",
            `%${tenantName}%`
          )
          .where("parcel_user_non_tis.type", 1)
          .first();
      }

      // console.log("parcel id for tenant", parcelId);

      if (
        unitId ||
        trackingNo ||
        tenantId ||
        status ||
        companyId ||
        projectId ||
        buildingPhaseId ||
        createdDateFrom ||
        createdDateTo ||
        tenantName ||
        displayId
      ) {
        try {
          [total, rows] = await Promise.all([
            knex
              .count("* as count")
              .from("parcel_management")
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
              .leftJoin(
                "users",
                "parcel_user_tis.tenantId",
                "users.id"
              )
              .leftJoin(
                "companies",
                "parcel_user_tis.companyId",
                "companies.id"
              )
              .leftJoin(
                "projects",
                "parcel_user_tis.projectId",
                "projects.id"
              )
              .leftJoin(
                "buildings_and_phases",
                "parcel_user_tis.buildingPhaseId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "storage",
                "parcel_management.storageLocation",
                "storage.id"
              )
              // .leftJoin("images", "parcel_management.id", "images.entityId")
              .where("parcel_management.orgId", req.orgId)
              .whereIn("projects.id", projectIds)
              .whereNot(
                "parcel_management.pickedUpType",
                null
              )
              .where((qb) => {
                if (unitId) {
                  qb.where("property_units.id", unitId);
                }
                if (trackingNo) {
                  console.log(
                    "tracking number",
                    trackingNo
                  );
                  qb.where(
                    "parcel_management.trackingNumber",
                    trackingNo
                  );
                }
                if (tenantId) {
                  qb.where("users.id", tenantId);
                }
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
                    qb.where({
                      "parcel_management.parcelStatus": 3,
                    });
                  }
                  if (status == 4) {
                    qb.where({
                      "parcel_management.parcelStatus": 4,
                    });
                  }
                  if (status == 5) {
                    qb.where({
                      "parcel_management.parcelStatus": 5,
                    });
                  }
                }
                if (companyId) {
                  console.log("company id", companyId);
                  qb.where(
                    "parcel_user_tis.companyId",
                    companyId
                  );
                }
                if (projectId) {
                  qb.where(
                    "parcel_user_tis.projectId",
                    projectId
                  );
                }
                if (buildingPhaseId) {
                  qb.where(
                    "parcel_user_tis.buildingPhaseId",
                    buildingPhaseId
                  );
                }
                if (createdDateFrom && createdDateTo) {
                  qb.whereBetween(
                    "parcel_management.createdAt",
                    [fromNewDate, toNewDate]
                  );
                }
                // if (tenantName) {
                if (tenantName && parcelId) {
                  qb.where(
                    "parcel_management.id",
                    parcelId.parcelId
                  );
                }
                if (displayId) {
                  qb.where(
                    "parcel_management.displayId",
                    displayId
                  );
                }
                // }
              })
              .where((qb) => {
                qb.where("parcel_user_non_tis.type", 2);
                qb.orWhere(
                  "parcel_user_non_tis.type",
                  null
                );
              })
              .first(),
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
              .leftJoin(
                "users",
                "parcel_user_tis.tenantId",
                "users.id"
              )
              .leftJoin(
                "companies",
                "parcel_user_tis.companyId",
                "companies.id"
              )
              .leftJoin(
                "projects",
                "parcel_user_tis.projectId",
                "projects.id"
              )
              .leftJoin(
                "buildings_and_phases",
                "parcel_user_tis.buildingPhaseId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "storage",
                "parcel_management.storageLocation",
                "storage.id"
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
                "parcel_management.description as remarks",
                "parcel_management.displayId",
                "parcel_management.storageLocation",
                "storage.storageName",
                "storage.storageCode",
                "storage.description",
                // "images.s3Url",
              ])
              .where("parcel_management.orgId", req.orgId)
              .whereIn("projects.id", projectIds)
              .whereNot(
                "parcel_management.pickedUpType",
                null
              )
              .where((qb) => {
                if (unitId) {
                  qb.where("property_units.id", unitId);
                }
                if (trackingNo) {
                  console.log(
                    "tracking number",
                    trackingNo
                  );
                  qb.where(
                    "parcel_management.trackingNumber",
                    trackingNo
                  );
                }
                if (tenantId) {
                  qb.where("users.id", tenantId);
                }
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
                    qb.where({
                      "parcel_management.parcelStatus": 3,
                    });
                  }
                  if (status == 4) {
                    qb.where({
                      "parcel_management.parcelStatus": 4,
                    });
                  }
                  if (status == 5) {
                    qb.where({
                      "parcel_management.parcelStatus": 5,
                    });
                  }
                }
                if (companyId) {
                  console.log("company id", companyId);
                  qb.where(
                    "parcel_user_tis.companyId",
                    companyId
                  );
                }
                if (projectId) {
                  qb.where(
                    "parcel_user_tis.projectId",
                    projectId
                  );
                }
                if (buildingPhaseId) {
                  qb.where(
                    "parcel_user_tis.buildingPhaseId",
                    buildingPhaseId
                  );
                }
                if (createdDateFrom && createdDateTo) {
                  qb.whereBetween(
                    "parcel_management.createdAt",
                    [fromNewDate, toNewDate]
                  );
                }
                // if (tenantName) {
                if (tenantName && parcelId) {
                  qb.where(
                    "parcel_management.id",
                    parcelId.parcelId
                  );
                }
                if (displayId) {
                  qb.where(
                    "parcel_management.displayId",
                    displayId
                  );
                }
                // }
              })
              .where((qb) => {
                qb.where("parcel_user_non_tis.type", 2);
                qb.orWhere(
                  "parcel_user_non_tis.type",
                  null
                );
              })
              .orderBy(
                "parcel_management.createdAt",
                "desc"
              )
              .offset(offset)
              .limit(per_page),
          ]);

          const Parallel = require("async-parallel");

          rows = await Parallel.map(rows, async (pd) => {
            let tenantData = await knex
              .from("parcel_user_non_tis")
              .select("*")
              .where({
                parcelId: pd.id,
                type: 1,
              });

            return { ...pd, tenantData };
          });
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

          let count = total.count;

          pagination.total = count;
          pagination.per_page = per_page;
          pagination.offset = offset;
          pagination.to = offset + rows.length;
          pagination.last_page = Math.ceil(
            count / per_page
          );
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
            .leftJoin(
              "users",
              "parcel_user_tis.tenantId",
              "users.id"
            )
            .leftJoin(
              "companies",
              "parcel_user_tis.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "parcel_user_tis.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "storage",
              "parcel_management.storageLocation",
              "storage.id"
            )
            // .leftJoin("images", "parcel_management.id", "images.entityId")
            .where("parcel_management.orgId", req.orgId)
            .whereNot(
              "parcel_management.pickedUpType",
              null
            )
            .whereIn("projects.id", projectIds)
            .where((qb) => {
              qb.where("parcel_user_non_tis.type", 2);
              qb.orWhere("parcel_user_non_tis.type", null);
            })
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id",
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
            .leftJoin(
              "users",
              "parcel_user_tis.tenantId",
              "users.id"
            )
            .leftJoin(
              "companies",
              "parcel_user_tis.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "parcel_user_tis.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "images",
              "parcel_management.id",
              "images.entityId"
            )
            .leftJoin(
              "storage",
              "parcel_management.storageLocation",
              "storage.id"
            )
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
              "parcel_management.description as remarks",
              "parcel_management.displayId",
              // "parcel_management.storageLocation",
              "storage.id as storageId",
              "storage.storageName",
              "storage.storageCode",
              "storage.description",
            ])
            .where("parcel_management.orgId", req.orgId)
            .whereIn("projects.id", projectIds)
            .whereNot(
              "parcel_management.pickedUpType",
              null
            )
            .where((qb) => {
              qb.where("parcel_user_non_tis.type", 2);
              qb.orWhere("parcel_user_non_tis.type", null);
            })
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id",
              "parcel_user_tis.unitId",
              "parcel_user_tis.parcelId",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description",
              "parcel_user_non_tis.name",
              "storage.id",
            ])
            .orderBy("parcel_management.createdAt", "desc")
            .offset(offset)
            .limit(per_page),
        ]);
        // console.log("rows", rows);
        const Parallel = require("async-parallel");
        rows = await Parallel.map(rows, async (pd) => {
          let tenantData = await knex
            .from("parcel_user_non_tis")
            .select("*")
            .where({
              parcelId: pd.id,
              type: 1,
            });

          return { ...pd, tenantData };
        });
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
      console.log(
        "[controllers][parcel_management][list] :  Error",
        err
      );
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getPendingParcelList: async (req, res) => {
    try {
      let total, rows;
      let reqData = req.query;
      // let pagination = {};
      let perPage = reqData.limit || 10;
      let page = reqData.page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * perPage;

      let projectIds = [];

      projectIds = req.accessibleProjects;
      let {
        unitId,
        tenantId,
        buildingPhaseId,
        trackingNumber,
        id,
        parcelId,
        tenantName,
        createdDateFrom,
        createdDateTo,
        displayId,
      } = req.body;

      let parcel;

      let createDateFrom = moment(createdDateFrom)
        .startOf("date")
        .format();
      let createDateTo = moment(createdDateTo)
        .endOf("date", "days")
        .format();

      let fromNewDate = new Date(createDateFrom).getTime();
      let toNewDate = new Date(createDateTo).getTime();

      if (tenantName) {
        parcel = await knex("parcel_user_non_tis")
          .select("parcel_user_non_tis.parcelId")
          .where(
            "parcel_user_non_tis.name",
            "iLIKE",
            `%${tenantName}%`
          )
          .where("parcel_user_non_tis.type", 1)
          .first();
      }

      // console.log("parcel id for tenant", parcelId);

      if (
        unitId ||
        tenantId ||
        buildingPhaseId ||
        trackingNumber ||
        id ||
        parcelId ||
        tenantName ||
        displayId ||
        createdDateFrom ||
        createdDateTo
      ) {
        try {
          let parcelType;
          let parcelUserData;

          if (parcelId) {
            parcelType = await knex
              .from("parcel_management")
              .select("parcel_management.pickedUpType")
              .where("parcel_management.id", parcelId);

            parcelUserData = await knex("parcel_user_tis")
              .select([
                "parcel_user_tis.tenantId",
                "parcel_user_tis.unitId",
              ])
              .where("parcel_user_tis.parcelId", parcelId);

            console.log(
              "parcel user data",
              parcelUserData[0]
            );
          }
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
              .leftJoin(
                "users",
                "parcel_user_tis.tenantId",
                "users.id"
              )
              .leftJoin(
                "projects",
                "parcel_user_tis.projectId",
                "projects.id"
              )
              .leftJoin(
                "buildings_and_phases",
                "parcel_user_tis.buildingPhaseId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "storage",
                "parcel_management.storageLocation",
                "storage.id"
              )
              .where("parcel_management.orgId", req.orgId)
              .where("parcel_management.parcelStatus", 1)
              .whereIn("projects.id", projectIds)
              .whereNot(
                "parcel_management.pickedUpType",
                null
              )
              .where((qb) => {
                if (unitId) {
                  qb.where(
                    "property_units.unitNumber",
                    unitId
                  );
                }
                if (trackingNumber) {
                  qb.where(
                    "parcel_management.trackingNumber",
                    trackingNumber
                  );
                }
                if (tenantId) {
                  qb.where("users.id", tenantId);
                }
                if (buildingPhaseId) {
                  qb.where(
                    "parcel_user_tis.buildingPhaseId",
                    buildingPhaseId
                  );
                }
                if (tenantName && parcel) {
                  qb.where(
                    "parcel_management.id",
                    parcel.parcelId
                  );
                }
                if (parcelUserData) {
                  console.log(
                    "parcel user data1",
                    parcelUserData
                  );
                  qb.where({
                    "parcel_management.pickedUpType":
                      parcelType[0].pickedUpType,
                  });
                  qb.where(
                    "users.id",
                    parcelUserData[0].tenantId
                  );
                  qb.where(
                    "property_units.id",
                    parcelUserData[0].unitId
                  );
                }
                if (createdDateFrom && createdDateTo) {
                  qb.whereBetween(
                    "parcel_management.createdAt",
                    [fromNewDate, toNewDate]
                  );
                }
                if (displayId) {
                  qb.where(
                    "parcel_management.displayId",
                    displayId
                  );
                }
              })
              .where((qb) => {
                qb.where("parcel_user_non_tis.type", 2);
                qb.orWhere(
                  "parcel_user_non_tis.type",
                  null
                );
              })
              .first(),
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
              .leftJoin(
                "users",
                "parcel_user_tis.tenantId",
                "users.id"
              )
              .leftJoin(
                "projects",
                "parcel_user_tis.projectId",
                "projects.id"
              )
              .leftJoin(
                "buildings_and_phases",
                "parcel_user_tis.buildingPhaseId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "storage",
                "parcel_management.storageLocation",
                "storage.id"
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
                "parcel_management.description as remarks",
                "parcel_management.displayId",
                "parcel_management.qrCode",
                "storage.id as storageId",
                "storage.storageName",
                "storage.storageCode",
                "storage.description",
              ])
              .where("parcel_management.orgId", req.orgId)
              .where("parcel_management.parcelStatus", 1)
              .whereIn("projects.id", projectIds)
              .whereNot(
                "parcel_management.pickedUpType",
                null
              )
              .where((qb) => {
                if (unitId) {
                  qb.where(
                    "property_units.unitNumber",
                    unitId
                  );
                }
                if (trackingNumber) {
                  qb.where(
                    "parcel_management.trackingNumber",
                    trackingNumber
                  );
                }
                if (tenantId) {
                  qb.where("users.id", tenantId);
                }
                if (buildingPhaseId) {
                  qb.where(
                    "parcel_user_tis.buildingPhaseId",
                    buildingPhaseId
                  );
                }
                if (tenantName && parcel) {
                  qb.where(
                    "parcel_management.id",
                    parcel.parcelId
                  );
                }
                if (parcelUserData) {
                  console.log(
                    "parcel user data1",
                    parcelUserData
                  );
                  qb.where({
                    "parcel_management.pickedUpType":
                      parcelType[0].pickedUpType,
                  });
                  qb.where(
                    "users.id",
                    parcelUserData[0].tenantId
                  );
                  qb.where(
                    "property_units.id",
                    parcelUserData[0].unitId
                  );
                }
                if (createdDateFrom && createdDateTo) {
                  qb.whereBetween(
                    "parcel_management.createdAt",
                    [fromNewDate, toNewDate]
                  );
                }
                if (displayId) {
                  qb.where(
                    "parcel_management.displayId",
                    displayId
                  );
                }
              })
              .where((qb) => {
                qb.where("parcel_user_non_tis.type", 2);
                qb.orWhere(
                  "parcel_user_non_tis.type",
                  null
                );
              })
              .orderBy(
                "parcel_management.createdAt",
                "desc"
              )
              .offset(offset)
              .limit(perPage),
          ]);
        } catch (err) {
          console.log(
            "[controllers][parcel_management][list] :  Error",
            err
          );
          return res.status(500).json({
            errors: [
              {
                code: "UNKNOWN_SERVER_ERROR",
                message: err.message,
              },
            ],
          });
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
            .leftJoin(
              "users",
              "parcel_user_tis.tenantId",
              "users.id"
            )
            // .leftJoin("companies", "parcel_user_tis.companyId", "companies.id")
            .leftJoin(
              "projects",
              "parcel_user_tis.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "storage",
              "parcel_management.storageLocation",
              "storage.id"
            )
            .where("parcel_management.orgId", req.orgId)
            .where("parcel_management.parcelStatus", 1)
            .whereIn("projects.id", projectIds)
            .whereNot(
              "parcel_management.pickedUpType",
              null
            )
            .where((qb) => {
              qb.where("parcel_user_non_tis.type", 2);
              qb.orWhere("parcel_user_non_tis.type", null);
            }).first(),
            // .groupBy([
            //   "parcel_management.id",
            //   "property_units.id",
            //   "users.id",
            //   "parcel_user_tis.unitId",
            //   "buildings_and_phases.buildingPhaseCode",
            //   "buildings_and_phases.description",
            //   "parcel_user_non_tis.name",
            // ]),
          // .first(),
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
            .leftJoin(
              "users",
              "parcel_user_tis.tenantId",
              "users.id"
            )
            // .leftJoin("companies", "parcel_user_tis.companyId", "companies.id")
            .leftJoin(
              "projects",
              "parcel_user_tis.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "storage",
              "parcel_management.storageLocation",
              "storage.id"
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
              "parcel_management.description as remarks",
              "parcel_management.displayId",
              "parcel_management.qrCode",
              "storage.id as storageId",
              "storage.storageName",
              "storage.storageCode",
              "storage.description",
            ])
            .where("parcel_management.orgId", req.orgId)
            .where("parcel_management.parcelStatus", 1)
            .whereIn("projects.id", projectIds)
            // .where("parcel_user_non_tis.type", 2)
            // .orWhere("parcel_user_non_tis.type", null)
            .whereNot(
              "parcel_management.pickedUpType",
              null
            )
            .where((qb) => {
              qb.where("parcel_user_non_tis.type", 2);
              qb.orWhere("parcel_user_non_tis.type", null);
            })
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id",
              "parcel_user_tis.unitId",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description",
              "parcel_user_non_tis.name",
              "storage.id",
            ])
            .orderBy("parcel_management.createdAt", "desc")
            .offset(offset)
            .limit(perPage),
        ]);
      }

      const Parallel = require("async-parallel");
      rows = await Parallel.map(rows, async (pd) => {
        let tenantData = await knex
          .from("parcel_user_non_tis")
          .select("*")
          .where({
            parcelId: pd.id,
            type: 1,
          });

        return { ...pd, tenantData };
      });
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


      console.log("Total Parcel list count",total)

      let parcelSlipDocGeneratedList =
        await redisHelper.getValue(`parcel-docs-link`);

      // console.log("total count",total)
      return res.status(200).json({
        data: {
          parcel: rows,
          total: total.count,
          from: (page - 1) * perPage + 1,
          to: page * perPage,
          nextPage:
            total.length > page * perPage ? page + 1 : null,
        },
        parcelSlipDocGeneratedList:
          parcelSlipDocGeneratedList,
        message: "parcel List!",
      });
    } catch (err) {
      console.log(
        "[controllers][parcel_management][list] :  Error",
        err
      );
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  /*Parcel Details */
  getParcelDetails: async (req, res) => {
    try {
      let projectIds = [];
      let projectsForPracel = req.userProjectResources;
      projectsForPracel = projectsForPracel.find(
        (pfp) => pfp.id == 10
      );
      console.log("Project For Parcel:", projectsForPracel);
      let accessibleProjects = projectsForPracel.projects;
      console.log(
        "Project For Parcel:",
        accessibleProjects
      );
      projectIds = _.uniqBy(accessibleProjects);
      console.log("ProjectIds:", projectIds);

      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required(),
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
          // .leftJoin(
          //   "parcel_user_non_tis",
          //   "parcel_management.id",
          //   "parcel_user_non_tis.parcelId"
          // )
          .leftJoin(
            "property_units",
            "parcel_user_tis.unitId",
            "property_units.id"
          )
          .leftJoin(
            "users",
            "parcel_user_tis.tenantId",
            "users.id"
          )
          .leftJoin(
            "companies",
            "parcel_user_tis.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "parcel_user_tis.projectId",
            "projects.id"
          )
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
          .leftJoin(
            "courier",
            "parcel_management.carrierId",
            "courier.id"
          )
          .leftJoin(
            "parcel_type",
            "parcel_management.parcelType",
            "parcel_type.id"
          )
          .leftJoin(
            "storage",
            "parcel_management.storageLocation",
            "storage.id"
          )
          .select([
            "parcel_management.*",
            "parcel_user_tis.*",
            "parcel_management.id as parcelId",
            // "parcel_user_non_tis.*",
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
            "parcel_type.parcelType as pType",
            "storage.storageName",
            "storage.storageCode",
            "storage.description as storageDescription",
          ])
          // .where("parcel_user_non_tis.type",2)
          // .orWhere("parcel_user_non_tis.type",null)
          .where("parcel_management.id", payload.id)
          .whereIn("projects.id", projectIds)
          .first(),
        knex.from("images").where({
          entityId: payload.id,
          entityType: "parcel_management",
        }),

        knex.from("images").where({
          entityId: payload.id,
          entityType: "pickup_parcel",
        }),

        knex.from("remarks_master").where({
          entityId: payload.id,
          entityType: "pickup_parcel_remarks",
          orgId: req.orgId,
        }),
      ]);

      let parcel_non_user_tis_tenant = await knex
        .from("parcel_user_non_tis")
        .select("*")
        .where({
          "parcel_user_non_tis.parcelId": payload.id,
          "parcel_user_non_tis.type": 1,
        });

      let parcel_non_user_tis = await knex
        .from("parcel_user_non_tis")
        .select("*")
        .where({
          "parcel_user_non_tis.parcelId": payload.id,
          "parcel_user_non_tis.type": 2,
        });

      return res.status(200).json({
        parcelDetails: {
          ...parcelDetails,
          parcel_non_user_tis,
          parcel_non_user_tis_tenant,
          parcelImages,
          pickedUpImages,
          pickedUpRemark,
        },
        message: "Parcel Details !",
      });
    } catch (err) {
      console.log(
        "controller[parcel-management][parcelDetails]"
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
  updateParcelDetails: async (req, res) => {
    try {
      // let parcel = null;
      // let insertedImages = [];
      let id = req.body.id;

      let parcelResult = null;
      let noOrgUserData = [];
      // let noOrgUserDataTenant = [];
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
          carrierId: Joi.number().allow(null).optional(),
          parcelType: Joi.number().required(),
          description: Joi.string().allow("").optional(),
          parcelCondition: Joi.string().required(),
          parcelStatus: Joi.number().required(),
          parcelPriority: Joi.number()
            .allow(null)
            .optional(),
          barcode: Joi.string().allow("").optional(),
          storage: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
        });

        const result = Joi.validate(parcelPayload, schema);
        console.log("result", result);

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
        parcelPayload = _.omit(parcelPayload, ["storage"]);

        const insertData = {
          ...parcelPayload,
          storageLocation: req.body.storage,
          orgId: orgId,
          updatedAt: currentTime,
        };

        let updateResult = await knex
          .update(insertData)
          .where({ id: payload.id })
          .returning(["*"])
          .transacting(trx)
          .into("parcel_management");
        parcelResult = updateResult[0];

        let noOrgUserDataPayload =
          req.body.non_org_user_data;
        if (noOrgUserDataPayload) {
          noOrgUserData = await knex("parcel_user_non_tis")
            .update({
              // ...noOrgUserDataPayload,
              name: noOrgUserDataPayload.name,
              email: noOrgUserDataPayload.email,
              phoneNo: noOrgUserDataPayload.phoneNo,
              address: noOrgUserDataPayload.address,
              updatedAt: currentTime,
            })
            .where({ parcelId: payload.id, type: 2 })
            .orWhere({ parcelId: payload.id, type: null })
            .returning(["*"]);

          noOrgUserDataTenant = await knex(
            "parcel_user_non_tis"
          )
            .update({
              name: noOrgUserDataPayload.tenantName,
              email: noOrgUserDataPayload.tenantEmail,
              phoneNo: noOrgUserDataPayload.tenantPhoneNo,
              address: noOrgUserDataPayload.tenantAddress,
              updatedAt: currentTime,
            })
            .where({ parcelId: payload.id, type: 1 })
            // .orWhere({parcelId: payload.id , type:null})
            .returning(["*"]);
        }

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
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
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
        .select([
          "parcel_management.id",
          "parcel_management.trackingNumber",
        ])
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
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  updateParcel: async (req, res) => {
    try {
      let insertedImages = [];
      let id = req.body.id;
      let pickedUpType = req.body.pickedUpType;
      // let { id, pickedUpType } = req.body;
      let parcelResult = null;
      let parcelRemarks = [];
      console.log(
        "req parcel data",
        req.body.tenantId[0],
        req.body.pickedUpType[0]
      );

      const payload = _.omit(req.body, [
        "id",
        "image",
        "signImage",
        "signName",
        "description",
        "pickedUpType",
        "tenantId",
        "isChecked",
      ]);

      const schema = Joi.object().keys({
        parcelStatus: Joi.string().required(),
        signature: Joi.string().allow("").optional(),
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
      const currentTime = new Date().getTime();

      let deliverParcelResult = await knex(
        "parcel_management"
      )
        .update({
          ...payload,
          updatedAt: currentTime,
          receivedDate: currentTime,
        })
        .whereIn("parcel_management.id", id)
        .where("parcel_management.orgId", req.orgId)
        .returning(["*"]);

      let orgMaster = await knex
        .from("organisations")
        .where({ id: req.orgId })
        .first();

      let dataNos = {
        payload: {
          orgData: orgMaster,
          parcelId: id,
        },
      };
      let tenantId = req.body.tenantId[0];
      const ALLOWED_CHANNELS = [
        "IN_APP",
        "WEB_PUSH",
        "SOCKET_NOTIFY",
        "EMAIL",
      ];
      let sender = await knex
        .from("users")
        .where({ id: req.me.id })
        .first();
      let receiver = await knex
        .from("users")
        .where({ id: tenantId })
        .first();
      // console.log("parcel rejected=====>>>>>>",req.body.parcelStatus[0],req.body.isChecked)
      if (
        req.body.pickedUpType[0] == 2 &&
        req.body.parcelStatus == 2 &&
        req.body.isChecked == true &&
        receiver
      ) {
        // console.log("parcel pickedup")
        await parcelCollectedNotification.send(
          sender,
          receiver,
          dataNos,
          ALLOWED_CHANNELS
        );
      } else if (
        req.body.pickedUpType[0] == 1 &&
        req.body.parcelStatus == 2 &&
        req.body.isChecked == true &&
        receiver
      ) {
        // console.log("parcel pickedup=====>>>>>",req.body.pickedUpType[0])
        await parcelPickedUpNotification.send(
          sender,
          receiver,
          dataNos,
          ALLOWED_CHANNELS
        );
      } else if (
        req.body.parcelStatus == 3 &&
        req.body.isChecked == true &&
        receiver
      ) {
        // console.log("parcel rejected=====>>>>>",req.body.pickedUpType[0])
        await parcelRejectedNotification.send(
          sender,
          receiver,
          dataNos,
          ALLOWED_CHANNELS
        );
      } else if (
        req.body.parcelStatus == 4 &&
        req.body.isChecked == true &&
        receiver
      ) {
        // console.log("parcel returned=====>>>>>",req.body.pickedUpType[0])
        await parcelReturnedNotification.send(
          sender,
          receiver,
          dataNos,
          ALLOWED_CHANNELS
        );
      } else if (
        req.body.parcelStatus == 5 &&
        req.body.isChecked == true &&
        receiver
      ) {
        await parcelCanceledNotification.send(
          sender,
          receiver,
          dataNos,
          ALLOWED_CHANNELS
        );
      }

      let description = req.body.description;
      let idLength = req.body.id.length;
      for (let i = 0; i < idLength; i++) {
        parcelRemarks = await knex("remarks_master").insert(
          {
            description: description,
            entityId: req.body.id[i],
            entityType: "pickup_parcel_remarks",
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          }
        );
      }

      let parcelStatus;
      let parcelDetail;

      let imageUrl = [];
      imageUrl = await knex
        .from("images")
        .where({
          entityType: "pickup_parcel",
        })
        .whereIn("entityId", id);

      console.log("[Image][URL]", imageUrl);
      if (pickedUpType == 1) {
        if (payload.parcelStatus == 1) {
          parcelStatus = "Ready for Pick-up";
        } else if (payload.parcelStatus == 2) {
          parcelStatus = "Picked up";
        } else if (payload.parcelStatus == 3) {
          parcelStatus = "Reject";
        } else if (payload.parcelStatus == 4) {
          parcelStatus = "Return";
        } else if (payload.parcelStatus == 5) {
          parcelStatus = "Cancel";
        }
        parcelDetail = {
          parcelId: id,
          parcelType: "Incoming Parcel",
          status: parcelStatus,
          pickedUpImages:
            imageUrl && imageUrl[0]
              ? imageUrl[0].s3Url
              : null,
          signature: payload.signature,
          remarks: req.body.description,
        };
      } else {
        if (payload.parcelStatus == 1) {
          parcelStatus = "Awaiting Collection";
        } else if (payload.parcelStatus == 2) {
          parcelStatus = "Collected";
        } else if (payload.parcelStatus == 3) {
          parcelStatus = "Reject";
        } else if (payload.parcelStatus == 4) {
          parcelStatus = "Return";
        } else if (payload.parcelStatus == 5) {
          parcelStatus = "Cancel";
        }
        parcelDetail = {
          parcelId: id,
          parcelType: "Outgoing Parcel",
          status: parcelStatus,
          pickedUpImages:
            imageUrl && imageUrl[0]
              ? imageUrl[0].s3Url
              : null,
          signature: payload.signature,
          remarks: req.body.description,
        };
      }

      const parcelSNSHelper = require("../helpers/parcel");
      await parcelSNSHelper.parcelSNSNotification({
        orgId: req.orgId,
        module: "PARCEL",
        data: {
          parcelDetail,
          //  senderData, receiverData
        },
        receiver,
      });

      return res.status(200).json({
        data: {
          deliverParcel: deliverParcelResult,
          addedImages: insertedImages,
          parcelRemarks,
        },
      });
    } catch (err) { }
  },

  getParcelStatusForCheckOut: async (req, res) => {
    try {
      let parcelId = req.body.parcelId;
      console.log("request", parcelId);

      let parcelStatus = await knex
        .from("parcel_management")
        .select([
          "parcel_management.id",
          "parcel_management.parcelStatus",
        ])
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
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getQrCodeImageUrl: async (req, res) => {
    try {
      let unitNumber = req.body.unitNumber;
      let parcelId = req.body.parcelId;
      let orgId = req.orgId;

      let qrCode1 =
        "org~" +
        orgId +
        "~unitNumber~" +
        unitNumber +
        "~parcel~" +
        parcelId;
      let qrCode;
      if (qrCode1) {
        qrCode = await QRCODE.toDataURL(qrCode1);
      }

      let fileName = "parcel-" + parcelId + ".png";
      let filePath = fileName;
      let base64Data;
      if (qrCode) {
        base64Data = new Buffer.from(
          qrCode.replace(/^data:([A-Za-z-+/]+);base64,/, "")
        );
        fs.writeFile(
          "parcel.png",
          base64Data,
          "base64",
          (err) => {
            console.log("error in file", err);
          }
        );
      }
      const AWS = require("aws-sdk");
      fs.readFile(filePath, function (err, file) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: "parcel/" + fileName,
          Body: file,
          ContentType: "image/png",
        };

        s3.putObject(params, function (err, data) {
          if (err) {
            console.log(
              "Error at uploadImageOnS3Bucket function",
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
          } else {
            console.log("File uploaded Successfully");
            let url =
              process.env.S3_BUCKET_URL +
              "/parcel/" +
              fileName;

            console.log("url of image", url);

            return res.status(200).json({
              data: {
                message: "Qr code Get Successfully!",
                url: url,
              },
            });
          }
        });
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][exoportCompany] :  Error",
        err
      );
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
        .update({
          parcelStatus: "2",
          receivedDate: currentTime,
        })
        .whereIn("parcel_management.id", parcelId);

      return res.status(200).json({
        data: {
          status: "Dispatched",
        },
        message: "Parcel Dispatched successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  approvePendingStatus: async (req, res) => {
    try {
      let parcelId = req.body.parcelId;

      const pendingApproval = await knex(
        "parcel_management"
      )
        .update({ isPendingForApproval: true })
        .whereIn("parcel_management.id", parcelId);

      return res.status(200).json({
        data: {
          message: "Pending Approved",
          pendingApproval: pendingApproval,
        },
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getUnitDetailsByUnitId: async (req, res) => {
    try {
      let projectIds = [];
      let projectsForPracel = req.userProjectResources;
      projectsForPracel = projectsForPracel.find(
        (pfp) => pfp.id == 10
      );
      // console.log("Project For Parcel:", projectsForPracel);
      let accessibleProjects = projectsForPracel.projects;
      // console.log(
      //   "Project For Parcel:",
      //   accessibleProjects
      // );
      projectIds = _.uniqBy(accessibleProjects);
      // console.log("ProjectIds:", projectIds);

      let payload = req.body;

      // console.log("data in payload", payload);

      let units = await knex
        .from("property_units")
        .leftJoin(
          "companies",
          "property_units.companyId",
          "companies.id"
        )
        .leftJoin(
          "projects",
          "property_units.projectId",
          "projects.id"
        )
        .leftJoin(
          "buildings_and_phases",
          "property_units.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .innerJoin(
          "floor_and_zones",
          "property_units.floorZoneId",
          "floor_and_zones.id"
        )
        .select([
          "property_units.companyId as companyId",
          "companies.companyName as companyName",
          "property_units.projectId as projectId",
          "projects.projectName as projectName",
          "property_units.buildingPhaseId as buildingPhaseId",
          "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
          "buildings_and_phases.description as buildingDescription",
          "property_units.floorZoneId as floorZoneId",
          "floor_and_zones.floorZoneCode as floorZoneCode",
          "floor_and_zones.description",
          "property_units.unitNumber as unitNumber",
          "property_units.id as unitId",
        ])
        .where({
          "property_units.isActive": true,
          "property_units.orgId": req.orgId,
        })
        .where(
          "property_units.unitNumber",
          "iLIKE",
          `%${payload.unitNumber}%`
        )
        // .where({"property_units.isActive":true,"property_units.orgId":req.orgId})
        .whereIn("property_units.projectId", projectIds);

      return res.status(200).json({
        data: {
          units,
        },
        message: "Property units data",
      });
    } catch (error) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getBuildingPhaseListForParcel: async (req, res) => {
    try {
      const { projectId } = req.body;
      let orgId = req.orgId;
      let projectIds = req.accessibleProjects;

      let parcelBuildings = await knex(
        "parcel_user_tis"
      ).select(["buildingPhaseId"]);

      parcelBuildings = _.uniqBy(
        parcelBuildings,
        "buildingPhaseId"
      );

      parcelBuildings = parcelBuildings.map((d) => {
        return d.buildingPhaseId;
      });

      let buildings;
      if (projectId) {
        // console.log("projec id fpr building",projectId)
        buildings = await knex("buildings_and_phases")
          .select("*")
          .where({
            projectId: projectId,
            orgId: orgId,
            isActive: true,
          })
          .whereIn("projectId", projectIds)
          .whereIn("id", parcelBuildings)
          .orderBy(
            "buildings_and_phases.description",
            "asc"
          );
      } else {
        buildings = await knex("buildings_and_phases")
          .select("*")
          .where({ orgId: orgId, isActive: true })
          .whereIn("projectId", projectIds)
          // .whereIn("id", parcelBuildings)
          .orderBy(
            "buildings_and_phases.description",
            "asc"
          );
      }
      return res.status(200).json({
        data: { buildings, projectIds },
        message: "Buildings list",
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] :  Error",
        err
      );
      //trx.rollback
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

  getParcelType: async (req, res) => {
    try {
      let parcelTypeList;

      parcelTypeList = await knex
        .from("parcel_type")
        .select([
          "parcel_type.id",
          "parcel_type.parcelType",
          "parcel_type.description",
        ])
        .where({
          // orgId: req.orgId,
          isActive: true,
        })
        .where((qb) => {
          qb.where("orgId", req.orgId);
          qb.orWhere("orgId", null);
        });

      return res.status(200).json({
        data: parcelTypeList,
        message: "Parcel Type list",
      });
    } catch (err) {
      console.log(
        "[controllers][Parcel][Parcel Type] :  Error",
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
  getPickedupParcelList: async (req, res) => {
    try {
      // let payload = req.body;

      let projectIds = [];
      projectIds = req.accessibleProjects;

      let reqData = req.query;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let {
        unitId,
        trackingNo,
        tenantId,
        status,
        companyId,
        projectId,
        buildingPhaseId,
        createdDateFrom,
        createdDateTo,
        tenantName,
      } = req.body;

      let createDateFrom = moment(createdDateFrom)
        .startOf("date")
        .format();
      let createDateTo = moment(createdDateTo)
        .endOf("date", "days")
        .format();

      let fromNewDate = new Date(createDateFrom).getTime();
      let toNewDate = new Date(createDateTo).getTime();

      let parcelId;

      if (tenantName) {
        parcelId = await knex("parcel_user_non_tis")
          .select("parcel_user_non_tis.parcelId")
          .where(
            "parcel_user_non_tis.name",
            "iLIKE",
            `%${tenantName}%`
          )
          .where("parcel_user_non_tis.type", 1)
          .first();
      }

      if (
        unitId ||
        trackingNo ||
        tenantId ||
        status ||
        companyId ||
        projectId ||
        buildingPhaseId ||
        createdDateFrom ||
        createdDateTo ||
        tenantName
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
              .leftJoin(
                "users",
                "parcel_user_tis.tenantId",
                "users.id"
              )
              .leftJoin(
                "companies",
                "parcel_user_tis.companyId",
                "companies.id"
              )
              .leftJoin(
                "projects",
                "parcel_user_tis.projectId",
                "projects.id"
              )
              .leftJoin(
                "buildings_and_phases",
                "parcel_user_tis.buildingPhaseId",
                "buildings_and_phases.id"
              )
              .where("parcel_management.orgId", req.orgId)
              .whereIn("projects.id", projectIds)
              .whereNot(
                "parcel_management.pickedUpType",
                null
              )
              .whereNot("parcel_management.parcelStatus", 1)
              .where((qb) => {
                qb.where("parcel_user_non_tis.type", 2);
                qb.orWhere(
                  "parcel_user_non_tis.type",
                  null
                );
                if (unitId) {
                  qb.where("property_units.id", unitId);
                }
                if (trackingNo) {
                  console.log(
                    "Tracking Number1",
                    trackingNo
                  );
                  qb.where(
                    "parcel_management.trackingNumber",
                    trackingNo
                  );
                }
                if (tenantId) {
                  qb.where("users.id", tenantId);
                }
                if (status) {
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
                    qb.where({
                      "parcel_management.parcelStatus": 3,
                    });
                  }
                  if (status == 4) {
                    qb.where({
                      "parcel_management.parcelStatus": 4,
                    });
                  }
                  if (status == 5) {
                    qb.where({
                      "parcel_management.parcelStatus": 5,
                    });
                  }
                }
                if (companyId) {
                  console.log("company id", companyId);
                  qb.where(
                    "parcel_user_tis.companyId",
                    companyId
                  );
                }
                if (projectId) {
                  qb.where(
                    "parcel_user_tis.projectId",
                    projectId
                  );
                }
                if (buildingPhaseId) {
                  qb.where(
                    "parcel_user_tis.buildingPhaseId",
                    buildingPhaseId
                  );
                }
                if (createdDateFrom && createdDateTo) {
                  qb.whereBetween(
                    "parcel_management.createdAt",
                    [fromNewDate, toNewDate]
                  );
                }
                if (tenantName && parcelId) {
                  qb.where(
                    "parcel_management.id",
                    parcelId.parcelId
                  );
                }
              })
              .where((qb) => {
                qb.where("parcel_user_non_tis.type", 2);
                qb.orWhere(
                  "parcel_user_non_tis.type",
                  null
                );
              })
              .groupBy([
                "parcel_management.id",
                "property_units.id",
                "users.id",
                "parcel_user_tis.unitId",
              ]),
            // .first(),
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
              .leftJoin(
                "users",
                "parcel_user_tis.tenantId",
                "users.id"
              )
              .leftJoin(
                "companies",
                "parcel_user_tis.companyId",
                "companies.id"
              )
              .leftJoin(
                "projects",
                "parcel_user_tis.projectId",
                "projects.id"
              )
              .leftJoin(
                "buildings_and_phases",
                "parcel_user_tis.buildingPhaseId",
                "buildings_and_phases.id"
              )
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
                "parcel_management.description as remarks",
                "parcel_management.displayId",
              ])
              .where("parcel_management.orgId", req.orgId)
              .whereIn("projects.id", projectIds)
              .whereNot(
                "parcel_management.pickedUpType",
                null
              )
              .whereNot("parcel_management.parcelStatus", 1)
              .where((qb) => {
                if (unitId) {
                  qb.where("property_units.id", unitId);
                }
                if (trackingNo) {
                  console.log(
                    "tracking number",
                    trackingNo
                  );
                  qb.where(
                    "parcel_management.trackingNumber",
                    trackingNo
                  );
                }
                if (tenantId) {
                  qb.where("users.id", tenantId);
                }
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
                    qb.where({
                      "parcel_management.parcelStatus": 3,
                    });
                  }
                  if (status == 4) {
                    qb.where({
                      "parcel_management.parcelStatus": 4,
                    });
                  }
                  if (status == 5) {
                    qb.where({
                      "parcel_management.parcelStatus": 5,
                    });
                  }
                }
                if (companyId) {
                  console.log("company id", companyId);
                  qb.where(
                    "parcel_user_tis.companyId",
                    companyId
                  );
                }
                if (projectId) {
                  qb.where(
                    "parcel_user_tis.projectId",
                    projectId
                  );
                }
                if (buildingPhaseId) {
                  qb.where(
                    "parcel_user_tis.buildingPhaseId",
                    buildingPhaseId
                  );
                }
                if (createdDateFrom && createdDateTo) {
                  qb.whereBetween(
                    "parcel_management.createdAt",
                    [fromNewDate, toNewDate]
                  );
                }
                if (tenantName && parcelId) {
                  qb.where(
                    "parcel_management.id",
                    parcelId.parcelId
                  );
                }
              })
              .where((qb) => {
                qb.where("parcel_user_non_tis.type", 2);
                qb.orWhere(
                  "parcel_user_non_tis.type",
                  null
                );
              })
              .orderBy(
                "parcel_management.createdAt",
                "desc"
              )
              .offset(offset)
              .limit(per_page),
          ]);
          // console.log("rows", rows);

          const Parallel = require("async-parallel");

          rows = await Parallel.map(rows, async (pd) => {
            let tenantData = await knex
              .from("parcel_user_non_tis")
              .select("*")
              .where({
                parcelId: pd.id,
                type: 1,
              });
            return { ...pd, tenantData };
          });
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
          pagination.last_page = Math.ceil(
            count / per_page
          );
          pagination.current_page = page;
          pagination.from = offset;
          pagination.data = rows;
        } catch (err) {
          console.log(
            "[controllers][parcel_management][list] :  Error",
            err
          );
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
            .leftJoin(
              "users",
              "parcel_user_tis.tenantId",
              "users.id"
            )
            .leftJoin(
              "companies",
              "parcel_user_tis.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "parcel_user_tis.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            // .leftJoin("images", "parcel_management.id", "images.entityId")
            .where("parcel_management.orgId", req.orgId)
            .whereNot(
              "parcel_management.pickedUpType",
              null
            )
            .whereNot("parcel_management.parcelStatus", 1)
            .whereIn("projects.id", projectIds)
            .where((qb) => {
              qb.where("parcel_user_non_tis.type", 2);
              qb.orWhere("parcel_user_non_tis.type", null);
            })
            .groupBy([
              "parcel_management.id",
              "property_units.id",
              "users.id",
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
            .leftJoin(
              "users",
              "parcel_user_tis.tenantId",
              "users.id"
            )
            .leftJoin(
              "companies",
              "parcel_user_tis.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "parcel_user_tis.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "parcel_user_tis.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "images",
              "parcel_management.id",
              "images.entityId"
            )
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
              "parcel_management.description as remarks",
              "parcel_management.displayId",
            ])
            .where("parcel_management.orgId", req.orgId)
            .whereIn("projects.id", projectIds)
            .whereNot(
              "parcel_management.pickedUpType",
              null
            )
            .whereNot("parcel_management.parcelStatus", 1)
            .where((qb) => {
              qb.where("parcel_user_non_tis.type", 2);
              qb.orWhere("parcel_user_non_tis.type", null);
            })
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
        // console.log("rows", rows);
        const Parallel = require("async-parallel");
        rows = await Parallel.map(rows, async (pd) => {
          let tenantData = await knex
            .from("parcel_user_non_tis")
            .select("*")
            .where({
              parcelId: pd.id,
              type: 1,
            });

          return { ...pd, tenantData };
        });
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
      console.log(
        "[controllers][parcel_management][list] :  Error",
        err
      );
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getStorage: async (req, res) => {
    try {
      let storage;

      storage = await knex
        .from("storage")
        .select([
          "storage.storageName",
          "storage.storageCode",
          "storage.description",
          "storage.id",
        ])
        .where({
          orgId: req.orgId,
          isActive: true,
        });
      return res.status(200).json({
        data: storage,
        message: "Storage list",
      });
    } catch (err) {
      console.log(
        "[controllers][parcel_management][storage-list] :  Error",
        err
      );
      return res.status(500).json({
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
module.exports = parcelManagementController;
