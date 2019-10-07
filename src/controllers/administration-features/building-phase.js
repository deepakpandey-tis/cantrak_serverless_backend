const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
//const trx = knex.transaction();

const buildingPhaseController = {
  addBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseCode: Joi.string().required(),
          description: Joi.string().required(),
          buildingAddressEng: Joi.string().required(),
          buildingAddressThai: Joi.string().required(),
          createdBy: Joi.string().required()
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][addbuildingPhase]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, createdAt: currentTime, updatedAt: currentTime };
        let insertResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('buildings_and_phases')
        buildingPhase = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: 'Building Phase added successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][addbuildingPhase] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updateBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseCode: Joi.string().required(),
          description: Joi.string().required(),
          buildingAddressEng: Joi.string().required(),
          buildingAddressThai: Joi.string().required(),
          createdBy: Joi.string().required()
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][updatebuildingPhase]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex.update(insertData).where({ id: payload.id }).returning(['*']).transacting(trx).into('buildings_and_phases')
        buildingPhase = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: 'Building Phase details updated successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][updatebuildingPhase] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  viewBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null;
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
        let buildingPhaseResult = await knex.select().where({ id: payload.id }).returning(['*']).transacting(trx).into('buildings_and_phases')

        buildingPhase = _.omit(buildingPhaseResult[0], ['createdAt', 'updatedAt', 'isActive'])
        trx.commit;
      })
      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: 'Building Phase details'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewbuildingPhase] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deleteBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null
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
        let buildingPhaseResult = await knex.update({ isActive: false }).where({ id: payload.id }).returning(['*']).transacting(trx).into('buildings_and_phases')
        buildingPhase = buildingPhaseResult[0]
        trx.commit;
      })
      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: 'Building Phase deleted!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewbuildingPhase] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getBuildingPhaseList: async (req, res) => {
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
          knex.count('* as count').from("buildings_and_phases").first(),
          knex.select("*").from("buildings_and_phases").offset(offset).limit(per_page)
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
          knex.count('* as count').from("buildings_and_phases").where({ 'buildings_and_phases.companyId': companyId }).offset(offset).limit(per_page).first(),
          knex.from("buildings_and_phases").innerJoin("companies", "buildings_and_phases.companyId", "companies.id").where({ 'buildings_and_phases.companyId': companyId }).offset(offset).limit(per_page)
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
          buildingPhases: pagination
        },
        message: 'Building Phases List!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewbuildingPhase] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = buildingPhaseController













