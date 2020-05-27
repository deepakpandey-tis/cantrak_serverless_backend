const Joi = require("@hapi/joi");
const knex = require("../../db/knex");
const _ = require("lodash");

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
  updateStorage: async (req, res) => {
    try {
      let updateStatusPayload = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        let statusPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          storageCode: Joi.string().required(),
          storageName: Joi.string().required(),
          description: Joi.string().optional(),
        });

        const result = Joi.validate(statusPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existStatusCode = await knex("storage")
          .where({
            storageCode: statusPaylaod.storageCode.toUpperCase(),
            orgId: orgId,
          })
          .whereNot({ id: statusPaylaod.id });

        console.log(
          "[controllers][status][updateStatus]: Status Code",
          existStatusCode
        );

        if (existStatusCode && existStatusCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "STORAGE_EXIST_ERROR",
                message: "Storage Code already exist !",
              },
            ],
          });
        }
        const currentTime = new Date().getTime();

        const updateStatusResult = await knex
          .update({
            storageCode: statusPaylaod.storageCode.toUpperCase(),
            storageName: statusPaylaod.storageName,
            description: statusPaylaod.description,
            updatedAt: currentTime,
          })
          .where({
            id: statusPaylaod.id,
            createdBy: userId,
            orgId: orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("storage");

        console.log(
          "[controllers][status][updateStatus]: Update Data",
          updateStatusResult
        );
        updateStatusPayload = updateStatusResult[0];
        trx.commit;
      });
      res.status(200).json({
        data: {
          storage: updateStatusPayload,
        },
        message: "Storage updated successfully !",
      });
    } catch (err) {
      console.log("[controllers][status][updateStatus] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getStorageList: async (req, res) => {
    try {
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "storageName";
        sortPayload.orderBy = "asc";
      }
      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let { searchValue } = req.body;
      let orgId = req.query.orgId;
      let total, rows;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("storage")
          .leftJoin("users", "users.id", "storage.createdBy")
          .where({ "storage.orgId": req.orgId })
          .where((qb) => {
            if (searchValue) {
              qb.where("storage.storageCode", "iLIKE", `%${searchValue}%`);
              qb.orWhere("storage.storageName", "iLIKE", `%${searchValue}%`);
              qb.orWhere("storage.description", "iLIKE", `%${searchValue}%`);
            }
          })
          .first(),
        knex
          .from("storage")
          .leftJoin("users", "users.id", "storage.createdBy")
          .where({ "storage.orgId": req.orgId })
          .select([
            "storage.id as id",
            "storage.storageCode as Storage Code",
            "storage.storageName as Storage Name",
            "storage.description as Description",
            "users.name as Created By",
            "storage.createdAt as Date Created",
          ])
          .where((qb) => {
            if (searchValue) {
              qb.where("storage.storageCode", "iLIKE", `%${searchValue}%`);
              qb.orWhere("storage.storageName", "iLIKE", `%${searchValue}%`);
              qb.orWhere("storage.description", "iLIKE", `%${searchValue}%`);
            }
          })
          .orderBy(sortPayload.sortBy, sortPayload.orderBy)
          .offset(offset)
          .limit(per_page),
      ]);
      let count = total.count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows;
      return res.status(200).json({
        data: {
          storage: pagination,
        },
        message: "storage List!",
      });
    } catch (err) {
      console.log("[controllers][storage][getStorage],Error", err);
    }
  },
  getStorageDetailsById: async (req, res) => {
    try {
      let storageDetail = null;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        let storageResult = await knex("storage")
          .select("storage.*")
          .where({ id: payload.id, orgId: orgId });

        storageDetail = _.omit(storageResult[0], ["createdAt", "updatedAt"]);
        trx.commit;
      });
      return res.status(200).json({
        data: {
          storageDetails: storageDetail,
        },
        message: "Storage Details !!",
      });
    } catch (err) {
      console.log("[controllers][storage][storageDetails] :  Error", err);
    }
  },
};
module.exports = storageController;
