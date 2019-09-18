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

                let selectedUsers = await knex.select().where({ entityId: serviceOrder.id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)

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
                        await knex.del().where({ entityId: serviceOrder.id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    }

                    // Insert New Users

                    for (user of assignedServiceAdditionalUsers) {
                        let userResult = await knex.insert({ userId: user, entityId: serviceOrder.id, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
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
            //const serviceOrders = await knex('service_orders').select();



            const serviceOrders = await knex
                .from('service_orders')
                .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                .select(['service_orders.id as so_id',
                    'service_requests.id as sr_id', 'service_requests.description as sr_description',
                    'location', 'priority', 'orderDueDate',
                    'service_orders.createdAt as createdAt',
                    'service_requests.requestedBy as requestedBy',
                    'serviceOrderStatus', 'service_problems.description as sp_description',
                    'categoryId', 'problemId',
                    'incident_categories.id as categoryId',
                    'incident_categories.descriptionEng as problem'

                ])
            //.innerJoin('service_problems', 'service_orders.serviceRequestId', 'service_problems.serviceRequestId')



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
    },
    getServiceOrderDetails: async (req, res) => {
        try {

            await knex.transaction(async trx => {
                let serviceOrderId = req.body.serviceOrderId;
                let serviceRequestId = req.body.serviceRequestId;

                // Get Service Order Details
                let serviceOrderResult = await knex.select().where({ id: serviceOrderId }).returning(['*']).transacting(trx).into('service_orders')

                // Get Service Request Details

                let serviceRequestResult = await knex.select().where({ id: serviceRequestId }).returning(['*']).transacting(trx).into('service_requests')


                // Get Team details based on ids provided
                let assignedServiceTeam = null
                if (serviceRequestId && serviceOrderId) {
                    assignedServiceTeam = await knex.select().where({ entityId: serviceOrderId, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_team')
                } else {
                    assignedServiceTeam = await knex.select().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_team')
                }


                // Get additional users
                let additionalUsers = []
                if (serviceRequestId && serviceOrderId) {
                    additionalUsers = await knex.select().where({ entityId: serviceOrderId, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                } else {
                    additionalUsers = await knex.select().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                }

                res.status(200).json({
                    data: { serviceOrder: serviceOrderResult[0], assignedServiceTeam, additionalUsers, serviceRequest: serviceRequestResult[0] },
                    message: "Service Order Details!"
                });
            })
        } catch (err) {
            console.log('[controllers][serviceOrder][GetServiceOrderDetails] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updateServiceOrder: async (req, res) => {
        try {
            await knex.transaction(async trx => {
                let serviceOrder = null;
                let team = null;
                let additionalUsers = []
                let currentTime = new Date().getTime();
                const id = req.body.serviceOrderId;
                const serviceRequestId = req.body.serviceRequestId
                const serviceOrderPayload = req.body;


                let updateData = { updatedAt: currentTime }
                serviceOrder = await knex.update(updateData).where({ id: id }).returning(['*']).transacting(trx).into('service_orders');


                // Check if previous teamId is equal to new team id
                let teamResult = await knex.select().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_team').map(team => team.id)

                if (!_.isEqual(teamResult, [req.body.teamId])) {

                    // Delete previous TeamId
                    await knex.del().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_team')

                    // Add new teamId
                    let insertData = { createdAt: currentTime, updatedAt: currentTime, entityId: id, entityType: 'service_orders', teamId: serviceOrderPayload.teamId, userId: serviceOrderPayload.mainUserId }
                    let teamRes = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_service_team')
                    team = teamRes[0]
                }







                let assignedServiceAdditionalUsers = serviceOrderPayload.additionalUsers;
                let selectedUsers = [];

                selectedUsers = await knex.select().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)
                if (selectedUsers.length === 0) {
                    selectedUsers = await knex.select().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)
                }

                if (_.isEqual(selectedUsers, assignedServiceAdditionalUsers)) {
                    // trx.commit
                    trx.commit;
                    return res.status(200).json({
                        data: { serviceOrder, team, assignedAdditionalUsers: assignedServiceAdditionalUsers },
                        message: "Service Order updated successfully !"
                    });
                } else {

                    // Remove old users

                    for (user of selectedUsers) {
                        await knex.del().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    }

                    // Insert New Users

                    for (user of assignedServiceAdditionalUsers) {
                        let userResult = await knex.insert({ userId: user, entityId: id, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                        additionalUsers.push(userResult[0])
                    }
                    trx.commit;
                    return res.status(200).json({
                        data: { serviceOrder, team, assignedAdditionalUsers: additionalUsers },
                        message: "Service Order updated successfully !"
                    });
                }


            })
        } catch (err) {
            console.log('[controllers][serviceOrder][updateServiceOrder] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addServiceOrderPart: async (req, res) => {
        try {
            let assignedPart = null;

            await knex.transaction(async trx => {

                let assignedPartPayload = req.body;
                let schema = Joi.object().keys({
                    partId: Joi.string().required(),
                    unitCost: Joi.string().required(),
                    quantity: Joi.string().required(),
                    status: Joi.string().required(),
                    serviceOrderId: Joi.string().required()
                })


                let result = Joi.validate(assignedPartPayload, schema)
                console.log('[controllers][service][order]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in assigned_parts table,
                const currentTime = new Date().getTime();

                let assignedPartInsertPayload = _.omit(assignedPartPayload, ['serviceOrderId'])

                let insertData = { ...assignedPartInsertPayload, entityId: assignedPartPayload.serviceOrderId, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime }
                let partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_parts')
                assignedPart = partResult[0]
                trx.commit

            })
            res.status(200).json({
                data: {
                    assignedPart: assignedPart
                },
                message: "Part added to Service order successfully !"
            });

        } catch (err) {
            console.log('[controllers][service][order] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addServiceOrderAsset: async (req, res) => {
        try {
            let assignedAsset = null;

            await knex.transaction(async trx => {

                let assignedAssetPayload = req.body;
                let schema = Joi.object().keys({
                    assetId: Joi.string().required(),
                    price: Joi.string().required(),
                    status: Joi.string().required(),
                    serviceOrderId: Joi.string().required()
                })


                let result = Joi.validate(assignedAssetPayload, schema)
                console.log('[controllers][service][order]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in assigned_parts table,
                const currentTime = new Date().getTime();

                let assignedAssetInsertPayload = _.omit(assignedAssetPayload, ['serviceOrderId'])

                let insertData = { ...assignedAssetInsertPayload, entityId: assignedAssetPayload.serviceOrderId, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime }
                let assetResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_assets')
                assignedAsset = assetResult[0]
                trx.commit

            })
            res.status(200).json({
                data: {
                    assignedAsset: assignedAsset
                },
                message: "Asset added to Service order successfully !"
            });

        } catch (err) {
            console.log('[controllers][service][order] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    deleteServiceOrderPart: async (req, res) => {
        try {
            let serviceOrder = null;
            let partResult = null;
            await knex.transaction(async trx => {

                let currentTime = new Date().getTime()
                const partPayload = req.body;
                const schema = Joi.object().keys({
                    serviceOrderId: Joi.string().required(),
                    partId: Joi.string().required()
                })

                let result = Joi.validate(partPayload, schema)
                console.log('[controllers][service][order]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Now, check whether this service order is completed or not. If completed, we will soft delete the part from assigned_parts table
                let serviceOrderResult = await knex.select().where({ id: partPayload.serviceOrderId }).returning(['*']).transacting(trx).into('service_orders')

                serviceOrder = serviceOrderResult[0]
                if (String(serviceOrder.serviceOrderStatus).toUpperCase() === 'COMPLETE') {
                    // Now soft delete and return
                    let updatedPart = await knex.update({ status: 'done', updatedAt: currentTime }).where({ partId: partPayload.partId, entityId: partPayload.serviceOrderId, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_parts')
                    //partResult = updatedPartResult[0]
                    trx.commit;
                    return res.status(200).json({
                        data: {
                            updatedPart: updatedPart
                        },
                        message: "Assigned part status updated successfully !"
                    });

                }
                trx.commit
                return res.status(200).json({
                    data: {
                        updatedPart: null
                    },
                    message: 'Part status for this service order can not be updated because this service order is not completed yet.'
                })
            })


        } catch (err) {
            console.log('[controllers][service][order] :  Error', err);
            trx.rollback;
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
}

module.exports = serviceOrderController;