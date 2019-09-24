const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();

const ProjectController = {
  addProject: async (req, res) => {
    try {
      let Project = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          project: Joi.string().required(),
          projectName: Joi.string().required(),
          projectLocationThai: Joi.string().required(),
          projectLocationEng: Joi.string().required(),
          projectStartDate: Joi.string().required(),
          projectEndDate: Joi.string().required(),
          branchId: Joi.string().required(),
          ownerCode: Joi.string().required(),
          customerCode: Joi.string().required(),
          ventureType: Joi.string().required(),
          locationFlag: Joi.string().required(),
          projectType: Joi.string().required(),
          biddingDate: Joi.string().required(),
          projectPeriod: Joi.string().required(),
          budgetValue: Joi.string().required(),
          currency: Joi.string().required(),
          secondCurrency: Joi.string().required(),
          addressFlag: Joi.string().required(),
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][addProject]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, createdAt: currentTime, updatedAt: currentTime };
        let insertResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('projects')
        Project = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          project: Project
        },
        message: 'Project added successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][addProject] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updateProject: async (req, res) => {
    try {
      let Project = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          project: Joi.string().required(),
          projectName: Joi.string().required(),
          projectLocationThai: Joi.string().required(),
          projectLocationEng: Joi.string().required(),
          projectStartDate: Joi.string().required(),
          projectEndDate: Joi.string().required(),
          branchId: Joi.string().required(),
          ownerCode: Joi.string().required(),
          customerCode: Joi.string().required(),
          ventureType: Joi.string().required(),
          locationFlag: Joi.string().required(),
          projectType: Joi.string().required(),
          biddingDate: Joi.string().required(),
          projectPeriod: Joi.string().required(),
          budgetValue: Joi.string().required(),
          currency: Joi.string().required(),
          secondCurrency: Joi.string().required(),
          addressFlag: Joi.string().required(),
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][updateProject]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex.update(insertData).where({ id: payload.id }).returning(['*']).transacting(trx).into('projects')
        Project = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          Project: Project
        },
        message: 'Project details updated successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][updateProject] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
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
        })
        const result = Joi.validate(payload, schema)
        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }
        let current = new Date().getTime()
        let ProjectResult = await knex.select().where({ id: payload.id }).returning(['*']).transacting(trx).into('projects')

        Project = _.omit(ProjectResult[0], ['createdAt', 'updatedAt', 'isActive'])
        trx.commit;
      })
      return res.status(200).json({
        data: {
          Project: Project
        },
        message: 'Project details'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewProject] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deleteProject: async (req, res) => {
    try {
      let Project = null
      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        })
        const result = Joi.validate(payload, schema)
        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }
        let ProjectResult = await knex.update({ isActive: false }).where({ id: payload.id }).returning(['*']).transacting(trx).into('projects')
        Project = ProjectResult[0]
        trx.commit;
      })
      return res.status(200).json({
        data: {
          Project: Project
        },
        message: 'Project deleted!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewProject] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
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
          knex.count('* as count').from("projects").first(),
          knex.select("*").from("projects").offset(offset).limit(per_page)
        ])

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
          knex.count('* as count').from("projects").where({ 'projects.companyId': companyId }).offset(offset).limit(per_page).first(),
          knex.from("projects").innerJoin("companies", "projects.companyId", "companies.id").where({ 'projects.companyId': companyId }).offset(offset).limit(per_page)
        ])

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
        message: 'projects List!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewProject] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = ProjectController
