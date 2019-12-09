const Joi = require("@hapi/joi");
const _ = require("lodash");
const bcrypt = require("bcrypt");

const moment = require('moment')
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
        .where({ "projects.companyId": Number(companyId), orgId:Number(orgId) })
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
        .where({ "buildings_and_phases.projectId": Number(projectId), orgId:Number(orgId) })
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
        .where({ "floor_and_zones.buildingPhaseId": Number(buildingId), orgId:Number(orgId) })
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
        .where({ floorZoneId: Number(floorZoneId), orgId:Number(orgId) })
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
  addSignUpUrl: async(req,res) => {
    try {
      const payload = _.omit(req.body,['expireAfter','uuid','orgId','signUpUrl']);
      const signUpDetails = {...payload}
      let expiryDate = moment().add(Number(req.body.expireAfter), "days");
      let currentTime = new Date().getTime()
      const result = await knex("sign_up_urls")
        .insert({
          signUpDetails,
          uuid: req.body.uuid,
          expiryDate,
          orgId: req.body.orgId,
          createdAt: currentTime,
          updatedAt: currentTime,
          signUpUrl: req.body.signUpUrl
        })
        .returning(["*"]);
      const finalInsertedUrl = result[0]
      return res.status(200).json({
        data: {
          insertedUrl: finalInsertedUrl
        }
      })
    } catch(err) {
      console.log("[controllers][survey Orders][getSurveyOrders] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }

  },
  getSignUpUrls:async(req,res) => {
    try {
      const signUpUrls = await knex('sign_up_urls').select('*')
      return res.status(200).json({
        data: {
          signUpUrls
        },
        message: 'Sign up urls list'
      })
    } catch(err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getSignUpFormDataByUUID:async(req,res) => {
    try {
      const formResult = await knex("sign_up_urls")
        .select("*")
        .where({ uuid: req.body.uuid });
      let form = formResult[0]
      return res.status(200).json({
        data: {
          formData:form
        },
        message: 'Form data'
      })
    } catch(err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  createUser: async(req,res) => {
    try {
      let payload = _.omit(req.body,['company','project','building','floor','unitNumber','companyId','floorZoneId','buildingId','projectId','unitId']);
      let hash = await bcrypt.hash(payload.password, saltRounds);
      payload.password = hash;
      const insertedUser = await knex('users').insert(payload).returning(['*'])
      console.log(payload);
      return res.status(200).json({insertedUser})
    } catch(err) {
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
