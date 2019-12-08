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

const ProjectController = {
  addProject: async (req, res) => {
    try {
      let Project = null;
      let userId = req.me.id;
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          project: Joi.string().required(),
          projectName: Joi.string().required(),
          projectLocationThai: Joi.string().required(),
          projectLocationEng: Joi.string().required(),
          projectStartDate: Joi.string().allow('').optional(),
          projectEndDate: Joi.string().allow('').optional(),
          branchId:Joi.string().allow('').optional(),
          ownerCode: Joi.string().allow('').optional(),
          customerCode: Joi.string().allow('').optional(),
          ventureType: Joi.string().allow('').optional(),
          locationFlag: Joi.string().allow('').optional(),
          projectType: Joi.string().allow('').optional(),
          biddingDate: Joi.string().allow('').optional(),
          projectPeriod: Joi.string().allow('').optional(),
          budgetValue:Joi.string().allow('').optional(),
          currency:Joi.string().allow('').optional(),
          secondCurrency: Joi.string().allow('').optional(),
          addressFlag: Joi.string().allow('').optional()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addProject]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId:req.orgId
        };

        console.log('Project Payload: ',insertData)

        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("projects");
        Project = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          project: Project
        },
        message: "Project added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][addProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateProject: async (req, res) => {
    try {
      let Project = null;
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          project: Joi.string().required(),
          projectName: Joi.string().required(),
          projectLocationThai: Joi.string().required(),
          projectLocationEng: Joi.string().required(),
          projectStartDate: Joi.string().allow('').optional(),
          projectEndDate: Joi.string().allow('').optional(),
          branchId:Joi.string().allow('').optional(),
          ownerCode: Joi.string().allow('').optional(),
          customerCode: Joi.string().allow('').optional(),
          ventureType: Joi.string().allow('').optional(),
          locationFlag: Joi.string().allow('').optional(),
          projectType: Joi.string().allow('').optional(),
          biddingDate: Joi.string().allow('').optional(),
          projectPeriod: Joi.string().allow('').optional(),
          budgetValue:Joi.string().allow('').optional(),
          currency:Joi.string().allow('').optional(),
          secondCurrency: Joi.string().allow('').optional(),
          addressFlag: Joi.string().allow('').optional()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updateProject]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let currentTime = new Date().getTime();
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id,orgId:req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("projects");
        Project = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          Project: Project
        },
        message: "Project details updated successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][updateProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewProject: async (req, res) => {
    try {
      let Project = null;
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
        let ProjectResult = await knex("projects")
          .innerJoin("companies","projects.companyId","companies.id")
          .select("projects.*","companies.companyId as compId","companies.companyName")
          .where({ "projects.id": payload.id,'projects.orgId':req.orgId })
          


        Project = _.omit(ProjectResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
        trx.commit;
      });
      
      
      return res.status(200).json({
        data: {
          Project: Project
        },
        message: "Project details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deleteProject: async (req, res) => {
    try {
      let Project = null;
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
        let ProjectResult = await knex
          .update({ isActive: false })
          .where({ id: payload.id,orgId:req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("projects");
        Project = ProjectResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          Project: Project
        },
        message: "Project deleted!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectList: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")
            .where({ "projects.orgId": req.orgId })
            .first(),
          knex("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")
            .where({ "projects.orgId": req.orgId })
            .select([
              "projects.id as id",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "projects.isActive as Status",
              "users.name as Created By",
              "projects.createdAt as Date Created"
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
      } else {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")
            .where({ "projects.companyId": companyId })
            .offset(offset)
            .limit(per_page)
            .first(),
          knex
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")
            .where({ "projects.companyId": companyId })
            .select([
              "projects.id as id",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "projects.isActive as Status",
              "users.name as Created By",
              "projects.createdAt as Date Created"
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
      }
      return res.status(200).json({
        data: {
          projects: pagination
        },
        message: "projects List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  exportProject: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")            
            .first(),
          knex("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")            
            .select([
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "projects.isActive as Status",
              "users.name as Created By",
              "projects.createdAt as Date Created"
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
      } else {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy")            
            .where({ "projects.companyId": companyId })
            .offset(offset)
            .limit(per_page)
            .first(),
          knex
            .from("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .innerJoin("users", "users.id", "projects.createdBy") 
            .where({ "projects.companyId": companyId })
            .select([
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "projects.isActive as Status",
              "users.name as Created By",
              "projects.createdAt as Date Created"
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
      }
      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(pagination.data);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "uploads/ProjectData-" + Date.now() + ".csv";
      let check = XLSX.writeFile(wb, filename);

      return res.status(200).json({
        data: pagination.data,
        message: "Project Data Export Successfully!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectByCompany: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let pagination = {}
      console.log("companyId",companyId);      
    
      let rows = await knex("projects")
            .innerJoin("companies", "projects.companyId", "companies.id")
            .where({ "projects.companyId": companyId, "projects.isActive": 'true' })
            .select([
              "projects.id as id",
              "projects.projectName",
              "companies.companyName",
              "companies.id as cid",
              "companies.companyId"
            ])

        console.log("rows", rows);

        pagination.data = rows;
      
      return res.status(200).json({
        data: {
          projects: pagination
        },
        message: "projects List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectAllList: async (req, res) => {
    try {
     
       let orgId  =  req.orgId
     
      let rows = await knex("projects")
            .select([
              "projects.id as id",
              "projects.projectName"
            ]).where({orgId:req.orgId})
      
      return res.status(200).json({
        data: {
          projects: rows
        },
        message: "Projects all List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }

};

module.exports = ProjectController;
