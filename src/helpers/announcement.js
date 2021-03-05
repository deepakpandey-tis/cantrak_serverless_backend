const Joi = require("@hapi/joi");
const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const moment = require("moment-timezone");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1",
});

const announcementHelper = {
  createAnnouncement: async ({ announcementId, orgId }) => {
    try {
      let userId;

      let users = await knex
        .from("announcement_user_master")
        .select(["announcement_user_master.userId"])
        .where({
          "announcement_user_master.announcementId": announcementId,
          "announcement_user_master.orgId": orgId,
        });

      const Parallel = require("async-parallel");
      Parallel.setConcurrency(10);

      userId = await Parallel.map(users, async (pd) => {
        let users = await knex
          .from("users")
          .select(["users.id"])
          .where({"users.id": pd.userId,"users.isActive":true})
          .first();
        return {
          ...users,
        };
      });

      return {userId:userId};


    } catch (err) {
      console.log("[helpers][Announcement][create-announcement]:  Error", err);
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };
    }
  },
};

module.exports = announcementHelper;
