const Joi = require("@hapi/joi");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../../db/knex");
const fs = require("fs");

const parcelTypeController = {
  addParcelType: async (req, res) => {
    try {
      let payload = req.body;

      await knex.transaction(async (trx) => {
        const schema = Joi.object().keys({
          parcelType: Joi.string().required(),
          description: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[Controller][Courier][add]:Joi result",
          result
        );
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        const currentTime = new Date().getTime();

        const insertData = {
          ...payload,
          orgId: req.orgId,
          createdBy: req.me.id,
          createdAt: currentTime,
          updatedAt: currentTime,
        };

        console.log(
          "[controllers][Parcel-type][add]: Insert Data",
          insertData
        );

        const incidentResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("parcel_type");

        incident = incidentResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          category: incident,
        },
        message: "Parcel Type added successfully !",
      });
    } catch (err) {
      console.log(
        "[controllers][courier][courierAdd] :  Error",
        err
      );

      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getParcelTypeList: async (req, res) => {
    try {
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "parcelType";
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
          .from("parcel_type")
          .leftJoin(
            "users",
            "users.id",
            "parcel_type.createdBy"
          )
          .where({ "parcel_type.orgId": req.orgId })
          .where((qb) => {
            if (searchValue) {
              qb.where("parcel_type.parcelType", "iLIKE", `%${searchValue}%`);
              qb.orWhere("parcel_type.description", "iLIKE", `%${searchValue}%`);
            }
          })
          .first(),
        knex
          .from("parcel_type")
          .leftJoin(
            "users",
            "users.id",
            "parcel_type.createdBy"
          )
          .where({ "parcel_type.orgId": req.orgId })
          .select([
            "parcel_type.id",
            "parcel_type.parcelType",
            "parcel_type.description",
            "users.name as createdBy",
            "parcel_type.createdAt",
            "parcel_type.isActive as status",
          ])
          .where((qb) => {
            if (searchValue) {
              qb.where("parcel_type.parcelType", "iLIKE", `%${searchValue}%`);
              qb.orWhere("parcel_type.description", "iLIKE", `%${searchValue}%`);
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
          parcelType: pagination,
        },
        message: "Paarcel Type List!",
      });
    } catch (err) {
      console.log(
        "[controllers][couriers][getCouriers],Error",
        err
      );

      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getParcelTypeDetail: async (req, res) => {
    try {
      let payload = req.body;
      let parcelTypeDetail;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        const schema = Joi.object().keys({
          id: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        let parcelTypeResult = await knex("parcel_type")
          .select("parcel_type.*")
          .where({ id: payload.id, orgId: orgId });

        parcelTypeDetail = _.omit(parcelTypeResult[0], [
          "createdAt",
          "updatedAt",
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          parcelTypeDetails: parcelTypeDetail,
        },
        message: "Parcel Type Details !!",
      });
    } catch (err) {
      console.log(
        "[controllers][Parcel Type][parcelTypeDetails] :  Error",
        err
      );

      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  updateParcelType: async (req, res) => {
    try {
      let parcelTypeResult = null;
      let payload = req.body;
      let orgId = req.orgId;
      let updateParceltypeStatus;

      await knex.transaction(async (trx) => {
        const schema = Joi.object().keys({
          id: Joi.number().required(),
          parcelType: Joi.string().required(),
          description: Joi.string().allow("").optional(),
        });
        const result = Joi.validate(payload, schema);
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        const currentTime = new Date().getTime();

        updateParceltypeStatus = await knex
          .update({
            parcelType: payload.parcelType,
            description: payload.description,
            updatedAt: currentTime,
            updatedBy: req.me.id,
          })
          .where({
            id: payload.id,
            orgId: orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("parcel_type");

        console.log(
          "[controllers][Parcel-type][updateParcelType]: Update Data",
          updateParceltypeStatus
        );

        parcelTypeResult = updateParceltypeStatus[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          parcelType: parcelTypeResult,
        },
        message: "Parcel Type updated successfully !",
      });
    } catch (err) {
      console.log(
        "[controllers][parcel-type][update-parcel-type] :  Error",
        err
      );
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  toggleParcelType: async (req, res) => {
    try {
      let parcelType = null;
      let message;

      await knex.transaction(async (trx) => {
        let payload = req.body;
        let orgId = req.orgId;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
        });
        const result = Joi.validate(payload, schema);
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        let parceltypeResult;
        let checkStatus = await knex
          .from("parcel_type")
          .where({ id: payload.id })
          .returning(["*"]);

        if (checkStatus && checkStatus.length) {
          if (checkStatus[0].isActive == true) {
            parcelTypeResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("parcel_type");

            parcelType = parcelTypeResult[0];
            message =
              "Parcel Type Deactivated Successfully";
          } else {
            parcelTypeResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("parcel_type");

            parcelType = parcelTypeResult[0];
            message = "Parcel Type Activated Successfully";
          }
        }

        trx.commit;
      });

      return res.status(200).json({
        data: {
          parcelType: parcelType,
        },
        message: message,
      });
    } catch (err) {
      console.log(
        "[controllers][parcel-type][toggleParcelType] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
};

module.exports = parcelTypeController;
