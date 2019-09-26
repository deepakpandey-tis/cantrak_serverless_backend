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
                    location: Joi.string().required(),
                    recurrenceType: Joi.string().required(),
                    serviceDate: Joi.array().required()
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

                // Insert in service request table,
                const currentTime = new Date().getTime();

                const updateServiceReq = await knex.update({ description: serviceRequestPayload.description, requestFor: serviceRequestPayload.requestFor, houseId: serviceRequestPayload.houseId, commonId: serviceRequestPayload.commonId, serviceType: serviceRequestPayload.serviceType, requestedBy: serviceRequestPayload.requestedBy, priority: serviceRequestPayload.priority, location: serviceRequestPayload.location, updatedAt: currentTime, isActive: true, moderationStatus: true, serviceStatusCode: "O" }).where({ id: serviceRequestPayload.id }).returning(['*']).transacting(trx).into('service_requests');

                console.log('[controllers][service][request]: Update Data', updateServiceReq);

                serviceRequest = updateServiceReq[0];
                serviceOrders = [];
                // Insert into service orders table with selected recrence date
                let dates = serviceRequestPayload.serviceDate;
                console.log("dates", dates);
                let countDates = dates.length;
                console.log("countDates", countDates);

                for (i = 0; i < countDates; i++) {
                    let newdate = dates[i].split("-").reverse().join("-");
                    let serviceDateExist = await knex('service_orders').where({ orderDueDate: newdate });
                    if (serviceDateExist <= 0) {
                        let serviceOrderResult = await knex.insert({ serviceRequestId: serviceRequestPayload.id, recurrenceType: serviceRequestPayload.recurrenceType, orderDueDate: newdate, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('service_orders')
                        serviceOrders.push(serviceOrderResult[0]);
                    }
                }
                trx.commit;

            });

            let returnResponse = { serviceRequest, 'serviceOrder': serviceOrders };

            res.status(200).json({
                data: {
                    response: returnResponse
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
    },
    getServiceRequestList: async (req, res) => {
        // We will get service request list 
        try {

            let reqData = req.query;
            let { description,
                completedOn,
                serviceFrom,
                serviceTo,
                id,
                location,
                serviceStatus } = req.body;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let filters = {}
            if (description) {
                filters['service_requests.description'] = description
            }

            // completedOn -> null means due
            // serviceFrom -serviceTo = createdAt


            if (id) {
                filters['service_requests.id'] = id
            }
            if (location) {
                filters['service_requests.location'] = location
            }
            if (serviceStatus) {
                filters['service_requests.serviceStatusCode'] = serviceStatus
            }

            let serviceFromDate, serviceToDate
            if (serviceFrom && serviceTo) {

                serviceFromDate = new Date(serviceFrom).getTime();
                serviceToDate = new Date(serviceTo).getTime();

            } else if (serviceFrom && !serviceTo) {

                serviceFromDate = new Date(serviceFrom).getTime();
                serviceToDate = new Date("2030-01-01").getTime()

            } else if (!serviceFrom && serviceTo) {
                serviceFromDate = new Date("2000-01-01").getTime();
                serviceToDate = new Date(serviceTo).getTime()
            }


            if (completedOn) {
                filters['service_requests.completedOn'] = completedOn
            }



            if (_.isEmpty(filters)) {
                [total, rows] = await Promise.all([
                    knex.count('* as count').from("service_requests")
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .select([
                            'service_requests.id as sr_id', 'service_requests.description as sr_description',

                            'service_requests.requestedBy as requestedBy',
                            'service_problems.description as sp_description',
                            'categoryId', 'problemId',
                            'incident_categories.id as categoryId',
                            'incident_categories.descriptionEng as problem'
                        ]).groupBy(["service_requests.id", "service_problems.id", 'incident_categories.id']),
                    knex.from("service_requests")
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .select([
                            'service_requests.id as sr_id', 'service_requests.description as sr_description',

                            'service_requests.requestedBy as requestedBy',
                            'service_problems.description as sp_description',
                            'categoryId', 'problemId',
                            'incident_categories.id as categoryId',
                            'incident_categories.descriptionEng as problem'
                        ]).offset(offset).limit(per_page)
                ])
            } else {
                //console.log('IN else: ')
                //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
                [total, rows] = await Promise.all([
                    knex.count('* as count').from("service_requests")
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .select([
                            'service_requests.id as sr_id', 'service_requests.description as sr_description',

                            'service_requests.requestedBy as requestedBy',
                            'service_problems.description as sp_description',
                            'categoryId', 'problemId',
                            'incident_categories.id as categoryId',
                            'incident_categories.descriptionEng as problem'
                        ]).where((qb) => {
                            qb.where(filters)
                            if (serviceFromDate && serviceToDate) {
                                qb.whereBetween('service_requests.createdAt', [serviceFromDate, serviceToDate])
                            }

                        }).groupBy(["service_requests.id", "service_problems.id", 'incident_categories.id']),
                    knex.from("service_requests")
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .select([
                            'service_requests.id as sr_id', 'service_requests.description as sr_description',

                            'service_requests.requestedBy as requestedBy',
                            'service_problems.description as sp_description',
                            'categoryId', 'problemId',
                            'incident_categories.id as categoryId',
                            'incident_categories.descriptionEng as problem'
                        ]).where((qb) => {
                            qb.where(filters)
                            if (serviceFromDate && serviceToDate) {
                                qb.whereBetween('service_requests.createdAt', [serviceFromDate, serviceToDate])
                            }
                        }).offset(offset).limit(per_page)
                ])

            }

            let count = total.length;
            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + rows.length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;
            pagination.data = rows;

            return res.status(200).json({
                data: {
                    service_requests: pagination
                },
                message: 'Service Request List!'
            })
        } catch (err) {
            console.log('[controllers][service][request] :  Error', err);
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }

    }
};

module.exports = serviceRequestController;