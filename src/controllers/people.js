const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');

const knex = require('../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();

const peopleController = {
    addPeople: async (req,res) => {
        try {

            let people = null;
            let role = null

            await knex.transaction(async (trx) => {
                let peoplePayload = req.body;
                const schema = Joi.object().keys({
                    email: Joi.string().required(),
                    roleId: Joi.string().required()
                })
                let result = Joi.validate(peoplePayload, schema);
                console.log('[controllers][people][addPeople]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let insertPeopleData = {email: peoplePayload.userEmail}
                // Insert into users table
                let peopleResult = await knex.insert(insertPeopleData).returning(['*']).transacting(trx).into('users');
                people = peopleResult[0]

                // Insert into user_roles table

                let insertRoleData = {roleId: peoplePayload.roleId,userId:people.id}

                let roleResult = await knex.insert(insertRoleData).returning(['*']).transacting(trx).into('user_roles');
                role = roleResult[0];

                trx.commit;
                res.status(200).json({
                    data: {people,role},
                    message: "People added successfully !"
                });
            })
        }catch(err) {
            console.log('[controllers][people][addPeople] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updatePeopleDetails: async(req,res) => {
        try {

            let people = null;
            

            await knex.transaction(async (trx) => {
                let peoplePayload = req.body;
                let id = req.body.id
                console.log('[controllers][people][payload]', peoplePayload);
                peoplePayload = _.omit(peoplePayload, ['id'])
                // validate keys
                const schema = Joi.object().keys({
                        firstName:Joi.string().required(),
                        lastName:Joi.string().required(),
                        mobileNo:Joi.string().required(),
                        userName:Joi.string().required(),
                        houseId:Joi.string().required()
                });

                let result = Joi.validate(peoplePayload, schema);
                console.log('[controllers][people][updatePeopleDetails]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Update in users table,
                let currentTime = new Date().getTime();
                let finalPayload = _.omit(peoplePayload, ['id','firstName','lastName'])
                let insertData = { ...finalPayload,name:peoplePayload.firstName+' '+peoplePayload.lastName,createdAt:currentTime, updatedAt: currentTime,isActive:true };

                console.log('[controllers][asset][updateAssetDetails]: Update Data', insertData);

                console.log('DATTAA ',insertData)
                let peopleResult = await knex.update(insertData).where({ id:id }).returning(['*']).transacting(trx).into('users');
                
                people = peopleResult[0]

                
                trx.commit;

            });

            res.status(200).json({
                data: {
                    people:people
                },
                message: "People details updated successfully !"
            });

        } catch (err) {
            console.log('[controllers][people][UpdatePeople] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
}

module.exports = peopleController