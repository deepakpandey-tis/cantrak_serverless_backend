const _ = require("lodash");
const knex = require("../../db/knex");
const superagent = require("superagent");

async function sendLineMulticast(notification) {
  return superagent
    .post(`https://api.line.me/v2/bot/message/multicast`)
    .set("Content-Type", `application/json`)
    .set(
      "Authorization",
      `Bearer XABQBlz8gAwLhc6lVAOqAxGJRqiA4Hmvp98/jF+Dry7/towFojWx1OKDLak48UuJceyyhvwFO/Cbp2sUr/IscsjZTCtVZSdIxFKksTYhueZ1GQgQw6CDT2By9acXiUJkqT6lTqVKoUbijg9c9s9m5gdB04t89/1O/w1cDnyilFU=`
    )
    .send(notification);
}

const lineNotification = {
  send: async ({ receiverId, message }) => {
    try {
      let lineAccount = await knex
        .from("social_accounts")
        .where({ userId: receiverId, accountName: "LINE" })
        .first();
      console.log(
        "[notifications][core][line-notification] Line Accounts",
        lineAccount
      );

      if (lineAccount) {
        let notification = {
          to: [lineAccount.details.userId],
          messages: [
            {
              type: "text",
              text: message,
            },
          ],
        };

        try {
          const res = await sendLineMulticast(notification);
          console.log(
            `[notifications][core][line-notification] :Sending Notification For User: ${receiverId} on LineUserId: `,
            lineAccount.details.userId
          );
        } catch (err) {
          console.error(
            `[notifications][core][line-notification] :Sending Notification For User: ${receiverId} on LineUserId: `,
            lineAccount.details.userId,
            ", Failed:",
            err
          );
        }
      } else {
        console.log(
          `[notifications][core][line-notification] :Sending Notification For User: ${receiverId} on LineUserId: No Line Account found `
        );
      }
    } catch (err) {
      console.log(
        "[notifications][core][line-notification][send]:  Error",
        err
      );
      return { code: "UNKNOWN_ERROR", error: err };
    }
  },
};

module.exports = lineNotification;
