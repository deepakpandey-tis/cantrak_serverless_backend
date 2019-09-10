const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');

const knex = require('../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();

const partsController = {
    getParts: async (req, res) => {
        try {

            let partData = null;
            // check username & password not blank
            //partData = await knex('part_master').where({ isActive: 'true' }).select();

            partData = await knex.from('part_ledger').innerJoin('part_master', 'part_ledger.partId', 'part_master.id')

            console.log('[controllers][parts]: Parts List', partData);
            partData = partData.map(d => _.omit(d, ['partId'], ['createdAt'], ['updatedAt'], ['isActive']));
            res.status(200).json({
                data: partData,
                message: "Parts List"
            });


        } catch (err) {
            console.log('[controllers][usermanagement][roles] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addParts: async (req, res) => {
        try {

            let part = null;
            let attribs = []

            await knex.transaction(async (trx) => {
                let partPayload = req.body;
                console.log('[controllers][part]', partPayload);
                partPayload = _.omit(partPayload, ['quantity'], ['unitCost'], ['additionalAttributes'])
                // validate keys
                const schema = Joi.object().keys({
                    partName: Joi.string().required(),
                    partCode: Joi.string().required(),
                    partDescription: Joi.string().required(),
                    partCategory: Joi.string().required(),
                    minimumQuantity: Joi.string().required(),
                    barcode: Joi.string().required(),
                    assignedVendors: Joi.string().required(),
                    additionalPartDetails: Joi.string()
                });

                let result = Joi.validate(partPayload, schema);
                console.log('[controllers][part]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in users table,
                let currentTime = new Date().getTime();

                let insertData = { ...partPayload, createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][part]: Insert Data', insertData);

                let partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('part_master');
                part = partResult[0];

                let unitCost = req.body.unitCost;
                let quantity = req.body.quantity
                let quantitySchema = Joi.object().keys({
                    unitCost: Joi.string().required(),
                    quantity: Joi.string().required(),
                })
                let quantityResult = Joi.validate({ unitCost, quantity }, quantitySchema);
                console.log('[controllers][part]: JOi Result', result);

                if (quantityResult && quantityResult.hasOwnProperty('error') && quantityResult.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: quantityResult.error.message }
                        ],
                    });
                }
                let quantityData = { partId: part.id, unitCost, quantity, createdAt: currentTime, updatedAt: currentTime };
                let partQuantityResult = await knex.insert(quantityData).returning(['*']).transacting(trx).into('part_ledger');

                quantityObject = _.omit(partQuantityResult[0], ['id'], ['partId']);


                let additionalAttributes = req.body.additionalAttributes;
                console.log(additionalAttributes)
                if (additionalAttributes.length > 0) {

                    for (attribute of additionalAttributes) {
                        let d = await knex.insert({ partId: part.id, ...attribute, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('part_attributes');
                        attribs.push(d[0])
                    }


                }


                trx.commit;

            });

            res.status(200).json({
                data: {
                    part: { ...part, ...quantityObject, attributes: attribs }
                },
                message: "Part added successfully !"
            });

        } catch (err) {
            console.log('[controllers][part] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
}

module.exports = partsController;