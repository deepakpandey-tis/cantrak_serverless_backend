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
const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.REGION || 'us-east-2' });


const getUploadURL = async () => {
    const actionId = uuidv4();
    const s3Params = {
        Bucket: 'local-bucket',
        Key: `${actionId}.jpg`,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
    };
    return new Promise((resolve, reject) => {
        const s3 = new AWS.S3();
        let uploadURL = s3.getSignedUrl('putObject', s3Params)
        resolve({
            "isBase64Encoded": false,
            "headers": { "Access-Control-Allow-Origin": "*" },
            "uploadURL": uploadURL,
            "photoFilename": `${actionId}.jpg`
        })
    })
};



const serviceRequestController = {

    addServiceRequest: async (req, res) => {

        try {

            let serviceRequestId = null;

            await knex.transaction(async (trx) => {

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                const insertData = { moderationStatus: 0, isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][service][requestId]: Insert Data', insertData);

                const serviceResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('service_requests');

                serviceRequestId = serviceResult[0];

                trx.commit;
            });

            res.status(200).json({
                data: {
                    service: serviceRequestId
                },
                message: "Service Request added successfully !"
            });

        } catch (err) {
            console.log('[controllers][service][requestId] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addServiceProblems: async (req, res) => {
        try {

            let serviceProblem = null;

            await knex.transaction(async (trx) => {
                const serviceProblemPayload = req.body;
                console.log('[controllers][service][problem]', serviceProblemPayload);

                // validate keys
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.string().required(),
                    problemId: Joi.string().required(),
                    categoryId: Joi.string().required(),
                    description: Joi.string().required()
                });

                const result = Joi.validate(serviceProblemPayload, schema);
                console.log('[controllers][service][problem]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in users table,
                const currentTime = new Date().getTime();

                const insertData = { ...serviceProblemPayload, createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][service][problem]: Insert Data', insertData);

                const problemResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('service_problems');

                serviceProblem = problemResult[0];

                trx.commit;

            });

            res.status(200).json({
                data: {
                    serviceProblem: serviceProblem
                },
                message: "Service problem added successfully !"
            });

        } catch (err) {
            console.log('[controllers][service][problem] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updateServiceRequest: async (req, res) => {
        try {

            let serviceRequest = null;

            await knex.transaction(async (trx) => {
                const serviceRequestPayload = req.body;
                console.log('[controllers][service][request]', serviceRequestPayload);

                // validate keys
                const schema = Joi.object().keys({
                    id: Joi.number().required(),
                    description: Joi.string().required(),
                    requestFor: Joi.string().required(),
                    houseId: Joi.string().required(),
                    commonId: Joi.string().required(),
                    serviceType: Joi.string().required(),
                    requestedBy: Joi.string().required(),
                    priority: Joi.string().required(),
                    location: Joi.string().required()
                });

                const result = Joi.validate(serviceRequestPayload, schema);
                console.log('[controllers][service][request]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in users table,
                const currentTime = new Date().getTime();

                const updateServiceReq = await knex.update({ description: serviceRequestPayload.description, requestFor: serviceRequestPayload.requestFor, houseId: serviceRequestPayload.houseId, commonId: serviceRequestPayload.commonId, serviceType: serviceRequestPayload.serviceType, requestedBy: serviceRequestPayload.requestedBy, priority: serviceRequestPayload.priority, location: serviceRequestPayload.location, updatedAt: currentTime, isActive: true, moderationStatus: true, serviceStatusCode: "O" }).where({ id: serviceRequestPayload.id }).returning(['*']).transacting(trx).into('service_requests');

                console.log('[controllers][service][request]: Update Data', updateServiceReq);

                serviceRequest = updateServiceReq[0];

                trx.commit;

            });

            res.status(200).json({
                data: {
                    serviceRequest: serviceRequest
                },
                message: "Service request updated successfully !"
            });

        } catch (err) {
            console.log('[controllers][service][request] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updateImages: async (req, res) => {
        try {

            let serviceRequest = null;

            await knex.transaction(async (trx) => {
                const imagesPayload = req.body;
                console.log('[controllers][service][images]', imagesPayload);






            });


        } catch (err) {
            console.log('[controllers][service][request] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getImageUploadUrl: async (req, res) => {
        try {

        const uploadUrlData =  await getUploadURL();

        res.status(200).json({
            data: {
                uploadUrlData: uploadUrlData
            },
            message: "Upload Url generated succesfully!"
        });

        } catch (err) {
            console.log('[controllers][service][getImageUploadUrl] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
};

module.exports = serviceRequestController;