const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;




const propertySetupController = {

    incidentTypeAdd: async (req, res) => {

        try {

            let incident = null;
            
            await knex.transaction(async (trx) => {

                const incidentTypePayload = req.body;

                console.log('[controllers][incident][incidentType]', incidentTypePayload);
               
                // validate keys
                const schema = Joi.object().keys({
                    typeCode: Joi.string().required(),
                    descriptionEng: Joi.string().required(),
                    descriptionThai: Joi.string().required()
                });


                const result = Joi.validate(incidentTypePayload, schema);
                console.log('[controllers][incident][incidentType]: JOi Result', result);
               
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const existTypeCode = await knex('incident_type').where({ typeCode: incidentTypePayload.typeCode });
              
                console.log('[controllers][incident][incidentType]: TypeCode', existTypeCode);

                // Return error when username exist

                if (existTypeCode && existTypeCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Type Code already exist !' }
                        ],
                    });
                }           

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                const insertData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][incident][incidentType]: Insert Data', insertData);

                const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                incident = incidentResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    incident: incident
                },
                message: "Incident type added successfully !"
            });


        } catch (err) {
            console.log('[controllers][entrance][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    incidentTypeUpdate: async (req, res) => {

        try {

            let incident = null;
            
            await knex.transaction(async (trx) => {

                const incidentTypePayload = req.body;

                console.log('[controllers][incident][incidentType]', incidentTypePayload);
               
                // validate keys
                const schema = Joi.object().keys({
                    id: Joi.number().required(),
                    typeCode: Joi.string().required(),
                    descriptionEng: Joi.string().required(),
                    descriptionThai: Joi.string().required()
                });


                const result = Joi.validate(incidentTypePayload, schema);
                console.log('[controllers][incident][incidentType]: JOi Result', result);
               
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const existTypeCode = await knex('incident_type').where({ typeCode: incidentTypePayload.typeCode });
              
                console.log('[controllers][incident][incidentType]: TypeCode', existTypeCode);

                // Return error when username exist

                if (existTypeCode && existTypeCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Type Code already exist !' }
                        ],
                    });
                }           

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                const updateDataResult = await knex.update({ typeCode : incidentTypePayload.typeCode.toUpperCase(), descriptionEng : incidentTypePayload.descriptionEng, descriptionThai : incidentTypePayload.descriptionThai, updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][incident][incidentType]: Update Data', updateDataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                incident = updateDataResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    incident: incident
                },
                message: "Incident type updated successfully !"
            });


        } catch (err) {
            console.log('[controllers][entrance][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    incidentTypeDelete: async (req, res) => {

        try {

            let incident = null;
            
            await knex.transaction(async (trx) => {

                const incidentTypePayload = req.body;

                console.log('[controllers][incident][incidentType]', incidentTypePayload);
               
                // validate keys
                const schema = Joi.object().keys({
                    id: Joi.number().required()
                });


                const result = Joi.validate(incidentTypePayload, schema);
                console.log('[controllers][incident][incidentType]: JOi Result', result);
               
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const notexistTypeCode = await knex('incident_type').where({ id: incidentTypePayload.id });
              
                console.log('[controllers][incident][incidentType]: TypeId', notexistTypeCode);

                // Return error when username exist

                if (notexistTypeCode == "") {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Type ID does not exist !' }
                        ],
                    });
                }           

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][incident][incidentType]: Update Data', updateDataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                incident = updateDataResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    incident: incident
                },
                message: "Incident type deleted successfully !"
            });


        } catch (err) {
            console.log('[controllers][entrance][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    incidentList: async (req, res) => {

        try {

            let incident = null;
            
            await knex.transaction(async (trx) => {                        

                // Insert in users table,
                
                const DataResult = await knex('incident_type').where({ isActive: 'true' });
               
                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][incident][incidentType]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                incident = DataResult;
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    incident: incident
                },
                message: "Incident type list successfully !"
            });


        } catch (err) {
            console.log('[controllers][entrance][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },


};

module.exports = propertySetupController;