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

const problemTypeController = {
  // Add New Problem Type //

  addProblemType: async (req, res) => {
    try {
      let problemType;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let problemTypePayload = req.body;

        const schema = Joi.object().keys({
          typeCode: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string().required()
        });

        const result = Joi.validate(problemTypePayload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATON_ERRORS", message: result.error.message }
            ]
          });
        }

        const existTypeCode = await knex("incident_type").where({
          typeCode: problemTypePayload.typeCode
        });

        console.log(
          "[controllers][problem][addproblem]: Type Code",
          existTypeCode
        );

        // Return error when username exist

        if (existTypeCode && existTypeCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Type Code already exist !"
              }
            ]
          });
        }

        // Insert in common area table,
        const currentTime = new Date().getTime();

        const insertData = {
          ...problemTypePayload,
          createdBy: userId,
          orgId: orgId,
          typeCode: problemTypePayload.typeCode.toUpperCase(),
          isActive: "true",
          createdAt: currentTime,
          updatedAt: currentTime
        };

        console.log(
          "[controllers][problem][addproblemtyep]: Insert Data",
          insertData
        );

        const problemResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("incident_type");
        problemTypes = problemResult[0];
        trx.commit;
      });

      res.status(200).json({
        data: {
          problemType: problemTypes
        },
        message: "Problem Type Added Successfully!!"
      });
    } catch (err) {
      console.log("[controllers][problem][addproblemtyep] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
   // Update ProblemType //

   updateProblemType: async (req, res) => {
    try {
      let updateStatusPayload = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let statusPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          typeCode: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          descriptionThai: Joi.string().required(),
         });

        const result = Joi.validate(statusPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existStatusCode = await knex("incident_type")
          .where({ typeCode: statusPaylaod.typeCode.toUpperCase() })
          .whereNot({ id: statusPaylaod.id });

        console.log(
          "[controllers][status][updateStatus]: Status Code",
          existStatusCode
        );

        // Return error when username exist

        if (existStatusCode && existStatusCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "COMMON_AREA_CODE_EXIST_ERROR",
                message: "Type Code already exist !"
              }
            ]
          });
        }

        // Insert in users table,
        const currentTime = new Date().getTime();
        //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

        //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
        const updateStatusResult = await knex
          .update({
            typeCode: statusPaylaod.typeCode.toUpperCase(),
            descriptionEng: statusPaylaod.descriptionEng,
            descriptionThai: statusPaylaod.descriptionThai,
            updatedAt: currentTime
          })
          .where({
            id: statusPaylaod.id,
            createdBy: userId,
            orgId: orgId
          })
          .returning(["*"])
          .transacting(trx)
          .into("incident_type");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][status][updateStatus]: Update Data",
          updateStatusResult
        );

        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

        updateStatusPayload = updateStatusResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          problemTypes: updateStatusPayload
        },
        message: "Problem Type updated successfully !"
      });
    } catch (err) {
      console.log("[controllers][status][updateStatus] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProblemTypeList: async (req, res) => {
    try {
      let reqData = req.query;
      console.log("reqQuery", reqData);
      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("incident_type")
          .innerJoin("users", "users.id", "incident_type.createdBy")
          .where({ "incident_type.orgId": req.orgId })
          .offset(offset)
          .limit(per_page)
          .first(),
        knex
          .from("incident_type")
          .innerJoin("users", "users.id", "incident_type.createdBy")
          .where({ "incident_type.orgId": req.orgId })
          .select([
            "incident_type.id as id",
            "incident_type.typeCode as Problem Type Code",
            "incident_type.descriptionEng as Description Eng",
            "incident_type.descriptionThai as Description Thai",
            "incident_type.isActive as Status",
            "users.name as Created By",
            "incident_type.createdAt as Date Created"
          ])
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

      return res.status(200).json({
        data: {
          problemType: pagination
        },
        message: "problem type List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProblemType] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewProblemType: async (req, res) => {
    try {
      let problemTypeDetail = null;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let current = new Date().getTime();
        let problemResult = await knex("incident_type")
          .select("incident_type.*")
          .where({ id: payload.id, orgId: orgId });

        problemTypeDetail = _.omit(problemResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          problemTypeDetails: problemTypeDetail
        },
        message: "Problem Type Details !!"
      });
    } catch (err) {
      console.log(
        "[controllers][problem][viewProblemTypeDetails] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = problemTypeController;
