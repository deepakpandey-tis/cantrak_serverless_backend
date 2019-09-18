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

if (process.env.IS_OFFLINE) {
    AWS.config.update({
        accessKeyId: 'S3RVER',
        secretAccessKey: 'S3RVER',
    });
}

AWS.config.update({ region: process.env.REGION || 'us-east-2' });


const getUploadURL = async (mimeType, filename) => {
    let re = /(?:\.([^.]+))?$/;
    let ext = re.exec(filename)[1];
    const actionId = uuidv4();
    const s3Params = {
        Bucket: 'local-bucket',
        Key: `${actionId}.${ext}`,
        ContentType: mimeType,
        ACL: 'public-read',
    };
    return new Promise(async (resolve, reject) => {
        const s3 = new AWS.S3();
        let uploadURL = await s3.getSignedUrl('putObject', s3Params);
        if (Boolean(process.env.IS_OFFLINE)) {
            uploadURL = uploadURL.replace("https://", "http://").replace(".com", ".com:8000");
        }
        resolve({
            "isBase64Encoded": false,
            "headers": { "Access-Control-Allow-Origin": "*" },
            "uploadURL": uploadURL,
            "photoFilename": `${actionId}.${ext}`
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
        const mimeType = req.body.mimeType;
        const filename = req.body.filename;
        try {

            const uploadUrlData = await getUploadURL(mimeType, filename);

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
    },
    addServiceRequestPart: async (req, res) => {
        try {
            let assignedPart = null;

            await knex.transaction(async trx => {

                let assignedPartPayload = req.body;
                let schema = Joi.object().keys({
                    partId: Joi.string().required(),
                    unitCost: Joi.string().required(),
                    quantity: Joi.string().required(),
                    status: Joi.string().required(),
                    serviceRequestId: Joi.string().required()
                })


                let result = Joi.validate(assignedPartPayload, schema)
                console.log('[controllers][service][request]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in assigned_parts table,
                const currentTime = new Date().getTime();

                let assignedPartInsertPayload = _.omit(assignedPartPayload, ['serviceRequestId'])

                let insertData = { ...assignedPartInsertPayload, entityId: assignedPartPayload.serviceRequestId, entityType: 'service_requests', createdAt: currentTime, updatedAt: currentTime }
                let partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_parts')
                assignedPart = partResult[0]
                trx.commit

            })
            res.status(200).json({
                data: {
                    assignedPart: assignedPart
                },
                message: "Part added to Service request successfully !"
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
    addServiceRequestAsset: async (req, res) => {
        try {
            let assignedAsset = null;

            await knex.transaction(async trx => {

                let assignedAssetPayload = req.body;
                let schema = Joi.object().keys({
                    assetId: Joi.string().required(),
                    price: Joi.string().required(),
                    status: Joi.string().required(),
                    serviceRequestId: Joi.string().required()
                })


                let result = Joi.validate(assignedAssetPayload, schema)
                console.log('[controllers][service][request]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in assigned_parts table,
                const currentTime = new Date().getTime();

                let assignedAssetInsertPayload = _.omit(assignedAssetPayload, ['serviceRequestId'])

                let insertData = { ...assignedAssetInsertPayload, entityId: assignedAssetPayload.serviceRequestId, entityType: 'service_requests', createdAt: currentTime, updatedAt: currentTime }
                let assetResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_assets')
                assignedAsset = assetResult[0]
                trx.commit

            })
            res.status(200).json({
                data: {
                    assignedAsset: assignedAsset
                },
                message: "Asset added to Service request successfully !"
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
    deleteServiceRequestPart: async (req, res) => {
        try {
            let serviceRequest = null;
            let partResult = null;
            await knex.transaction(async trx => {

                let currentTime = new Date().getTime()
                const partPayload = req.body;
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.string().required(),
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
                let serviceRequestResult = await knex.select().where({ id: partPayload.serviceRequestId }).returning(['*']).transacting(trx).into('service_requests')

                serviceRequest = serviceRequestResult[0]
                if (String(serviceRequest.serviceStatusCode).toUpperCase() === 'CMTD') {
                    // Now soft delete and return
                    let updatedPart = await knex.update({ status: 'CMTD', updatedAt: currentTime }).where({ partId: partPayload.partId, entityId: partPayload.serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_parts')
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
                    message: 'Part status for this service request can not be updated because this service order is not completed yet.'
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
    },
    deleteServiceRequestAsset: async (req, res) => {
        try {
            let serviceOrder = null;
            let partResult = null;
            await knex.transaction(async trx => {

                let currentTime = new Date().getTime()
                const assetPayload = req.body;
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.string().required(),
                    assetId: Joi.string().required()
                })

                let result = Joi.validate(assetPayload, schema)
                console.log('[controllers][service][order]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Now, check whether this service order is completed or not. If completed, we will soft delete the asset from assigned_parts table
                let serviceRequestResult = await knex.select().where({ id: assetPayload.serviceRequestId }).returning(['*']).transacting(trx).into('service_requests')

                serviceRequest = serviceRequestResult[0]
                if (String(serviceRequest.serviceStatusCode).toUpperCase() === 'CMTD') {
                    // Now soft delete and return
                    let updatedAsset = await knex.update({ status: 'CMTD', updatedAt: currentTime }).where({ assetId: assetPayload.assetId, entityId: assetPayload.serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_assets')
                    //partResult = updatedPartResult[0]
                    trx.commit;
                    return res.status(200).json({
                        data: {
                            updatedAsset: updatedAsset
                        },
                        message: "Assigned asset status updated successfully !"
                    });

                }
                trx.commit
                return res.status(200).json({
                    data: {
                        updatedAsset: null
                    },
                    message: 'Asset status for this service order can not be updated because this service order is not completed yet.'
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
};

module.exports = serviceRequestController;