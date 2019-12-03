const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');

const knex = require('../db/knex');

const bcrypt = require('bcrypt');
const XLSX = require('xlsx');
const saltRounds = 10;
//const trx = knex.transaction();


const serviceDetailsController = {
    addPriorities: async (req, res) => {
        try {
            let Priorities = null;
            let userId = req.me.id;
            await knex.transaction(async trx => {
                const payload = req.body;

                const schema = Joi.object().keys({
                    incidentPriorityCode: Joi.string().required(),
                    descriptionThai: Joi.string().required(),
                    descriptionEng: Joi.string().required()
                });

                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][administrationFeatures][addPrioritites]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                let currentTime = new Date().getTime();
                let insertData = {
                    ...payload,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime
                };
                let insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("incident_priority");
                Priorities = insertResult[0];

                trx.commit;
            });

            return res.status(200).json({
                data: {
                    priorities: Priorities
                },
                message: "Priorities added successfully."
            });
        } catch (err) {
            console.log("[controllers][generalsetup][addPriorities] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    updatePriorities: async (req, res) => {
        try {
            let Priorities = null;
            await knex.transaction(async trx => {
                const payload = req.body;

                const schema = Joi.object().keys({
                    id: Joi.string().required(),
                    incidentPriorityCode: Joi.string().required(),
                    descriptionThai: Joi.string().required(),
                    descriptionEng: Joi.string().required()
                });

                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][administrationFeatures][updatePriorities]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                let currentTime = new Date().getTime();
                let insertData = { ...payload, updatedAt: currentTime };
                let insertResult = await knex
                    .update(insertData)
                    .where({ id: payload.id })
                    .returning(["*"])
                    .transacting(trx)
                    .into("incident_priority");
                    Priorities = insertResult[0];

                trx.commit;
            });

            return res.status(200).json({
                data: {
                    Priorities: Priorities
                },
                message: "Priorities details updated successfully."
            });
        } catch (err) {
            console.log("[controllers][generalsetup][updatePriorities] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    viewPriorities: async (req, res) => {
        try {
            let Priorities = null;
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    id: Joi.string().required()
                });
                const result = Joi.validate(payload, schema);
                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }
                let current = new Date().getTime();
                let PrioritiesResult = await knex("incident_priority")
                    .select("incident_priority.*")
                    .where({ "id": payload.id })

                    Priorities = _.omit(PrioritiesResult[0], [
                    "createdAt",
                    "updatedAt",
                    "isActive"
                ]);
                trx.commit;
            });


            return res.status(200).json({
                data: {
                    Priorities: Priorities
                },
                message: "Priorities details"
            });
        } catch (err) {
            console.log("[controllers][generalsetup][viewPriorities] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    addLocationTag: async (req, res) => {
        try {
            let LocationTag = null;
            let userId = req.me.id;
            await knex.transaction(async trx => {
                const payload = req.body;

                const schema = Joi.object().keys({
                    title: Joi.string().required(),
                    descriptionThai: Joi.string().required(),
                    descriptionEng: Joi.string().required()
                });

                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][administrationFeatures][addLocation]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                let currentTime = new Date().getTime();
                let insertData = {
                    ...payload,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime
                };
                let insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("location_tags_master");
                LocationTag = insertResult[0];

                trx.commit;
            });

            return res.status(200).json({
                data: {
                    locationTag: LocationTag
                },
                message: "LocationTag added successfully."
            });
        } catch (err) {
            console.log("[controllers][generalsetup][addLocationTag] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    updateLocationTag: async (req, res) => {
        try {
            let LocationTag = null;
            await knex.transaction(async trx => {
                const payload = req.body;

                const schema = Joi.object().keys({
                    id: Joi.string().required(),
                    title: Joi.string().required(),
                    descriptionThai: Joi.string().required(),
                    descriptionEng: Joi.string().required()
                });

                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][administrationFeatures][updatePriorities]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                let currentTime = new Date().getTime();
                let insertData = { ...payload, updatedAt: currentTime };
                let insertResult = await knex
                    .update(insertData)
                    .where({ id: payload.id })
                    .returning(["*"])
                    .transacting(trx)
                    .into("location_tags_master");
                    LocationTag = insertResult[0];

                trx.commit;
            });

            return res.status(200).json({
                data: {
                    LocationTag: LocationTag
                },
                message: "Location Tag details updated successfully."
            });
        } catch (err) {
            console.log("[controllers][generalsetup][LocationTag] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    viewLocationTag: async (req, res) => {
        try {
            let LocationTag = null;
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    id: Joi.string().required()
                });
                const result = Joi.validate(payload, schema);
                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }
                let current = new Date().getTime();
                let LocationTagResult = await knex("location_tags_master")
                    .select("location_tags_master.*")
                    .where({ "id": payload.id })

                    LocationTag = _.omit(LocationTagResult[0], [
                    "createdAt",
                    "updatedAt",
                    "isActive"
                ]);
                trx.commit;
            });

            return res.status(200).json({
                data: {
                    LocationTag: LocationTag
                },
                message: "Location Tag details"
            });
        } catch (err) {
            console.log("[controllers][generalsetup][viewLocationTag] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getGeneralDetails: async (req, res) => {

        try {

            let generalDetails = null;
            let DataResult = null;

            await knex.transaction(async (trx) => {

                // Insert in users table,
                const incidentTypePayload = req.body;

                DataResult = await knex('property_units')
                    .join('companies', 'property_units.companyId', '=', 'companies.id')
                    .join('projects', 'property_units.projectId', '=', 'projects.id')
                    .join('property_types', 'property_units.propertyTypeId', '=', 'property_types.id')
                    .join('buildings_and_phases', 'property_units.buildingPhaseId', '=', 'buildings_and_phases.id')
                    .join('floor_and_zones', 'property_units.floorZoneId', '=', 'floor_and_zones.id')
                    .select('companies.companyName', 'projects.projectName', 'property_types.propertyType', 'buildings_and_phases.buildingPhaseCode', 'floor_and_zones.floorZoneCode', 'property_units.*')
                    .where({ 'property_units.houseId': incidentTypePayload.houseId });

                console.log('[controllers][servicedetails][generaldetails]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                DataResult = _.omit(DataResult[0], ['companyId'], ['projectId'], ['propertyTypeId'], ['buildingPhaseId'], ['floorZoneId']);

                generalDetails = DataResult;

                trx.commit;
            });

            res.status(200).json({
                data: {
                    generalDetails: generalDetails
                },
                message: "General details list successfully !"
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
    getLocationTags: async (req, res) => {

        try {

            let locationTags = null;
            let reqData = req.query;
            //let filters = req.body;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            // await knex.transaction(async (trx) => {

            // Get Location Tag List,               
            //const DataResult = await knex('location_tags_master').where({ isActive: 'true' });

            [total, rows] = await Promise.all([
                knex.count('* as count').from("location_tags_master").first(),
                knex("location_tags_master")
                    .select([
                        'id as ID',
                        'title as Location Tag',
                        'descriptionEng as Description English',
                        'descriptionThai as Description Thai',
                        'isActive as Status',
                        'createdAt as Date Created'
                    ])
                    .offset(offset).limit(per_page)
            ])


            let count = total.count;
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
                    location_tags: pagination
                },
                message: 'Location Tags List!'
            })
            //console.log('[controllers][servicedetails][locationtags]: View Data', DataResult);

            //locationTags = DataResult;

            //trx.commit;
            //});

            // res.status(200).json({
            //     data: {
            //         locationTags: locationTags
            //     },
            //     message: "Location Tags list successfully !"
            // });


        } catch (err) {
            console.log('[controllers][servicedetails][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceType: async (req, res) => {

        try {

            let sourceRequest = null;

            await knex.transaction(async (trx) => {

                // Get Location Tag List,               
                const DataResult = await knex('source_of_request').where({ isActive: 'true' });

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

                // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][servicedetails][sourcerequest]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                sourceRequest = DataResult;

                trx.commit;
            });

            res.status(200).json({
                data: {
                    sourceRequest: sourceRequest
                },
                message: "Source Of Request list successfully !"
            });


        } catch (err) {
            console.log('[controllers][servicedetails][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getPriorityList: async (req, res) => {

        try {

            let locationTags = null;
            let reqData = req.query;
            //let filters = req.body;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            // await knex.transaction(async (trx) => {

            // Get Location Tag List,               
            //const DataResult = await knex('location_tags_master').where({ isActive: 'true' });

            [total, rows] = await Promise.all([
                knex.count('* as count').from("incident_priority").first(),
                knex("incident_priority")
                    .select([
                        "id",
                        "incidentPriorityCode as Priorities",
                        "descriptionEng as Description English",
                        "descriptionThai as Description Thai",
                        'isActive as Status',
                        'createdBy as Created By',
                        'createdAt as Date Created'
                    ])
                    .offset(offset).limit(per_page)
            ])


            let count = total.count;
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
                    priorities: pagination
                },
                message: 'Priorities List!'
            })
            //console.log('[controllers][servicedetails][locationtags]: View Data', DataResult);

            //locationTags = DataResult;

            //trx.commit;
            //});

            // res.status(200).json({
            //     data: {
            //         locationTags: locationTags
            //     },
            //     message: "Location Tags list successfully !"
            // });


        } catch (err) {
            console.log('[controllers][servicedetails][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceRequestList: async (req, res) => {

        try {

            let serviceRequestList = null;

            await knex.transaction(async (trx) => {

                // Get Location Tag List,               
                const DataResult = await knex('service_requests').where({ isActive: 'true', moderationStatus: 'true' });

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

                // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][servicedetails][serviceRequestList]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                serviceRequestList = DataResult;

                trx.commit;
            });

            res.status(200).json({
                data: {
                    serviceRequestList: serviceRequestList
                },
                message: "Service Request List Successfully !"
            });


        } catch (err) {
            console.log('[controllers][servicedetails][serviceRequestList] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    viewServiceRequestDetails: async (req, res) => {

        try {

            let serviceRequestDetails = null;
            let generalResult = null;
            let problemResult = null;
            let problemImages = null;
            await knex.transaction(async (trx) => {
                const viewRequestPayload = req.body;
                console.log('[controllers][servicedetails][viewrequest]', viewRequestPayload);

                // Get Location Tag List,               
                const DataResult = await knex('service_requests').where({ id: viewRequestPayload.serviceRequestId, isActive: 'true', moderationStatus: 'true' });

                console.log('[controllers][servicedetails][serviceRequestDetails]: View House Id', DataResult[0].houseId);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                serviceRequestDetails = DataResult[0];

                // General Details

                generalResult = await knex('property_units').join('companies', 'property_units.companyId', '=', 'companies.id').join('projects', 'property_units.projectId', '=', 'projects.id').join('property_types', 'property_units.propertyTypeId', '=', 'property_types.id').join('buildings_and_phases', 'property_units.buildingPhaseId', '=', 'buildings_and_phases.id').join('floor_and_zones', 'property_units.floorZoneId', '=', 'floor_and_zones.id').select('companies.companyName', 'projects.projectName', 'property_types.propertyType', 'buildings_and_phases.buildingPhaseCode', 'floor_and_zones.floorZoneCode', 'property_units.*').where({ 'property_units.houseId': DataResult[0].houseId });

                console.log('[controllers][servicedetails][serviceRequestDetails]: View Data', generalResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                generalResult = _.omit(generalResult[0], ['id'], ['area'], ['description'], ['productCode'], ['createdBy'], ['isActive'], ['updatedAt'], ['createdAt'], ['companyId'], ['projectId'], ['propertyTypeId'], ['buildingPhaseId'], ['floorZoneId']);

                serviceRequestDetails.generalDetails = generalResult;

                // Problems Details

                problemResult = await knex('service_problems').join('incident_categories', 'service_problems.categoryId', '=', 'incident_categories.id').join('incident_sub_categories', 'service_problems.problemId', '=', 'incident_sub_categories.id').select('incident_categories.descriptionEng as category', 'incident_sub_categories.descriptionEng as subcategory', 'service_problems.*').where({ 'service_problems.serviceRequestId': DataResult[0].id });

                console.log('[controllers][servicedetails][serviceProblemDetails]: View Data', problemResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                problemResult = _.omit(problemResult[0], ['id'], ['createdAt'], ['problemId'], ['categoryId'], ['serviceRequestId'], ['updatedAt']);

                serviceRequestDetails.problemDetails = problemResult;


                // Problems Images

                problemImages = await knex('images').join('service_problems', 'images.entityId', '=', 'service_problems.id').select('images.s3Url').where({ 'images.entityType': 'service_problems' });

                console.log('[controllers][servicedetails][images]: View Data', problemResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                // problemResult = _.omit(problemResult[0],['id'],['createdAt'],['problemId'],['categoryId'],['serviceRequestId'],['updatedAt']);

                serviceRequestDetails.problemDetails.images = problemImages;

                trx.commit;
            });

            res.status(200).json({
                data: {
                    serviceRequestDetails: serviceRequestDetails
                },
                message: "Service Request List Successfully !"
            });


        } catch (err) {
            console.log('[controllers][servicedetails][serviceRequestDetails] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }, exportLocationTags: async (req, res) => {
        try {

            let locationTags = null;
            let reqData = req.query;
            //let filters = req.body;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            // await knex.transaction(async (trx) => {

            // Get Location Tag List,               
            //const DataResult = await knex('location_tags_master').where({ isActive: 'true' });

            [total, rows] = await Promise.all([
                knex.count('* as count').from("location_tags_master").where({ isActive: true }).first(),
                knex.select("*").from("location_tags_master").offset(offset).limit(per_page)
            ])


            var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
            var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: 'base64' })
            let filename = "uploads/LocationTagsData-" + Date.now() + ".csv";
            let check = XLSX.writeFile(wb, filename);

            return res.status(200).json({
                data: rows,
                message: 'Location Tags Data Export Successfully!'
            })


        } catch (err) {
            console.log('[controllers][servicedetails][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
};

module.exports = serviceDetailsController;