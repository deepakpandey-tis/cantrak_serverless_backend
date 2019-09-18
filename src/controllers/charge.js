const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');

const trx = knex.transaction();

const chargeController = {
  addCharge: async (req, res) => {
    try {

      let chargeData = null
      await knex.transaction(async trx => {


        let chargePayload = req.body;
        const schema = Joi.object().keys({
          chargeCode: Joi.string().required(),
          chargeName: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          vat: Joi.string().required(),
          vatCode: Joi.string().required(),
          wht: Joi.string().required(),
          calculationUnit: Joi.string().required(),
          glAccountCode: Joi.string().required(),
          code: Joi.string().required(),
          rate: Joi.string().required(),
          isActive: Joi.string().required()
        })



        let result = Joi.validate(chargePayload, schema);
        console.log('[controllers][charge][addCharge]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        // Insert into charge codes
        let insertData = { ...chargePayload, updatedAt: currentTime, createdAt: currentTime }
        let chargeResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('charge_master')
        chargeData = chargeResult[0]

        trx.commit

      })
      return res.status(200).json({
        data: {
          charge: chargeData
        },
        message: 'Charge added successfully'
      })

    } catch (err) {
      console.log('[controllers][charge] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  addServiceOrderFixCharge: async (req, res) => {
    try {
      let charge = null;
      await knex.transaction(async trx => {
        const payload = req.body;
        const schema = Joi.object().keys({
          serviceOrderId: Joi.string().required(),
          chargeId: Joi.string().required()
        })

        let result = Joi.validate(payload, schema);
        console.log('[controllers][charge][addServiceOrderFixCharge]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }
        let currentTime = new Date().getTime()
        let insertData = { chargeId: payload.chargeId, entityId: payload.serviceOrderId, entityType: 'service_orders', updatedAt: currentTime, createdAt: currentTime }
        let chargeResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_service_charges')
        charge = chargeResult[0]

        trx.commit;

      })

      return res.status(200).json({
        data: {
          charge: charge
        },
        message: 'Charge added to service order'
      })

    } catch (err) {
      console.log('[controllers][charge][addServiceFixCharge] :  Error', err);
      trx.rollback;
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = chargeController