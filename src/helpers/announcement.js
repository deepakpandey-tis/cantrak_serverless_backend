const Joi = require("@hapi/joi");
const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const moment = require("moment-timezone");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "ap-southeast-1",
});

const announcementHelper = {
  sendAnnouncement: async ({ announcementId, dataNos, ALLOWED_CHANNELS, orgId, requestedBy }) => {
    try {
    
      let users = await knex
        .from("announcement_user_master")
        .select(["announcement_user_master.userId"])
        .where({
          "announcement_user_master.announcementId": announcementId,
          "announcement_user_master.orgId": orgId,
        });


      const announcementNotification = require('../notifications/announcement-notification/announcement-notification');

      const Parallel = require("async-parallel");
      Parallel.setConcurrency(10);

      await Parallel.each(users, async (pd) => {
        let user = await knex
          .from("users").where({"users.id": pd.userId,"users.isActive":true})
          .first();

          console.log("[helpers][announcement][sendAnnouncement]: Selected User for Annoncement Broadcast:", user);

          let sender = requestedBy;
          let receiver = user;

          await announcementNotification.send(
            sender,
            receiver,
            dataNos,
            ALLOWED_CHANNELS
          );
          console.log("[helpers][announcement][sendAnnouncement]: Annoncement Broadcasted to:", receiver.email);

      });

    } catch (err) {
      console.log("[helpers][announcement][sendAnnouncement]:  Error", err);
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };
    }
  },

  
  announcementSNSNotification: async ({orgId,module,announcementId,imagesData,dataNos,targetAudience}) => {
    try {
     
      console.log("[ANNOUNCEMENT][SNS][NOTIFICATION]",orgId,module,announcementId,imagesData,dataNos,targetAudience)

      const snsHelper = require('../helpers/sns');

      const message = {
        orgId: orgId,
        module: module,
        data: {
          AnnouncementId : announcementId,
          subject: dataNos.payload.title,
          url : dataNos.payload.url,
          description : dataNos.payload.description,
          image : imagesData,
          targetAudience
        }
      };

      await snsHelper.sendSNSMessage(message, 'THIRDPARTY_NOTIFICATIONS');
    
    } catch (err) {
      return { failed: true, error: err };
    }
  },
};

module.exports = announcementHelper;
