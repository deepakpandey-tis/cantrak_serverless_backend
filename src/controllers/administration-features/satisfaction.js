const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
//const trx = knex.transaction();

const satisfactionController = {
  // Add New Satisfaction //

  addSatisfaction: async (req, res) => {
    try {
      let satisfaction = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let satisfactionPayload = req.body;

        const schema = Joi.object().keys({
          satisfactionCode: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          remark: Joi.string().required(),
          defaultFlag: Joi.string().required()
        });

        const result = Joi.validate(satisfactionPayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATON_ERRORS", message: result.error.message }
            ]
          });
        }

        const existSatisfactionCode = await knex("satisfaction").where({
          satisfactionCode: satisfactionPayload.satisfactionCode
        });

        console.log(
          "[controllers][satisfaction][addsatisfaction]: Satisfaction Code",
          existSatisfactionCode
        );

        // Return error when satisfaction code exist

        if (existSatisfactionCode && existSatisfactionCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "STISFACTION_CODE_EXIST_ERROR",
                message: "Satisfaction Code already exist !"
              }
            ]
          });
        }

        // Insert in satisfaction table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...satisfactionPayload,
          satisfactionCode: satisfactionPayload.satisfactionCode.toUpperCase(),
          createdBy: userId,
          orgId: orgId,
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log(
          "[controllers][satisfaction][addsatisfaction]: Insert Data",
          insertData
        );

        const satisfactionResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("satisfaction");

        satisfactionData = satisfactionResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          satisfaction: satisfactionData
        }
      });
    } catch (err) {
      console.log("[controllers][satisfaction][addsatisfaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Update Satisfaction //

  updateSatisfaction: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;

      let updateSatisfactionPayload = null;

      await knex.transaction(async trx => {
        let satisfactionPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          satisfactionCode: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          remark: Joi.string().required(),
          defaultFlag: Joi.string().required()
        });

        const result = Joi.validate(satisfactionPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existSatisfactionCode = await knex("satisfaction")
          .where({
            satisfactionCode: satisfactionPaylaod.satisfactionCode.toUpperCase()
          })
          .whereNot({ id: satisfactionPaylaod.id });

        console.log(
          "[controllers][satisfaction][updateSatisfaction]: Satisfaction Code",
          existSatisfactionCode
        );

        // Return error when satisfaction exist

        if (existSatisfactionCode && existSatisfactionCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "SATISFACTION_CODE_EXIST_ERROR",
                message: "Satisfaction Code already exist !"
              }
            ]
          });
        }

        // Insert in satisfaction table,
        const currentTime = new Date().getTime();

        const updateSatisfactionResult = await knex
          .update({
            satisfactionCode: satisfactionPaylaod.satisfactionCode.toUpperCase(),
            descriptionEng: satisfactionPaylaod.descriptionEng,
            descriptionThai: satisfactionPaylaod.descriptionThai,
            remark: satisfactionPaylaod.remark,
            defaultFlag: satisfactionPaylaod.defaultFlag,
            updatedAt: currentTime
          })
          .where({
            id: satisfactionPaylaod.id,
            createdBy: userId,
            orgId: orgId
          })
          .returning(["*"])
          .transacting(trx)
          .into("satisfaction");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][satisfaction][updatesatisfaction]: Update Data",
          updateSatisfactionResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        updateStatusPayload = updateSatisfactionResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          satisfaction: updateStatusPayload
        },
        message: "Satisfaction updated successfully !"
      });
    } catch (err) {
      console.log(
        "[controllers][satisfaction][updatesatisfaction] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Get List of Satisfaction

  getSatisfactionList: async (req, res) => {
    try {
      let reqData = req.query;
      let orgId = req.orgId;

      let total = null;
      let rows = null;
      let companyId = reqData.companyId;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("satisfaction")
          .where({ "orgId": orgId })
          .first(),
        knex("satisfaction")
          .select([
            "satisfactionCode as Satisfaction Code",
            "descriptionThai as Description English",
            "descriptionThai as Description Thai",
            "isActive as Status",
            "createdby as Created By",
            "createdAt as Date Created"
          ])
          .where({ "orgId": orgId })
          .offset(offset)
          .limit(per_page)
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

      res.status(200).json({
        data: {
          commonAreaLists: pagination
        },
        message: "Satisfaction list successfully !"
      });
    } catch (err) {
      console.log("[controllers][satisfaction][getsatisfaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // Delete Satisfaction Area //

  deleteSatisfaction: async (req, res) => {
    try {
      let orgId = req.orgId;
      let delSatisfactionPayload = null;

      await knex.transaction(async trx => {
        let satisfactionPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(satisfactionPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const validSatisfactionId = await knex("satisfaction").where({
          id: satisfactionPaylaod.id
        });

        console.log(
          "[controllers][satisfaction][deletesatisfaction]: Satisfaction Code",
          validSatisfactionId
        );

        // Return error when username exist

        if (validSatisfactionId && validSatisfactionId.length) {
          // Insert in users table,
          const currentTime = new Date().getTime();
          //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

          //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
          const updateDataResult = await knex
            .update({
              isActive: "false",
              updatedAt: currentTime
            })
            .where({
              id: satisfactionPaylaod.id,
              orgId: orgId
            })
            .returning(["*"])
            .transacting(trx)
            .into("satisfaction");

          console.log(
            "[controllers][satisfaction][deletesatisfaction]: Delete Data",
            updateDataResult
          );

          //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

          updateStatusPayload = updateDataResult[0];
        } else {
          return res.status(400).json({
            errors: [
              {
                code: "SATISFACTION_DOES_NOT_EXIST_ERROR",
                message: "Id does not exist!!"
              }
            ]
          });
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          satisfaction: updateStatusPayload
        },
        message: "Satisfaction deleted successfully !"
      });
    } catch (err) {
      console.log("[controllers][satisfaction][deletefaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // Export Satisfaction Data
  exportSatisfaction: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.query;
      let total = null;
      let rows = null;
      let companyId = reqData.companyId;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("satisfaction")
          .where({"orgId":orgId})
          .first(),
        knex("satisfaction")
          .select([
            "satisfactionCode as Satisfaction Code",
            "descriptionThai as Description English",
            "descriptionThai as Description Thai",
            "isActive as Status",
            "createdby as Created By",
            "createdAt as Date Created"
          ])
          .where({"orgId":orgId})
          .offset(offset)
          .limit(per_page)
      ]);

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "uploads/SatisfactionData-" + Date.now() + ".csv";
      let check = XLSX.writeFile(wb, filename);

      res.status(200).json({
        data: {
          SatisfactionData: rows
        },
        message: "Satisfaction Data Export successfully !"
      });
    } catch (err) {
      console.log("[controllers][satisfaction][getsatisfaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = satisfactionController;
