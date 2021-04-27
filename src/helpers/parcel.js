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
    dataNos,
    receiver,
  }) => {
    try {
      console.log(
        "[PARCEL][SNS][NOTIFICATION]",
        orgId,
        module,
        dataNos,
        receiver
      );

      const snsHelper = require("../helpers/sns");

      const message = {
        orgId: orgId,
        module: module,
        data: {
          id: dataNos.payload.parcelId,
          subject: dataNos.payload.title,
          user: {
            userId: receiver.id,
            name: receiver.name,
            mobileNumber: receiver.mobileNo,
            email: receiver.email,
          },
          status: "Approved",
        },
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
