const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');

const trx = knex.transaction();

const peopleController = {
    addPeople: async (req, res) => {
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

                let currentTime = new Date().getTime();
                let insertPeopleData = { email: peoplePayload.email, createdAt: currentTime, updatedAt: currentTime }
                // Insert into users table
                let peopleResult = await knex.insert(insertPeopleData).returning(['*']).transacting(trx).into('users');
                people = peopleResult[0]

                // Insert into user_roles table


                let insertRoleData = { roleId: peoplePayload.roleId, userId: people.id, createdAt: currentTime, updatedAt: currentTime }

                let roleResult = await knex.insert(insertRoleData).returning(['*']).transacting(trx).into('user_roles');
                role = roleResult[0];

                trx.commit;
                res.status(200).json({
                    data: { people, role },
                    message: "People added successfully !"
                });
            })
        } catch (err) {
            console.log('[controllers][people][addPeople] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updatePeopleDetails: async (req, res) => {
        try {

            let people = null;
            await knex.transaction(async (trx) => {
                let peoplePayload = req.body;
                let id = req.body.id
                console.log('[controllers][people][payload]', peoplePayload);
                peoplePayload = _.omit(peoplePayload, ['id'])
                // validate keys
                const schema = Joi.object().keys({
                    firstName: Joi.string().required(),
                    lastName: Joi.string().required(),
                    mobileNo: Joi.string().required(),
                    userName: Joi.string().required(),
                    houseId: Joi.string().required(),
                    email: Joi.string().required()
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
                let finalPayload = _.omit(peoplePayload, ['id', 'firstName', 'lastName'])
                let insertData = { ...finalPayload, name: peoplePayload.firstName + ' ' + peoplePayload.lastName, updatedAt: currentTime, isActive: true };

                console.log('[controllers][people][updatePeopleDetails]: Update Data', insertData);

                let peopleResult = await knex.update(insertData).where({ id: id }).returning(['*']).transacting(trx).into('users');

                people = peopleResult[0]


                trx.commit;

            });

            res.status(200).json({
                data: {
                    people: people
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
    },
    getPeopleList: async (req, res) => {
        try {

            let peopleData = null;
            peopleData = await knex.select().from('users')

            console.log('[controllers][people][getPeopleList]: People List', peopleData);

            peopleData = peopleData.map(d => _.omit(d, ['password'], ['createdAt'], ['updatedAt'], ['isActive'], ['verifyToken'], ['verifyTokenExpiryTime']));

            res.status(200).json({
                data: peopleData,
                message: "People List"
            });


        } catch (err) {
            console.log('[controllers][people][getPeopleList] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getPeopleDetails: async (req, res) => {
        try {

            let peopleData = null;
            let id = req.body.id;

            peopleData = await knex('users').where({ id }).select()
            let peopleDataResult = peopleData[0];
            let omitedPeopleDataResult = _.omit(peopleDataResult, ['createdAt'], ['updatedAt'], ['isActive', 'password', 'verifyToken'])

            console.log('[controllers][people][getPeopleDetails]: People Details', peopleDataResult);

            res.status(200).json({
                data: { people: omitedPeopleDataResult },
                message: "People Details"
            });


        } catch (err) {
            console.log('[controllers][people][peopleDetails] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    removePeople: async (req, res) => {
        try {
            let people = null;
            await knex.transaction(async trx => {
                let peoplePayload = req.body;
                let id = req.body.id
                const schema = Joi.object().keys({
                    id: Joi.string().required()
                })
                const result = Joi.validate(peoplePayload, schema);
                console.log('[controllers][people][removePeople]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime();
                let peopleData = await knex.update({ isActive: false, updatedAt: currentTime }).where({ id: id }).returning(['*']).transacting(trx).into('users');
                people = peopleData[0];

                trx.commit
            })
            res.status(200).json({
                data: {
                    people: people
                },
                message: "People removed successfully !"
            });
        } catch (err) {

        }
    }
}

module.exports = peopleController