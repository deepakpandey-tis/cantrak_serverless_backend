const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
const multer = require('multer');
const multerS3 = require('multer-s3');

const knex = require('../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();


const quotationsController = {

    generateQuotationId: async (req, res) => {

        try {

            let quotationId = null;

            await knex.transaction(async (trx) => {

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                const insertData = { moderationStatus: 0, isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][quotation][generateQuotation]: Insert Data', insertData);

                const quotationResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('quotations');

                quotationId = quotationResult[0];

                trx.commit;
            });

            res.status(200).json({
                data: {
                    quotation: quotationId
                },
                message: "Quotation Id generated successfully !"
            });

        } catch (err) {
            console.log('[controllers][quotation][generateQuotation] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateQuotations: async (req, res) => {
        try {

            let assignedServiceTeam = null;
            let additionalUsersList = []

            await knex.transaction(async (trx) => {

                let quotationPayload = req.body;

                console.log('[controllers][quotations][updateQuotation] : Quotation Body', quotationPayload);

                // validate keys
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.number().required(),
                    quotationId: Joi.number().required(),
                    checkedBy: Joi.string().required(),
                    inspectedBy: Joi.string().required(),
                    acknowledgeBy: Joi.string().required(),
                    startDate: Joi.string().required(),
                    finishDate: Joi.string().required(),
                    dueDate: Joi.string().required(),
                    onTime: Joi.string().required(),
                    salesTax: Joi.string().required(),
                    shippingCost: Joi.string().required(),
                    serviceCharge: Joi.string().required(),
                    additionalCost: Joi.string().required(),
                    teamId: Joi.string().required(),
                    userId: Joi.string().required(),
                    additionalUsers: Joi.array().required()
                });

                const result = Joi.validate(quotationPayload, schema);
                console.log('[controllers][quotations][updateQuotation]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in quotation table,
                const currentTime = new Date().getTime();

                const updateQuotationReq = await knex.update({ serviceRequestId: quotationPayload.serviceRequestId, checkedBy: quotationPayload.checkedBy, inspectedBy: quotationPayload.inspectedBy, acknowledgeBy: quotationPayload.acknowledgeBy, startDate: quotationPayload.startDate, finishDate: quotationPayload.finishDate, onTime: quotationPayload.onTime, dueDate: quotationPayload.dueDate, updatedAt: currentTime, isActive: true, moderationStatus: 1 }).where({ id: quotationPayload.quotationId }).returning(['*']).transacting(trx).into('quotations');

                console.log('[controllers][quotations][updateQuotation]: Update Data', updateQuotationReq);

                quotationsData = updateQuotationReq[0];




                // Start quotation service charges table,

                let quotationCharges = await knex('quotation_service_charges').where({ quotationId: quotationPayload.quotationId }).select('id');

                if ((quotationCharges.length) > 0) {

                    // Update quotation service charges table,

                    const updateChargesData = await knex.update({ salesTax: quotationPayload.salesTax, shippingCost: quotationPayload.shippingCost, serviceCharge: quotationPayload.serviceCharge, additionalCost: quotationPayload.additionalCost, updatedAt: currentTime }).where({ quotationId: quotationPayload.quotationId }).returning(['*']).transacting(trx).into('quotation_service_charges');

                    console.log('[controllers][quotations][updateTeams]: Update Data', updateChargesData);

                    quotationsData.charges = updateChargesData[0];

                } else {
                    // Insert into quotation service charges table,

                    const insertChargesData = { salesTax: quotationPayload.salesTax, shippingCost: quotationPayload.shippingCost, serviceCharge: quotationPayload.serviceCharge, additionalCost: quotationPayload.additionalCost, quotationId: quotationPayload.quotationId, createdAt: currentTime, updatedAt: currentTime };

                    console.log('[controllers][quotation][addQuotationCharges]: Insert Data', insertChargesData);

                    const serviceResult = await knex.insert(insertChargesData).returning(['*']).transacting(trx).into('quotation_service_charges');

                    quotationsData.charges = serviceResult;
                }



                // Insert into assigned teams table

                let assignedTeam = await knex('assigned_service_team').where({ entityId: quotationPayload.quotationId, entityType: "quotations" }).select('*');

                if ((assignedTeam.length) > 0) {

                    // Update table "assigned_service_team from quotation section"                         

                    const updateQuotationTeam = await knex.update({ teamId: quotationPayload.teamId, userId: quotationPayload.userId, updatedAt: currentTime }).where({ entityId: quotationPayload.quotationId, entityType: 'quotations' }).returning(['*']).transacting(trx).into('assigned_service_team');

                    console.log('[controllers][quotations][updateTeams]: Update Data', updateQuotationTeam);

                    assignedServiceTeam = updateQuotationTeam[0];

                } else {
                    // Insert first entry into table "assigned_service_team from quotation section"

                    const insertAssignedTeam = { teamId: quotationPayload.teamId, userId: quotationPayload.userId, entityId: quotationPayload.quotationId, entityType: "quotations", createdAt: currentTime, updatedAt: currentTime };

                    console.log('[controllers][quotation][addQuotationTeam]: Insert Data', insertChargesData);

                    const serviceResult = await knex.insert(insertAssignedTeam).returning(['*']).transacting(trx).into('assigned_service_team');

                    assignedServiceTeam = serviceResult[0];
                }

                // Insert into assigned additional users table

                // Here 3 operations will take place
                /*
                    1. Select users based on entity id and entity type
                    2. Remove Those users 
                    3. Add new users                    
                */

                let assignedQuotationAddUsers = quotationPayload.additionalUsers;

                let selectedUsers = await knex.select().where({ entityId: quotationPayload.quotationId, entityType: 'quotations' }).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)

                if (_.isEqual(selectedUsers, assignedQuotationAddUsers)) {
                    // trx.commit
                    for (user of assignedQuotationAddUsers) {
                        let userResult = await knex('assigned_service_additional_users').where({ entityId: quotationPayload.quotationId, entityType: "quotations" }).select('*');
                        additionalUsersList.push(userResult[0])
                    }
                    trx.commit;
                    return res.status(200).json({
                        data: { quotationsData, assignedServiceTeam, assignedAdditionalUsers: additionalUsersList },
                        message: "Quotations updated successfully !"
                    });

                } else {

                    // Remove old users

                    for (user of selectedUsers) {
                        await knex.del().where({ entityId: quotationPayload.quotationId, entityType: 'quotations' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    }

                    // Insert New Users

                    for (user of assignedQuotationAddUsers) {
                        let userResult = await knex.insert({ userId: user, entityId: quotationPayload.quotationId, entityType: 'quotations', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                        additionalUsersList.push(userResult[0])
                    }
                    trx.commit;
                    return res.status(200).json({
                        data: { quotationsData, assignedServiceTeam, assignedAdditionalUsers: additionalUsersList },
                        message: "Quotations updated successfully !"
                    });

                }
            });

        } catch (err) {
            console.log('[controllers][quotation][updateQuotation] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    getQuotationDetails: async (req, res) => {
        try {
            let quotationRequestId = req.query.id;
            // Get Quotations Details
            quotationView = await knex('quotations').
                innerJoin('assigned_service_team as astm', 'astm.entityId', '=', 'quotations.id', 'astm.entityType', '=', 'quotations').
                innerJoin('teams', 'teams.teamId', '=', 'astm.teamId').
                innerJoin('users as astUser', 'astUser.id', '=', 'astm.userId').
                innerJoin('quotation_service_charges', 'quotation_service_charges.quotationId', '=', 'quotation_service_charges.quotationId').
                innerJoin('user_roles', 'astm.userId', '=', 'user_roles.userId').
                innerJoin('roles', 'user_roles.roleId', '=', 'roles.id').
                select('quotations.id as quotationId', 'quotations.checkedBy', 'quotations.inspectedBy', 'quotations.acknowledgeBy', 'quotations.startDate', 'quotations.finishDate', 'quotations.dueDate', 'quotations.onTime', 'quotation_service_charges.*', 'teams.teamName as assignTeam', 'astUser.name as assignedMainUsers', 'roles.name as userRole').
                where({ 'quotations.id': quotationRequestId });
            console.log('[controllers][teams][getTeamList] : Team List', quotationView);
            quotationsDetails = _.omit(quotationView[0], ['id'], ['isActive'], ['createdAt'], ['updatedAt']);

            // Get addtional User list For Quotations
            addtionalUser = await knex('assigned_service_additional_users').
                leftJoin('users', 'assigned_service_additional_users.userId', '=', 'users.id').
                leftJoin('user_roles', 'assigned_service_additional_users.userId', '=', 'user_roles.userId').
                leftJoin('roles', 'user_roles.roleId', '=', 'roles.id').
                select('users.name as addtionalUsers', 'roles.name as userRole').
                where({ 'assigned_service_additional_users.entityId': quotationRequestId, 'assigned_service_additional_users.entityType': 'quotations' });
            console.log('[controllers][teams][getTeamList] : Addtional Users List', addtionalUser);
            quotationsDetails.addtinalUserList = addtionalUser;
            quotationsDetails.parts = [];
            quotationsDetails.assets = [];
            quotationsDetails.charges = [];


            teamResult = { 'quotation': quotationsDetails };

            res.status(200).json({
                data: teamResult,
                message: "Quotations details !"
            })

        } catch (err) {
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }

    },

    addQuotationPart: async (req, res) => {
        try {
            let part = null;
            await knex.transaction(async trx => {
                let payload = req.body
                const schema = Joi.object().keys({
                    quotationId: Joi.string().required(),
                    partId: Joi.string().required(),
                    unitCost: Joi.string().required(),
                    quantity: Joi.string().required(),
                    status: Joi.string().required()
                })

                let result = Joi.validate(payload, schema);
                console.log('[controllers][quotation][addQuotationPart]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime()
                let insertData = { unitCost: payload.unitCost, quantity: payload.quantity, status: payload.status, partId: payload.partId, entityId: payload.quotationId, entityType: 'quotations', updatedAt: currentTime, createdAt: currentTime }
                let partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_parts')
                part = partResult[0]
                trx.commit;
            })

            return res.status(200).json({
                data: {
                    part: part
                },
                message: 'Part assigned to quotation successfully'
            })
        } catch (err) {
            console.log('[controllers][quotation][addQuotationPart] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    addQuotationAsset: async (req, res) => {
        try {
            let asset = null
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    assetId: Joi.string().required(),
                    quotationId: Joi.string().required(),
                    price: Joi.string().required(),
                    status: Joi.string().required()
                })
                let result = Joi.validate(payload, schema);
                console.log('[controllers][quotation][addQuotationAsset]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime()
                let insertData = { entityId: payload.quotationId, entityType: 'quotations', assetId: payload.assetId, updatedAt: currentTime, createdAt: currentTime, price: payload.price, status: payload.status }
                let assetResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_assets')
                asset = assetResult[0]

                trx.commit;

            })

            return res.status(200).json({
                data: {
                    asset: asset
                },
                message: 'Asset added to quotation successfully!'
            })
        } catch (err) {
            console.log('[controllers][quotation][addQuotationAsset] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }

}

module.exports = quotationsController;