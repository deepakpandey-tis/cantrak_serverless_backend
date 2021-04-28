const AWS = require("aws-sdk");
const knex = require("../db/knex");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1",
});

const parcelHelper = {
  parcelSNSNotification: async ({
    orgId,
    module,
    data,
    receiver,
  }) => {
    try {
      console.log(
        "[PARCEL][SNS][NOTIFICATION]",
        orgId,
        module,
        data,
        receiver
      );

      const snsHelper = require("../helpers/sns");

      const message = {
        orgId: orgId,
        module: module,
        data: {
          // subject: dataNos.payload.title,
          parcelDetail : data.parcelDetail,
          receiverData : data. receiverData,
          senderData : data.senderData
        }
      };

      await snsHelper.sendSNSMessage(
        message,
        "THIRDPARTY_NOTIFICATIONS"
      );
    } catch (err) {
      return { failed: true, error: err };
    }
  },
};

module.exports = parcelHelper;
