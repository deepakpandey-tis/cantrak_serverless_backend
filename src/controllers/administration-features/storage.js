const Joi = require("@hapi/joi");
const knex = require("../../db/knex");

const storageController = {
  addStorage: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        const storagePayload = req.body;
        console.log("[Controllers][Storage][add]", storagePayload);
        const schema = Joi.object().keys({
          storageCode: Joi.string().required(),
          storageName: Joi.string().required(),
          description: Joi.string().optional(),
        });
        const result = Joi.validate(storagePayload, schema);
        console.log("[Controller][storage][add]:Joi result", result);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existStorageCode = await knex("storage").where({
          storageCode: storagePayload.storageCode.toUpperCase(),
          orgId: orgId,
        });
        console.log(
          "[controllers][storage][add]: storageCode",
          existStorageCode
        );
        if (existStorageCode && existStorageCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Storage Code already exist !",
              },
            ],
          });
        }
        const currentTime = new Date().getTime();
        const insertData = {
          ...storagePayload,
          orgId: orgId,
          createdBy: userId,
          storageCode: storagePayload.storageCode.toUpperCase(),
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        console.log("[controllers][storage][add]: Insert Data", insertData);

        const incidentResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("storage");

        incident = incidentResult[0];
        trx.commit;
      });
      res.status(200).json({
        data: {
          category: incident,
        },
        message: "Storage added successfully !",
      });
    } catch (err) {
      console.log("[controllers][storage][storageAdd] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
};
module.exports = storageController;
