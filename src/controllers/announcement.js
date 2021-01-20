const Joi = require("@hapi/joi");
const moment = require("moment");
// const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const uuid = require("uuid/v4");

const knex = require("../db/knex");



const announcementNotification = require("../notifications/announcement-notification/announcement-notification");

const announcementController = {
  saveAnnouncementNotifications: async (req, res) => {
    try {
      let announcementPayload = req.body;

      let announcementResult = null;
      let id = req.body.userId;
      // console.log("req user id for teamuser", req.body)
      userIds = [];
      let images = [];
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
          ALLOWED_CHANNELS.push("SOCKET_NOTIFY")
        }
        if (req.body.line == true) {
          ALLOWED_CHANNELS.push("LINE_NOTIFY");
        }
        if (req.body.sms == true) {
          ALLOWED_CHANNELS.push("SMS");
        }
        // if(req.body.email == true || req.body.webPush == true || req.body.inApp == true || req.body.line == true )
        const payload = _.omit(announcementPayload, [
          "userId",
          "newAnnouncementId",
          "logoFile"
        ]);

        const schema = Joi.object().keys({
          title: Joi.string().required(),
          description: Joi.string().allow("").optional(),
          url: Joi.string().allow("").optional(),
          email: Joi.boolean().required(),
          webPush: Joi.boolean().required(),
          inApp: Joi.boolean().required(),
          line: Joi.boolean().required(),
          sms: Joi.boolean().required(),
          userType: Joi.number().required(),
          companyId: Joi.array().items(Joi.number().required()),
          projectId: Joi.array().items(Joi.number().required()),
          buildingPhaseId: Joi.array().items(Joi.number().allow(null).optional()),
          floorZoneId: Joi.array().items(Joi.number().allow(null).optional()),
          propertyUnitId: Joi.array().items(Joi.number().allow(null).optional()),
          teamId: Joi.array().items(Joi.number().allow(null).optional())

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
          createdBy: req.me.id,
          orgId: req.orgId,
        };

        let announcementNotificationResult = await knex
          .update(insertAnnouncementPayload)
          .where({ id: newAnnouncementId })
          .returning(["*"])
          .transacting(trx)
          .into("announcement_master");
        announcementResult = announcementNotificationResult[0];

        let orgMaster = await knex.from("organisations").where({ id: req.orgId, organisationAdminId: 994 }).orWhere({ id: req.orgId, organisationAdminId: 1188 }).first();

        let userId = req.body.userId;
        let dataNos = {
          payload: {
            title: req.body.title,
            url: req.body.url,
            description: req.body.description,
            orgData: orgMaster,
            redirectUrl: "/user/announcement/announcement/" + newAnnouncementId

          },
        };

        let sender = await knex.from("users").where({ id: req.me.id }).first();



        delUsers = await knex('announcement_user_master')
          .where({
            announcementId: newAnnouncementId
          })
          .del()
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

        let imagesData = req.body.logoFile;
        console.log("imagesData", imagesData);
        if (imagesData && imagesData.length > 0) {
          for (let image of imagesData) {
            let d = await knex("images")
              .insert({
                entityType: "announcement_image",
                entityId: newAnnouncementId,
                s3Url: image.s3Url,
                name: image.filename,
                title: image.title,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"]);
            images.push(d[0]);
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

  resendAnnouncementNotification: async (req, res) => {
    try {
      let userId = req.body.userId
      let id = req.body.id

      // console.log('req data for resend notification',req.body)

      let ALLOWED_CHANNELS = [];
      if (req.body.email == true) {
        ALLOWED_CHANNELS.push("EMAIL");
      }
      if (req.body.webPush == true) {
        ALLOWED_CHANNELS.push("WEB_PUSH");
      }
      if (req.body.inApp == true) {
        ALLOWED_CHANNELS.push("IN_APP");
        ALLOWED_CHANNELS.push("SOCKET_NOTIFY")
      }
      if (req.body.line == true) {
        ALLOWED_CHANNELS.push("LINE_NOTIFY");
      }
      if (req.body.sms == true) {
        ALLOWED_CHANNELS.push("SMS");
      }

      let orgMaster = await knex.from("organisations").where({ id: req.orgId, organisationAdminId: 994 }).orWhere({ id: req.orgId, organisationAdminId: 1188 }).first();

      let dataNos = {
        payload: {
          title: req.body.title,
          url: req.body.url,
          description: req.body.description,
          orgData: orgMaster
        },
      };

      let sender = await knex.from("users").where({ id: req.me.id }).first();

      if (userId && userId.length > 0) {
        for (let id of userId) {

          let receiver = await knex.from("users").where({ id: id }).first();

          await announcementNotification.send(
            sender,
            receiver,
            dataNos,
            ALLOWED_CHANNELS
          );
        }
      }

      return res.status(200).json({
        message: "Notification sent successfully !",
      })

    } catch (err) {
      console.log("controller[announcement][announcementDetails]");

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
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
      // let id = req.body.userId;
      userIds = [];
      let images = [];
      let newAnnouncementId = req.body.newAnnouncementId;

      await knex.transaction(async (trx) => {
        const payload = _.omit(announcementPayload, [
          "userId",
          "newAnnouncementId",
          "logoFile"
        ]);

        const schema = Joi.object().keys({
          title: Joi.string().required(),
          description: Joi.string().allow("").optional(),
          url: Joi.string().allow("").optional(),
          email: Joi.boolean().required(),
          webPush: Joi.boolean().required(),
          inApp: Joi.boolean().required(),
          line: Joi.boolean().required(),
          sms: Joi.boolean().required(),
          userType: Joi.number().required(),
          companyId: Joi.array().items(Joi.number().required()),
          projectId: Joi.array().items(Joi.number().required()),
          buildingPhaseId: Joi.array().items(Joi.number().allow(null).optional()),
          floorZoneId: Joi.array().items(Joi.number().allow(null).optional()),
          propertyUnitId: Joi.array().items(Joi.number().allow(null).optional()),
          teamId: Joi.array().items(Joi.number().allow(null).optional())

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
          createdBy: req.me.id,
          orgId: req.orgId,
        };


        let announcementNotificationResult = await knex('announcement_master')
          .update(insertAnnouncementPayload)
          .where({ id: newAnnouncementId })
          .returning(["*"])
        // .transacting(trx)
        // .into("announcement_master");
        announcementResult = announcementNotificationResult[0];

        let userId = req.body.userId;

        delUsers = await knex('announcement_user_master')
          .where({
            announcementId: newAnnouncementId
          })
          .del()


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

        let imagesData = req.body.logoFile;
        // console.log("imagesData", imagesData);

        // delImage = await knex("images")
        // .where({
        //   entityType: "announcement_image",
        //   entityId: newAnnouncementId
        // })
        // .del()

        if (imagesData && imagesData.length > 0) {
          for (let image of imagesData) {
            let d = await knex("images")
              .insert({
                entityType: "announcement_image",
                entityId: newAnnouncementId,
                s3Url: image.s3Url,
                name: image.filename,
                title: image.title,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"]);
            images.push(d[0]);
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
              .where("announcement_master.status", true)
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
              .where("announcement_master.status", true)
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
        } catch (err) { }
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
            .where("announcement_master.status", true)
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
            .where("announcement_master.status", true)
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

  getAnnouncementDeatails: async (req, res) => {
    try {
      let id = req.body.id
      let payload = req.body
      let companies;
      let projects;
      let buildings;
      let floors;
      let propertyUnit;
      let users;
      let teams;
      console.log("id of announcement", id)
      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let [announcementDetails, images] = await Promise.all([
        knex
          .from('announcement_master')
          // .leftJoin('announcement_user_master','announcement_master.id','announcement_user_master.announcementId')
          // .leftJoin('users','announcement_user_master.userId','users.id')
          .select([
            'announcement_master.id',
            'announcement_master.inApp',
            'announcement_master.line',
            'announcement_master.sms',
            'announcement_master.email',
            'announcement_master.webPush',
            'announcement_master.title',
            'announcement_master.url',
            'announcement_master.userType',
            'announcement_master.description',
            'announcement_master.savedStatus',
            'announcement_master.createdAt',
            'announcement_master.updatedAt',
            'announcement_master.companyId',
            'announcement_master.projectId',
            'announcement_master.buildingPhaseId',
            'announcement_master.floorZoneId',
            'announcement_master.propertyUnitId',
            'announcement_master.teamId',
          ])
          .where('announcement_master.id', id)
          .first(),
        knex
          .from('images')
          .where({ entityId: id, entityType: "announcement_image" }),

      ])
      if (announcementDetails.companyId) {
        companies = await knex
          .from('companies')
          .select([
            'companies.companyName',
            'companies.companyId'
          ])
          .whereIn('companies.id', announcementDetails.companyId)
      }

      if (announcementDetails.projectId) {
        projects = await knex
          .from('projects')
          .select([
            'projects.id',
            'projects.projectName',
            'projects.project'
          ])
          .whereIn('projects.id', announcementDetails.projectId)
      }
      if (announcementDetails.buildingPhaseId) {
        buildings = await knex
          .from('buildings_and_phases')
          .select([
            'buildings_and_phases.buildingPhaseCode',
            'buildings_and_phases.description'
          ])
          .whereIn('buildings_and_phases.id', announcementDetails.buildingPhaseId)
      }
      if (announcementDetails.floorZoneId) {
        floors = await knex
          .from('floor_and_zones')
          .select([
            'floor_and_zones.floorZoneCode',
            'floor_and_zones.description'
          ])
          .whereIn('floor_and_zones.id', announcementDetails.floorZoneId)
      }
      if (announcementDetails.propertyUnitId) {
        propertyUnit = await knex
          .from('property_units')
          .select([
            'property_units.unitNumber',
            'property_units.description'
          ])
          .whereIn('property_units.id', announcementDetails.propertyUnitId)
      }
      users = await knex
        .from('announcement_user_master')
        .select([
          'announcement_user_master.userId'
        ])
        .where('announcement_user_master.announcementId', announcementDetails.id)

      const Parallel = require("async-parallel");
      users = await Parallel.map(users, async (pd) => {
        let users = await knex
          .from('users')
          .select([
            'users.id',
            'users.userName',
            'users.name as uName'
          ])
          .where('users.id', pd.userId)
          .first()
        return {
          ...users
        }
      })

      if (announcementDetails.userType == 1 && announcementDetails.teamId) {
        teams = await knex
          .from('teams')
          .select(['teams.teamId', 'teams.teamName'])
          .whereIn('teams.teamId', announcementDetails.teamId)
      }




      return res.status(200).json({
        announcementDetails: {
          ...announcementDetails,
          companies, projects, buildings, floors, propertyUnit, users, teams, images

        },
        message: "Announcement Details !",
      });


    } catch (err) {
      console.log("controller[announcement][announcementDetails]");

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });

    }
  },
  deleteAnnouncementById: async (req, res) => {
    try {
      let id = req.body.id
      let payload = req.body

      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let announcementResult = await knex('announcement_master')
        .update({ 'status': false })
        .where({ 'id': id, 'orgId': req.orgId })

      return res.status(200).json({
        data: {
          announcementResult,
          message: 'Announcement deleted successfully'
        }
      })
    } catch (err) {
      console.log("controller[announcement][announcementDetails]");

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });

    }
  },


  // publishDraftAnnouncement:async(req,res)=>{
  //   try {
  //     let userId =req.body.userId
  //     let id = req.body.id

  //     await knex.transaction(async (trx) => {


  //     let ALLOWED_CHANNELS = [];
  //     if (req.body.email == true) {
  //       ALLOWED_CHANNELS.push("EMAIL");
  //     }
  //     if (req.body.webPush == true) {
  //       ALLOWED_CHANNELS.push("WEB_PUSH");
  //     }
  //     if (req.body.inApp == true) {
  //       ALLOWED_CHANNELS.push("IN_APP");
  //     }
  //     if (req.body.line == true) {
  //       ALLOWED_CHANNELS.push("LINE_NOTIFY");
  //     }
  //     if (req.body.sms == true) {
  //       ALLOWED_CHANNELS.push("SMS");
  //     }


  //     let currentTime = new Date().getTime();

  //     let updatePayload = {
  //       savedStatus: 2,
  //       updatedAt: currentTime,
  //     };

  //     let announcementNotificationResult = await knex
  //       .update(updatePayload)
  //       .where({ id: id })
  //       .returning(["*"])
  //       .transacting(trx)
  //       .into("announcement_master");
  //     announcementResult = announcementNotificationResult[0];

  //     let sender = await knex.from("users").where({ id: req.me.id }).first();

  //     if (userId && userId.length > 0) {
  //       for (let id of userId) {
  //         let receiver = await knex.from("users").where({ id: id }).first();

  //         await announcementNotification.send(
  //           sender,
  //           receiver,
  //           dataNos,
  //           ALLOWED_CHANNELS
  //         );
  //       }
  //     }
  //    });
  //    res.status(200).json({
  //     data: {
  //       announcementResult,
  //     },
  //     message: "Announcement Published successfully !",
  //   });

  //   } catch (err) {
  //     console.log("[controllers][announcement][publishAnnouncement] : Error", err);


  //   }
  // }
};
module.exports = announcementController;
