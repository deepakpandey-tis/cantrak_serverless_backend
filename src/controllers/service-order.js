const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');

const trx = knex.transaction();

const serviceOrderController = {
    addServiceOrder: async (req, res) => {
        try {
            let serviceOrder = null;
            await knex.transaction(async trx => {


                let serviceOrderPayload = req.body;
                let serviceRequestId = req.body.serviceRequestId
                let serviceRequest = { id: req.body.serviceRequestId };
                serviceOrderPayload = _.omit(serviceOrderPayload, ['serviceRequest', 'teamId', 'mainUserId', 'additionalUsers'])

                const schema = Joi.object().keys({
                    serviceRequestId: Joi.string().required(),
                    orderDueDate: Joi.string().required()
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


                // Insert into service_orders

                let inserServiceOrderPayload = { ...serviceOrderPayload, createdAt: currentTime, updatedAt: currentTime }
                let serviceOrderResults = await knex.insert(inserServiceOrderPayload).returning(['*']).transacting(trx).into('service_orders')
                serviceOrder = serviceOrderResults[0]

                // if new service request id that means direct serviceOrder


                let currentUser = req.me;

                if (currentUser && currentUser.roles && currentUser.roles.includes("admin") || currentUser.roles.includes("superAdmin")) {
                    // i am admin i can overwrite things here
                    let serviceRequestPayload = req.body.serviceRequest;
                    let serviceRequestId = req.body.serviceRequestId;

                    const schema = Joi.object().keys({
                        serviceRequestId: Joi.number().required(),
                        description: Joi.string().required(),
                        requestFor: Joi.string().required(),
                        houseId: Joi.string().required(),
                        commonId: Joi.string().required(),
                        serviceType: Joi.string().required(),
                        requestedBy: Joi.string().required(),
                        priority: Joi.string().required(),
                        location: Joi.string().required()
                    });

                    const result = Joi.validate({ serviceRequestId, ...serviceRequestPayload }, schema);
                    console.log('[controllers][service][request]: JOi Result', result);

                    if (result && result.hasOwnProperty('error') && result.error) {
                        return res.status(400).json({
                            errors: [
                                { code: 'VALIDATION_ERROR', message: result.error.message }
                            ],
                        });
                    }

                    // Insert in service_requests table,
                    const currentTime = new Date().getTime();

                    const updateServiceReq = await knex.update({ description: serviceRequestPayload.description, requestFor: serviceRequestPayload.requestFor, houseId: serviceRequestPayload.houseId, commonId: serviceRequestPayload.commonId, serviceType: serviceRequestPayload.serviceType, requestedBy: serviceRequestPayload.requestedBy, priority: serviceRequestPayload.priority, location: serviceRequestPayload.location, updatedAt: currentTime, isActive: true, moderationStatus: true, serviceStatusCode: "O" }).where({ id: serviceRequestId }).returning(['*']).transacting(trx).into('service_requests');

                    console.log('[controllers][service][request]: Update Data', updateServiceReq);

                    serviceRequest = updateServiceReq[0];
                }


                // Insert into assigned_service_team table
                let { teamId, mainUserId, additionalUsers } = req.body;
                const assignedServiceTeamPayload = { teamId, userId: mainUserId, entityId: serviceOrder.id, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime }
                let assignedServiceTeamResult = await knex.insert(assignedServiceTeamPayload).returning(['*']).transacting(trx).into('assigned_service_team')
                let assignedServiceTeam = assignedServiceTeamResult[0]


                let assignedServiceAdditionalUsers = additionalUsers

                let selectedUsers = await knex.select().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)

                let additionalUsersResultantArray = []

                if (_.isEqual(selectedUsers, assignedServiceAdditionalUsers)) {
                    // trx.commit
                    trx.commit;
                    res.status(200).json({
                        data: { serviceOrder, serviceRequest, assignedServiceTeam },
                        message: "Service Order added successfully !"
                    });
                } else {

                    // Remove old users

                    for (user of selectedUsers) {
                        await knex.del().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    }

                    // Insert New Users

                    for (user of assignedServiceAdditionalUsers) {
                        let userResult = await knex.insert({ userId: user, entityId: serviceRequestId, entityType: 'service_requests', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                        additionalUsersResultantArray.push(userResult[0])
                    }
                    trx.commit;
                    return res.status(200).json({
                        data: { serviceOrder, assignedServiceTeam, assignedAdditionalUsers: additionalUsersResultantArray },
                        message: "Service Order added successfully!"
                    });
                }





            })
        } catch (err) {
            console.log('[controllers][serviceOrder][addServiceOrder] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceOrderList: async (req, res) => {
        try {
            const serviceOrders = await knex('service_orders').select();

            res.status(200).json({
                data: { serviceOrders },
                message: "Service Orders List !"
            });
        } catch (err) {
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