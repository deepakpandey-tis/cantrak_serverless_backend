const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();



const generalSetupController = {

    addServiceType: async (req, res) => {

        try {

            let incidentService = null;
            
            await knex.transaction(async (trx) => {

                const servicePayload = req.body;

                console.log('[controllers][generalsetup][addservice]', servicePayload);
               
                // validate keys
                const schema = Joi.object().keys({
                    requestCode: Joi.string().required(),
                    descriptionThai: Joi.string().required(),
                    descriptionEng: Joi.string().required()
                });


                const result = Joi.validate(servicePayload, schema);
                console.log('[controllers][generalsetup][addservice]: JOi Result', result);
               
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const existRequestCode = await knex('source_of_request').where({ requestCode: servicePayload.requestCode });
              
                console.log('[controllers][generalsetup][addservice]: ServiceCode', existRequestCode);

                // Return error when username exist

                if (existRequestCode && existRequestCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Service Request Code already exist !' }
                        ],
                    });
                }           

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                const insertData = { ...servicePayload, requestCode: servicePayload.requestCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][generalsetup][addservice]: Insert Data', insertData);

                const serviceRequestResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('source_of_request');
                
                incidentService = serviceRequestResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    sourceRequest: incidentService
                },
                message: "Source Request added successfully !"
            });


        } catch (err) {
            console.log('[controllers][generalsetup][addservice] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateServiceType: async (req, res) => {

        try {

            let incidentService = null;
            
            await knex.transaction(async (trx) => {

                const servicePayload = req.body;

                console.log('[controllers][generalsetup][updaterequest]', servicePayload);
               
                // validate keys
                const schema = Joi.object().keys({
                    id: Joi.number().required(),
                    requestCode: Joi.string().required(),
                    descriptionEng: Joi.string().required(),
                    descriptionThai: Joi.string().required()
                });


                const result = Joi.validate(servicePayload, schema);
                console.log('[controllers][generalsetup][updaterequest]: JOi Result', result);
               
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const existRequestCode = await knex('source_of_request').where({ requestCode: servicePayload.requestCode });
              
                console.log('[controllers][generalsetup][updaterequest]: CategoryTypeCode', existRequestCode);

                // Return error when username exist

                if (existRequestCode && existRequestCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Request Code already exist !' }
                        ],
                    });
                }           

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                const updateDataResult = await knex.update({ requestCode : servicePayload.requestCode.toUpperCase(), descriptionEng : servicePayload.descriptionEng, descriptionThai : servicePayload.descriptionThai, updatedAt : currentTime }).where({ id: servicePayload.id }).returning(['*']).transacting(trx).into('source_of_request');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][generalsetup][updaterequest]: Update Data', updateDataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                incidentService = updateDataResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    sourceRequest: incidentService
                },
                message: "Source request updated successfully !"
            });


        } catch (err) {
            console.log('[controllers][generalsetup][updaterequest] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },


    addLocationTags: async (req, res) => {

        try {

            let incidentLocation = null;
            
            await knex.transaction(async (trx) => {

                const locationPayload = req.body;

                console.log('[controllers][generalsetup][addLocationTag]', locationPayload);
               
                // validate keys
                const schema = Joi.object().keys({
                    title: Joi.string().required(),
                    descriptionThai: Joi.string().required(),
                    descriptionEng: Joi.string().required()
                });


                const result = Joi.validate(locationPayload, schema);
                console.log('[controllers][generalsetup][addLocationTag]: JOi Result', result);
               
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const existLocationTag = await knex('location_tags_master').where({ title: locationPayload.title });
              
                console.log('[controllers][generalsetup][addLocationTag]: LocationTag', existLocationTag);

                // Return error when username exist

                if (existLocationTag && existLocationTag.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Location Tag already exist !' }
                        ],
                    });
                }           

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                const insertData = { ...locationPayload, title: locationPayload.title.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][generalsetup][addLocationTag]: Insert Data', insertData);

                const locationTagResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('location_tags_master');
                
                incidentLocation = locationTagResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    incidentLocation: incidentLocation
                },
                message: "Location Tag added successfully !"
            });


        } catch (err) {
            console.log('[controllers][generalsetup][addLocationTag] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateLocationTags: async (req, res) => {

        try {

            let incidentLocation = null;
            
            await knex.transaction(async (trx) => {

                const locationPayload = req.body;

                console.log('[controllers][generalsetup][updatelocation]', locationPayload);
               
                // validate keys
                const schema = Joi.object().keys({
                    id: Joi.number().required(),
                    title: Joi.string().required(),
                    descriptionEng: Joi.string().required(),
                    descriptionThai: Joi.string().required()
                });


                const result = Joi.validate(locationPayload, schema);
                console.log('[controllers][generalsetup][updaterequest]: JOi Result', result);
               
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const existLocationTitle = await knex('location_tags_master').where({ title: locationPayload.title });
              
                console.log('[controllers][generalsetup][updaterequest]: LocationTag', existLocationTitle);

                // Return error when username exist

                if (existLocationTitle && existLocationTitle.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Location Tag already exist !' }
                        ],
                    });
                }           

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                const updateDataResult = await knex.update({ title : locationPayload.title.toUpperCase(), descriptionEng : locationPayload.descriptionEng, descriptionThai : locationPayload.descriptionThai, updatedAt : currentTime }).where({ id: locationPayload.id }).returning(['*']).transacting(trx).into('location_tags_master');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][generalsetup][updaterequest]: Update Data', updateDataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                incidentLocation = updateDataResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    sourceRequest: incidentLocation
                },
                message: "Location tags updated successfully !"
            });


        } catch (err) {
            console.log('[controllers][generalsetup][updaterequest] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
};

module.exports = generalSetupController;