const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();

const companyController = {
  addCompany: async (req, res) => {
    try {
      let company = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          companyName: Joi.string().required(),
          companyId: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          description1: Joi.string().required(),
          contactPerson: Joi.string().required(),
          companyAddressEng: Joi.string().required(),
          companyAddressThai: Joi.string().required(),
          country: Joi.string().required(),
          state: Joi.string().required(),
          city: Joi.string().required(),
          zipCode: Joi.string().required(),
          telephone: Joi.string().required(),
          fax: Joi.string().required(),
          provinceCode: Joi.string().required(),
          amphurCode: Joi.string().required(),
          tumbonCode: Joi.string().required(),
          flag: Joi.string().required(),
          logoFile: Joi.string().required(),
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][generalsetup][addCompany]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, createdAt: currentTime, updatedAt: currentTime };
        let insertResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('companies')
        company = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          company: company
        },
        message: 'Company added successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][addCompany] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updateCompany: async (req, res) => {
    try {
      let company = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyName: Joi.string().required(),
          companyId: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          description1: Joi.string().required(),
          contactPerson: Joi.string().required(),
          companyAddressEng: Joi.string().required(),
          companyAddressThai: Joi.string().required(),
          country: Joi.string().required(),
          state: Joi.string().required(),
          city: Joi.string().required(),
          zipCode: Joi.string().required(),
          telephone: Joi.string().required(),
          fax: Joi.string().required(),
          provinceCode: Joi.string().required(),
          amphurCode: Joi.string().required(),
          tumbonCode: Joi.string().required(),
          flag: Joi.string().required(),
          logoFile: Joi.string().required(),
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][generalsetup][updateCompany]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex.update(insertData).where({ id: payload.id }).returning(['*']).transacting(trx).into('companies')
        company = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          company: company
        },
        message: 'Company details updated successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][updateCompany] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = companyController