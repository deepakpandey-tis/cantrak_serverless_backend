const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');

const trx = knex.transaction();

const surveyOrderController = {
    addSurveyOrder: async (req,res) => {
        try {

            let surveyOrder = null;
            let additionalUsers = []

            await knex.transaction(async (trx) => {
                let surveyOrderPayload = req.body;
                let initialSurveyOrderPayload = _.omit(surveyOrderPayload, ['additionalUsers','teamId','mainUserId'])
                const schema = Joi.object().keys({              
                    serviceRequestId:Joi.string().required(),
                    appointedDate:Joi.string().required(),
                    appointedTime:Joi.string().required()
                })
                let result = Joi.validate(initialSurveyOrderPayload, schema);
                console.log('[controllers][surveyOrder][addSurveyOrder]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime();
                let insertSurveyOrderData = {...initialSurveyOrderPayload,createdAt:currentTime, updatedAt:currentTime,isActive:true}
                // Insert into survey_orders table
                let surveyOrderResult = await knex.insert(insertSurveyOrderData).returning(['*']).transacting(trx).into('survey_orders');
                surveyOrder = surveyOrderResult[0]

                // Insert into assigned_service_team table

                let assignedServiceTeamPayload = {teamId:surveyOrderPayload.teamId,userId:surveyOrderPayload.mainUserId,entityId:surveyOrder.id,entityType:'survey_orders',createdAt:currentTime,updatedAt:currentTime}
                const assignedServiceTeamResult = await knex.insert(assignedServiceTeamPayload).returning(['*']).transacting(trx).into('assigned_service_team')
                assignedServiceTeam = assignedServiceTeamResult[0]

                // Insert into assigned_service_additional_users

                let assignedServiceAdditionalUsers = surveyOrderPayload.additionalUsers;
                for(user of assignedServiceAdditionalUsers){
                    let userResult = await knex.insert({userId:user,entityId:surveyOrder.id,entityType:'survey_orders',createdAt:currentTime,updatedAt:currentTime}).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    additionalUsers.push(userResult[0])
                }

                trx.commit;
                res.status(200).json({
                    data: {surveyOrder,assignedServiceTeam,assignedAdditionalUsers:additionalUsers},
                    message: "Survey Order added successfully !"
                });
            })
        }catch(err) {
            console.log('[controllers][surveyOrder][addSurveyOrder] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updateSurveyOrder: async (req,res) => {
        try {

            let surveyOrder = null;
            let additionalUsers = []

            await knex.transaction(async (trx) => {
                let surveyOrderPayload = req.body;
                let id = req.body.id;

                let initialSurveyOrderPayload = _.omit(surveyOrderPayload, ['additionalUsers','teamId','mainUserId','id'])
                const schema = Joi.object().keys({              
                    appointedDate:Joi.string().required(),
                    appointedTime:Joi.string().required()
                })
                let result = Joi.validate(initialSurveyOrderPayload, schema);
                console.log('[controllers][surveyOrder][addSurveyOrder]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime();
                let insertSurveyOrderData = {...initialSurveyOrderPayload,updatedAt:currentTime,isActive:true}
                // Update into survey_orders table
                let surveyOrderResult = await knex.update(insertSurveyOrderData).where({id:id}).returning(['*']).transacting(trx).into('survey_orders');
                surveyOrder = surveyOrderResult[0]

                // Update into assigned_service_team table

                let assignedServiceTeamPayload = {teamId:surveyOrderPayload.teamId,userId:surveyOrderPayload.mainUserId,updatedAt:currentTime}
                const assignedServiceTeamResult = await knex.update(assignedServiceTeamPayload).where({entityId:id,entityType:'survey_orders'}).returning(['*']).transacting(trx).into('assigned_service_team')
                assignedServiceTeam = assignedServiceTeamResult[0]

                // Update into assigned_service_additional_users

                // Here 3 operations will take place
                /*
                    1. Select users based on entity id and entity type
                    2. Remove Those users 
                    3. Add new users                    
                */
               let assignedServiceAdditionalUsers = surveyOrderPayload.additionalUsers;

                let selectedUsers = await knex.select().where({entityId:id,entityType:'survey_orders'}).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)

                if(_.isEqual(selectedUsers,assignedServiceAdditionalUsers)){
                    // trx.commit
                    trx.commit;
                    return res.status(200).json({
                        data: {surveyOrder,assignedServiceTeam,assignedAdditionalUsers:additionalUsers},
                        message: "Survey Order updated successfully !"
                    });
                } else {

                    // Remove old users

                    for(user of selectedUsers){
                        await knex.del().where({entityId:id,entityType:'survey_orders'}).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    }

                    // Insert New Users

                    for(user of assignedServiceAdditionalUsers){
                        let userResult = await knex.insert({userId:user,entityId:id,entityType:'survey_orders',createdAt:currentTime,updatedAt:currentTime}).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                        additionalUsers.push(userResult[0])
                    }
                    trx.commit;
                    return res.status(200).json({
                        data: {surveyOrder,assignedServiceTeam,assignedAdditionalUsers:additionalUsers},
                        message: "Survey Order updated successfully !"
                    });
                }


            })
        }catch(err) {
            console.log('[controllers][surveyOrder][addSurveyOrder] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getSurveyOrderList: async (req,res) => {
        try {

            let surveyOrderData = null;
            let serviceRequestId = req.body.serviceRequestId;

            if(serviceRequestId){
                surveyOrderData = await knex.select().from('survey_orders').where({serviceRequestId:serviceRequestId})
            }else {
                surveyOrderData = await knex.select().from('survey_orders')
            }
            
            console.log('[controllers][surveyOrder][getSurveyOrderList]: Survey Orders', surveyOrderData);
            
            surveyOrderData = surveyOrderData.map(d => _.omit(d, ['createdAt'], ['updatedAt'], ['isActive']));
            
            res.status(200).json({
                data: surveyOrderData,
                message: "Survey Orders List"
            });


        } catch (err) {
            console.log('[controllers][survey Orders][getSurveyOrders] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getSurveyOrderDetails: async (req,res) => {
        try {

            let surveyOrder = null;

            await knex.transaction(async (trx) => {
                let id = req.body.id;

                surveyOrder = await knex('survey_orders').select().where({id:id})
                const schema = Joi.object().keys({              
                    id:Joi.string().required()
                })
                let result = Joi.validate(req.body, schema);
                console.log('[controllers][surveyOrder][getSurveyOrderDetails]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                return res.status(200).json({
                    data: {surveyOrder},
                    message: "Survey Order Details"
                });


            });
        } catch(err) {
            console.log('[controllers][surveyOrder][getSurveyOrderDetails] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }

    }
}

module.exports = surveyOrderController;