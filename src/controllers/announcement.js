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
          savedStatus:2,
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
  saveAnnouncementAsDraft:async(req,res) =>{
      try {
        let announcementPayload = req.body;

        let announcementResult = null;
        let id = req.body.userId;
        userIds = [];
        let newAnnouncementId = req.body.newAnnouncementId;

        await knex.transaction(async (trx)=>{
            
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
                savedStatus:1,
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
        })
        res.status(200).json({
            data: {
              announcementResult,
            },
            message: "Announcement Saved as draft !",
          });
          
      } catch (err) {
        console.log("[controllers][announcement][addAnnouncement] : Error", err);
      }
  }
};
module.exports = announcementController;
