const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');

const trx = knex.transaction();

const serviceOrderController = {
    addServiceOrder: async (req,res) => {
        try { 
            let serviceOrder = null;
            await knex.transaction(async trx => {
                let serviceOrderPayload = req.body;

                const schema = Joi.object().keys({
                    serviceRequestId:Joi.string().required(),
                    orderDueDate:Joi.string().required()
                })

                let result = Joi.validate(serviceOrderPayload, schema);
                console.log('[controllers][serviceOrder][addServiceOrder]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime();
                let inserServiceOrderPayload = {...serviceOrderPayload, createdAt:currentTime, updatedAt:currentTime}
                let serviceOrderResults = await knex.insert(inserServiceOrderPayload).returning(['*']).transacting(trx).into('service_orders')
                serviceOrder = serviceOrderResults[0]
                trx.commit;
                res.status(200).json({
                    data: {serviceOrder},
                    message: "Service Order added successfully !"
                });


            })
        } catch(err) {
            console.log('[controllers][serviceOrder][addServiceOrder] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceOrderList: async (req,res) => {
        try {
            const serviceOrders = await knex('service_orders').select();
            
            res.status(200).json({
                data: {serviceOrders},
                message: "Service Orders List !"
            });
        } catch(err) {
            console.log('[controllers][serviceOrder][GetServiceOrderList] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
}

module.exports = serviceOrderController;