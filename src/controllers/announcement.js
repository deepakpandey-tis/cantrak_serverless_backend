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

const announcementNotification = require("../notifications/announcement-notification/announcement-notification");

const announcementController = {
  saveAnnouncementNotifications: async (req, res) => {
    try {
      let announcementPayload = req.body;

      let announcementResult = null;
      let id = req.body.userId;
      console.log("req user id for teamuser",req.body.userId)
      userIds = [];
      let newAnnouncementId = req.body.newAnnouncementId;
      await knex.transaction(async (trx) => {
        let ALLOWED_CHANNELS = [];
        if (req.body.email == true) {
          ALLOWED_CHANNELS.push("EMAIL");
        }
        if (req.body.webPush == true) {
          ALLOWED_CHANNELS.push("WEB_PUSH");
        }
        if (req.body.inApp == true) {
          ALLOWED_CHANNELS.push("IN_APP");
        }
        if (req.body.line == true) {
          ALLOWED_CHANNELS.push("LINE_NOTIFY");
        }
        if (req.body.sms == true) {
          ALLOWED_CHANNELS.push("SMS");
        }
        const payload = _.omit(announcementPayload, [
          "userId",
          "newAnnouncementId",
        ]);

        const schema = Joi.object().keys({
          title: Joi.string().required(),
          description: Joi.string().required(),
          url: Joi.string().allow("").optional(),
          email: Joi.boolean().required(),
          webPush: Joi.boolean().required(),
          inApp: Joi.boolean().required(),
          line: Joi.boolean().required(),
          sms: Joi.boolean().required(),
          userType: Joi.number().required()
        });

        let result = Joi.validate(payload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        let currentTime = new Date().getTime();

        let insertAnnouncementPayload = {
          ...payload,
          savedStatus: 2,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId,
        };

        let announcementNotificationResult = await knex
          .update(insertAnnouncementPayload)
          .where({ id: newAnnouncementId })
          .returning(["*"])
          .transacting(trx)
          .into("announcement_master");
        announcementResult = announcementNotificationResult[0];

        let userId = req.body.userId;
        let dataNos = {
          payload: {
            title: req.body.title,
            url: req.body.url,
            description: req.body.description,
          },
        };

        let sender = await knex.from("users").where({ id: req.me.id }).first();

        if (userId && userId.length > 0) {
          for (let id of userId) {
            let d = await knex("announcement_user_master")
              .insert({
                announcementId: newAnnouncementId,
                userId: id,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"]);

            userIds.push(d[0]);

            let receiver = await knex.from("users").where({ id: id }).first();

            await announcementNotification.send(
              sender,
              receiver,
              dataNos,
              ALLOWED_CHANNELS
            );
          }
        }
      });

      res.status(200).json({
        data: {
          announcementResult,
        },
        message: "Announcement added successfully !",
      });
    } catch (err) {
      console.log("[controllers][announcement][addAnnouncement] : Error", err);
    }
  },

  generateAnnouncementId: async (req, res) => {
    try {
      const generatedId = await knex("announcement_master")
        .insert({ createdAt: new Date().getTime() })
        .returning(["*"]);
      return res.status(200).json({
        data: {
          id: generatedId[0].id,
        },
      });
    } catch (err) {
      console.log("[controllers][announcement][notification] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  saveAnnouncementAsDraft: async (req, res) => {
    try {
      let announcementPayload = req.body;

      let announcementResult = null;
      let id = req.body.userId;
      userIds = [];
      let newAnnouncementId = req.body.newAnnouncementId;

      await knex.transaction(async (trx) => {
        const payload = _.omit(announcementPayload, [
          "userId",
          "newAnnouncementId",
        ]);

        const schema = Joi.object().keys({
          title: Joi.string().required(),
          description: Joi.string().required(),
          url: Joi.string().allow("").optional(),
          email: Joi.boolean().required(),
          webPush: Joi.boolean().required(),
          inApp: Joi.boolean().required(),
          line: Joi.boolean().required(),
          sms: Joi.boolean().required(),
          userType:Joi.number().required()
        });

        let result = Joi.validate(payload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        let currentTime = new Date().getTime();

        let insertAnnouncementPayload = {
          ...payload,
          savedStatus: 1,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId,
        };

        let announcementNotificationResult = await knex
          .update(insertAnnouncementPayload)
          .where({ id: newAnnouncementId })
          .returning(["*"])
          .transacting(trx)
          .into("announcement_master");
        announcementResult = announcementNotificationResult[0];

        let userId = req.body.userId;

        if (userId && userId.length > 0) {
          for (let id of userId) {
            let d = await knex("announcement_user_master")
              .insert({
                announcementId: newAnnouncementId,
                userId: id,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"]);

            userIds.push(d[0]);
          }
        }
      });
      res.status(200).json({
        data: {
          announcementResult,
        },
        message: "Announcement Saved as draft !",
      });
    } catch (err) {
      console.log("[controllers][announcement][addAnnouncement] : Error", err);
    }
  },

  getAnnouncementList: async (req, res) => {
    try {
      let reqData = req.query;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let filters = {};

      let { title, announcementId, announcementType, createdDate } = req.body;

      if (title || announcementId || announcementType || createdDate) {
        try {
          [total, rows] = await Promise.all([
            knex
              .count("* as count")
              .from("announcement_master")
              .leftJoin(
                "announcement_user_master",
                "announcement_master.id",
                "announcement_user_master.announcementId"
              )
              .where("announcement_master.orgId", req.orgId)
              .where((qb) => {
                if (title) {
                  qb.where("announcement_master.title", title);
                }
                if (announcementId) {
                  qb.where("announcement_master.id", announcementId);
                }
                if (announcementType) {
                  qb.where("announcement_master.savedStatus", announcementType);
                }

                if (createdDate) {
                  qb.where("announcement_master.createdAt", createdDate);
                }
              })
              .groupBy([
                "announcement_master.id",
                
              ]),
            knex
              .from("announcement_master")
              .leftJoin(
                "announcement_user_master",
                "announcement_master.id",
                "announcement_user_master.announcementId"
              )
              .select([
                "announcement_master.id",
                "announcement_master.title",
                "announcement_master.savedStatus",
                "announcement_master.createdAt",
                "announcement_master.url",
                "announcement_master.userType"
                
              ])
              .where("announcement_master.orgId", req.orgId)
              .where((qb) => {
                if (title) {
                  qb.where("announcement_master.title", title);
                }
                if (announcementId) {
                  qb.where("announcement_master.id", announcementId);
                }
                if (announcementType) {
                  qb.where("announcement_master.savedStatus", announcementType);
                }

                if (createdDate) {
                  qb.where("announcement_master.createdAt", createdDate);
                }
              })
              .orderBy("announcement_master.createdAt", "desc")
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
        } catch (err) {}
      } else {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .count("* as count")
            .from("announcement_master")
            .leftJoin(
              "announcement_user_master",
              "announcement_master.id",
              "announcement_user_master.announcementId"
            )
            .where("announcement_master.orgId", req.orgId)
            .groupBy([
                "announcement_master.id",
                
              ]),
              knex
              .from("announcement_master")
              .leftJoin(
                "announcement_user_master",
                "announcement_master.id",
                "announcement_user_master.announcementId"
              )
              .select([
                "announcement_master.id",
                "announcement_master.title",
                "announcement_master.savedStatus",
                "announcement_master.createdAt",
                "announcement_master.url",
                "announcement_master.userType"
              ])
              .where("announcement_master.orgId", req.orgId)
              .groupBy([
                "announcement_master.id",
                
              ])
              .orderBy("announcement_master.createdAt", "desc")
              .offset(offset)
              .limit(per_page)
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
          announcement: pagination,
        },
        message: "Announcement List!",
      });
    } catch (err) {
        console.log("[controllers][announcement][list] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
  },

  getAnnouncementDeatails:async(req,res)=>{
      try {
          let id = req.body.id
          let payload = req.body
          console.log("id of announcement",id)
          const schema = Joi.object().keys({
            id: Joi.string().required(),
          });

          const result = Joi.validate(payload, schema);

          if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
              errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
            });
          }

          let [announcementDetails,users] = await Promise.all([
              knex
              .from('announcement_master')
              // .leftJoin('announcement_user_master','announcement_master.id','announcement_user_master.announcementId')
              // .leftJoin('user_house_allocation','announcement_user_master.userId','user_house_allocation.userId')
              // .leftJoin('property_units','user_house_allocation.houseId','property_units.id')
              // .leftJoin('floor_and_zones','property_units.floorZoneId','floor_and_zones.id')
              // .leftJoin('buildings_and_phases','property_units.buildingPhaseId','bildings_and_phases.id')
              // .leftJoin('projects','property_units.projectId','projects.id')
              // .leftJoin('companies','property_units.companyId','companies.id')
              // .leftJoin('users','announcement_user_master.userId','users.id')
              .select([
                'announcement_master.*',
                // 'users.name',
                // 'companies.companyName',
                // 'companies.id',
                // 'projects.projectName',
                // 'projects.id',
                // 'buildings_and_phases.buildingPhaseCode',
                // 'buildings_and_phases.description',
                // 'floor_and_zones.floorZoneCode',
                // 'floor_and_zones.description',
                // 'property_units.unitNumber',
                // 'property_units.description',
              ])
              .where('announcement_master.id',id)
              .first(),
              // knex
              // .from('')
          ])

          return res.status(200).json({
            announcementDetails: {
              ...announcementDetails,
              
            },
            message: "Announcement Details !",
          });
        

      } catch (err) {
        console.log("controller[announcement][announcementDetails]");

        res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
          
      }
  }
};
module.exports = announcementController;
