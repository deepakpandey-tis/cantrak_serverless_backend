const Joi = require("@hapi/joi");
const _ = require("lodash");
const bcrypt = require("bcrypt");

const moment = require("moment");
const saltRounds = 10;

const knex = require("../db/knex");
const XLSX = require("xlsx");

const singupController = {
  getCompaniesList: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      const companies = await knex("companies")
        .where({ orgId })
        .returning(["*"]);
      return res.status(200).json({
        data: {
          companies
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectsByCompany: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let companyId = req.query.companyId;
      const projects = await knex("projects")
        .where({
          "projects.companyId": Number(companyId),
          orgId: Number(orgId)
        })
        .returning(["*"]);
      return res.status(200).json({
        data: {
          projects
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getBuildingsByProject: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let projectId = req.query.projectId;
      const buildings = await knex("buildings_and_phases")
        .where({
          "buildings_and_phases.projectId": Number(projectId),
          orgId: Number(orgId)
        })
        .returning(["*"]);
      return res.status(200).json({
        data: {
          buildings
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getFloorByBuilding: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let buildingId = req.query.buildingPhaseId;
      const floors = await knex("floor_and_zones")
        .where({
          "floor_and_zones.buildingPhaseId": Number(buildingId),
          orgId: Number(orgId)
        })
        .returning(["*"]);
      return res.status(200).json({
        data: {
          floors
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getUnitByFloor: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let floorZoneId = req.query.floorZoneId;
      const units = await knex("property_units")
        .where({ floorZoneId: Number(floorZoneId), orgId: Number(orgId) })
        .returning(["*"]);
      return res.status(200).json({
        data: {
          units
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  addSignUpUrl: async (req, res) => {
    try {
      const payload = _.omit(req.body, [
        "expireAfter",
        "uuid",
        "orgId",
        "signUpUrl"
      ]);
      const signUpDetails = { ...payload };
      let expiryDate = moment().add(Number(req.body.expireAfter), "days");
      let currentTime = new Date().getTime();

      // Check for already existance
      let data = await knex("sign_up_urls")
        .select("id")
        .where({ uuid: req.body.uuid });
      if (data && data.length) {
        console.log("Already exists");
        return res.status(500).json({
          errors: [
            { code: "ALREADY_EXISTS_ERROR", message: "UUID already exists" }
          ]
        });
      }

      const result = await knex("sign_up_urls")
        .insert({
          signUpDetails: {
            ...signUpDetails,
            orgId: req.body.orgId,
            expireAfter: req.body.expireAfter
          },
          uuid: req.body.uuid,
          expiryDate,
          orgId: req.body.orgId,
          createdAt: currentTime,
          updatedAt: currentTime,
          signUpUrl: req.body.signUpUrl
        })
        .returning(["*"]);
      const finalInsertedUrl = result[0];
      return res.status(200).json({
        data: {
          insertedUrl: finalInsertedUrl
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateSignUpUrl: async (req, res) => {
    try {
      const payload = _.omit(req.body, [
        "expireAfter",
        "uuid",
        "orgId",
        "signUpUrl",
        "id"
      ]);
      const signUpDetails = { ...payload };
      let expiryDate = moment().add(Number(req.body.expireAfter), "days");
      let currentTime = new Date().getTime();

      const result = await knex("sign_up_urls")
        .update({
          signUpDetails: {
            ...signUpDetails,
            orgId: req.body.orgId,
            expireAfter: req.body.expireAfter
          },
          uuid: req.body.uuid,
          expiryDate,
          orgId: req.body.orgId,
          //createdAt: currentTime,
          updatedAt: currentTime,
          signUpUrl: req.body.signUpUrl
        })
        .where({ id: req.body.id })
        .returning(["*"]);
      const finalInsertedUrl = result[0];
      return res.status(200).json({
        data: {
          updatedUrl: finalInsertedUrl
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getSignUpUrls: async (req, res) => {
    try {
      let reqData = req.query;
      let total, rows;
      let filters = req.body;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      // console.log('Offset: ',offset)
      // console.log('Page: ',page)
      [total, rows] = await Promise.all([
        knex("sign_up_urls")
          .select("*")
          .where(qb => {
            qb.where({orgId:req.orgId})
            if (filters && filters.uuid) {
              qb.where("uuid", "like", `%${filters.uuid.trim()}%`);
            }
            if (filters && filters.companyName) {
              qb.whereRaw(
                `"sign_up_urls"."signUpDetails"->>'companyName' like ? `,
                [`%${filters.companyName.trim()}%`]
              );
            }
            if (filters && filters.projectName) {
              qb.whereRaw(
                `"sign_up_urls"."signUpDetails"->>'projectName' like ? `,
                [`%${filters.projectName.trim()}%`]
              );
            }
          }),
        knex("sign_up_urls")
          //.innerJoin('companies', '')
          .select("*")
          .where(qb => {
            qb.where({ orgId: req.orgId });
            if (filters && filters.uuid) {
              qb.where("uuid", "like", `%${filters.uuid.trim()}%`);
            }

            if (filters && filters.companyName) {
              qb.whereRaw(
                `"sign_up_urls"."signUpDetails"->>'companyName' like ? `,
                [`%${filters.companyName.trim()}%`]
              );
            }
            if (filters && filters.projectName) {
              qb.whereRaw(
                `"sign_up_urls"."signUpDetails"->>'projectName' like ? `,
                [`%${filters.projectName.trim()}%`]
              );
            }
          })
          .orderBy("createdAt", "desc")
          .limit(per_page)
          .offset(offset)
      ]);

      //console.log('Page: ',page)
      //console.log('Per Page: ',per_page)

      //console.log('TOTAL ______________________________',total)

      let count = total.length;
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
          pagination
        },
        message: "Sign up urls list"
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getSignUpFormDataByUUID: async (req, res) => {
    try {
      const formResult = await knex("sign_up_urls")
        .select("*")
        .where({ uuid: req.body.uuid });
      let form = formResult[0];
      return res.status(200).json({
        data: {
          formData: form
        },
        message: "Form data"
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  createUser: async (req, res) => {
    try {
      let payload = _.omit(req.body, [
        "company",
        "project",
        "building",
        "floor",
        "unitNumber",
        "companyId",
        "floorZoneId",
        "buildingId",
        "projectId",
        "unitId"
      ]);
      let hash = await bcrypt.hash(payload.password, saltRounds);
      payload.password = hash;
      const insertedUser = await knex("users")
        .insert(payload)
        .returning(["*"]);
      console.log(payload);
      return res.status(200).json({ insertedUser });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = singupController;
