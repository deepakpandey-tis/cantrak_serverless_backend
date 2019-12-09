const Joi = require("@hapi/joi");
const _ = require("lodash");

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
        .where({ "projects.companyId": companyId, orgId })
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
        .where({ "buildings_and_phases.projectId": projectId, orgId })
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
        .where({ "floor_and_zones.buildingPhaseId": buildingId, orgId })
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
        .where({ floorZoneId: floorZoneId, orgId })
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
  }
};

module.exports = singupController;
