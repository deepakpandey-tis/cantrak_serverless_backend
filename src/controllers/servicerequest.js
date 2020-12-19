const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");

const knex = require("../db/knex");


const AWS = require("aws-sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const https = require("https");

const imageHelper = require("../helpers/image");





const serviceRequestController = {
    addServiceRequest: async (req, res) => {
        try {
            let serviceRequestId = null;

            await knex.transaction(async trx => {
                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                const insertData = {
                    moderationStatus: false,
                    orgId: req.orgId,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    serviceStatusCode: 'O'
                };

                console.log(
                    "[controllers][service][requestId]: Insert Data",
                    insertData
                );

                const serviceResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_requests");

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
            console.log("[controllers][service][requestId] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    addServiceProblems: async (req, res) => {
        try {
            let serviceProblem = null;
            let images = null;

            await knex.transaction(async trx => {
                let orgId = req.orgId;
                const serviceProblemPayload = _.omit(req.body, ["images"]);
                let payload = req.body;
                console.log("[controllers][service][problem]", serviceProblemPayload);

                // validate keys
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.string().required(),
                    problemId: Joi.string().required(),
                    categoryId: Joi.string().required(),
                    description: Joi.string().allow("").optional(),
                    images: Joi.array().items(Joi.object().keys().min(1))
                });

                const result = Joi.validate(serviceProblemPayload, schema);
                console.log("[controllers][service][problem]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Insert in users table,
                const currentTime = new Date().getTime();

                const insertData = {
                    ...serviceProblemPayload,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    orgId: orgId
                };

                console.log("[controllers][service][problem]: Insert Data", insertData);

                const problemResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_problems");

                serviceProblem = problemResult[0];

                // Add to images with serviceRequestId and service_requests
                if (req.body.images && req.body.images.length) {
                    let imagesData = req.body.images;
                    for (image of imagesData) {
                        let d = await knex
                            .insert({
                                entityId: payload.serviceRequestId,
                                ...image,
                                entityType: "service_problems",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("images");
                        //images.push(d[0])
                    }

                    // images = req.body.images.map(image => ({
                    //   ...image,
                    //   createdAt: currentTime,
                    //   updatedAt: currentTime,
                    //   entityId: serviceProblem.id,
                    //   entityType: "service_problems"
                    // }));
                    // let addedImages = await knex
                    //   .insert(images)
                    //   .returning(["*"])
                    //   .transacting(trx)
                    //   .into("images");
                    // images = addedImages;
                }

                trx.commit;
            });

            res.status(200).json({
                data: {
                    serviceProblem: { ...serviceProblem, images }
                },
                message: "Service problem added successfully !"
            });
        } catch (err) {
            console.log("[controllers][service][problem] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    // updateServiceRequest: async (req, res) => {
    //   try {
    //     let serviceRequest = null;
    //     let images = null;

    //     await knex.transaction(async trx => {
    //       const serviceRequestPayload = _.omit(req.body, ["images"]);
    //       images = req.body.images;
    //       console.log("[controllers][service][request]", serviceRequestPayload);

    //       // validate keys
    //       const schema = Joi.object().keys({
    //         id: Joi.number().required(),
    //         description: Joi.string().required(),
    //         requestFor: Joi.string().required(),
    //         houseId: Joi.string().required(),
    //         commonId: Joi.string().required(),
    //         serviceType: Joi.string().required(),
    //         requestedBy: Joi.string().required(),
    //         priority: Joi.string().required(),
    //         location: Joi.string().required(),
    //         recurrenceType: Joi.string().required(),
    //         serviceDate: Joi.array().required()
    //       });

    //       const result = Joi.validate(serviceRequestPayload, schema);
    //       console.log("[controllers][service][request]: JOi Result", result);

    //       if (result && result.hasOwnProperty("error") && result.error) {
    //         return res.status(400).json({
    //           errors: [
    //             { code: "VALIDATION_ERROR", message: result.error.message }
    //           ]
    //         });
    //       }

    //       // Insert in service request table,
    //       const currentTime = new Date().getTime();

    //       const updateServiceReq = await knex
    //         .update({
    //           description: serviceRequestPayload.description,
    //           requestFor: serviceRequestPayload.requestFor,
    //           houseId: serviceRequestPayload.houseId,
    //           commonId: serviceRequestPayload.commonId,
    //           serviceType: serviceRequestPayload.serviceType,
    //           requestedBy: serviceRequestPayload.requestedBy,
    //           priority: serviceRequestPayload.priority,
    //           location: serviceRequestPayload.location,
    //           updatedAt: currentTime,
    //           createdBy: req.me.id,
    //           isActive: true,
    //           moderationStatus: true,
    //           serviceStatusCode: "O"
    //         })
    //         .where({ id: serviceRequestPayload.id })
    //         .returning(["*"])
    //         .transacting(trx)
    //         .into("service_requests");

    //       console.log(
    //         "[controllers][service][request]: Update Data",
    //         updateServiceReq
    //       );

    //       serviceRequest = updateServiceReq[0];
    //       serviceOrders = [];

    //       //
    //       if (images && images.length) {
    //         images = req.body.images.map(image => ({
    //           ...image,
    //           createdAt: currentTime,
    //           updatedAt: currentTime,
    //           entityId: serviceRequestPayload.id,
    //           entityType: "service_requests"
    //         }));
    //         let addedImages = await knex
    //           .insert(images)
    //           .returning(["*"])
    //           .transacting(trx)
    //           .into("images");
    //         images = addedImages;
    //       }

    //       // Insert into service orders table with selected recrence date
    //       let dates = serviceRequestPayload.serviceDate;
    //       console.log("dates", dates);
    //       let countDates = dates.length;
    //       console.log("countDates", countDates);

    //       for (i = 0; i < countDates; i++) {
    //         let newdate = dates[i]
    //           .split("-")
    //           .reverse()
    //           .join("-");
    //         let serviceDateExist = await knex("service_orders").where({
    //           orderDueDate: newdate
    //         });
    //         if (serviceDateExist <= 0) {
    //           let serviceOrderResult = await knex
    //             .insert({
    //               serviceRequestId: serviceRequestPayload.id,
    //               recurrenceType: serviceRequestPayload.recurrenceType,
    //               orderDueDate: newdate,
    //               createdAt: currentTime,
    //               updatedAt: currentTime
    //             })
    //             .returning(["*"])
    //             .transacting(trx)
    //             .into("service_orders");
    //           serviceOrders.push(serviceOrderResult[0]);
    //         }
    //       }
    //       trx.commit;
    //     });

    //     let returnResponse = { serviceRequest, serviceOrder: serviceOrders };

    //     res.status(200).json({
    //       data: {
    //         response: { ...returnResponse, serviceRequestImages: images }
    //       },
    //       message: "Service request updated successfully !"
    //     });
    //   } catch (err) {
    //     console.log("[controllers][service][request] :  Error", err);
    //     //trx.rollback
    //     res.status(500).json({
    //       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
    //     });
    //   }
    // },
    updateImages: async (req, res) => {
        try {
            let serviceRequest = null;

            await knex.transaction(async trx => {
                const imagesPayload = req.body;
                console.log("[controllers][service][images]", imagesPayload);
            });
        } catch (err) {
            console.log("[controllers][service][request] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getImageUploadUrl: async (req, res) => {
        const mimeType = req.body.mimeType;
        const filename = req.body.filename;
        const type = req.body.type;
        try {
            const uploadUrlData = await imageHelper.getUploadURL(mimeType, filename, type);

            res.status(200).json({
                data: {
                    uploadUrlData: uploadUrlData
                },
                message: "Upload Url generated successfully!"
            });
        } catch (err) {
            console.log("[controllers][service][getImageUploadUrl] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
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
                });

                let result = Joi.validate(assignedPartPayload, schema);
                console.log("[controllers][service][request]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Insert in assigned_parts table,
                const currentTime = new Date().getTime();

                let assignedPartInsertPayload = _.omit(assignedPartPayload, [
                    "serviceRequestId"
                ]);

                let insertData = {
                    ...assignedPartInsertPayload,
                    entityId: assignedPartPayload.serviceRequestId,
                    entityType: "service_requests",
                    createdAt: currentTime,
                    updatedAt: currentTime
                };
                let partResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("assigned_parts");
                assignedPart = partResult[0];
                trx.commit;
            });
            res.status(200).json({
                data: {
                    assignedPart: assignedPart
                },
                message: "Part added to Service request successfully !"
            });
        } catch (err) {
            console.log("[controllers][service][request] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
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
                });

                let result = Joi.validate(assignedAssetPayload, schema);
                console.log("[controllers][service][request]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }
                const currentTime = new Date().getTime();


                // CHANGE ASSET LOCATION OPEN

                const sr = await knex('service_requests').select('houseId').where({ id: req.body.serviceRequestId }).first()
                let ids = null
                if (sr) {
                    ids = await knex('property_units').select(['companyId', 'projectId', 'buildingPhaseId', 'floorZoneId', 'houseId']).where({ id: sr.houseId }).first()
                }

                await knex('asset_location').insert({ assetId: req.body.assetId, companyId: ids.companyId, projectId: ids.projectId, buildingId: ids.buildingPhaseId, floorId: ids.floorZoneId, houseId: ids.houseId, unitId: sr.houseId, orgId: req.orgId, startDate: currentTime, serviceRequestId: req.body.serviceRequestId })

                // CHANGE ASSET LOCATION END

                // Insert in assigned_parts table,

                let assignedAssetInsertPayload = _.omit(assignedAssetPayload, [
                    "serviceRequestId"
                ]);

                let insertData = {
                    ...assignedAssetInsertPayload,
                    entityId: assignedAssetPayload.serviceRequestId,
                    entityType: "service_requests",
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    orgId: req.orgId
                };
                let assetResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("assigned_assets");
                assignedAsset = assetResult[0];
                trx.commit;
            });
            return res.status(200).json({
                data: {
                    assignedAsset: assignedAsset
                },
                message: "Asset added to Service request successfully !"
            });
        } catch (err) {
            console.log("[controllers][service][request] :  Error", err);
            //trx.rollback
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    deleteServiceRequestPart: async (req, res) => {
        try {
            let serviceRequest = null;
            let partResult = null;
            await knex.transaction(async trx => {
                let currentTime = new Date().getTime();
                const partPayload = req.body;
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.string().required(),
                    partId: Joi.string().required()
                });

                let result = Joi.validate(partPayload, schema);
                console.log("[controllers][service][order]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Now, check whether this service order is completed or not. If completed, we will soft delete the part from assigned_parts table
                let serviceRequestResult = await knex
                    .select()
                    .where({ id: partPayload.serviceRequestId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_requests");

                serviceRequest = serviceRequestResult[0];
                if (String(serviceRequest.serviceStatusCode).toUpperCase() === "CMTD") {
                    // Now soft delete and return
                    let updatedPart = await knex
                        .update({ status: "CMTD", updatedAt: currentTime })
                        .where({
                            partId: partPayload.partId,
                            entityId: partPayload.serviceRequestId,
                            entityType: "service_requests"
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("assigned_parts");
                    //partResult = updatedPartResult[0]
                    trx.commit;
                    return res.status(200).json({
                        data: {
                            updatedPart: updatedPart
                        },
                        message: "Assigned part status updated successfully !"
                    });
                }
                trx.commit;
                return res.status(200).json({
                    data: {
                        updatedPart: null
                    },
                    message: "Part status for this service request can not be updated because this service order is not completed yet."
                });
            });
        } catch (err) {
            console.log("[controllers][service][order] :  Error", err);
            //trx.rollback
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    deleteServiceRequestAsset: async (req, res) => {
        try {
            let serviceOrder = null;
            let partResult = null;
            await knex.transaction(async trx => {
                let currentTime = new Date().getTime();
                const assetPayload = req.body;
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.string().required(),
                    assetId: Joi.string().required()
                });

                let result = Joi.validate(assetPayload, schema);
                console.log("[controllers][service][order]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Now, check whether this service order is completed or not. If completed, we will soft delete the asset from assigned_parts table
                let serviceRequestResult = await knex
                    .select()
                    .where({ id: assetPayload.serviceRequestId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_requests");

                serviceRequest = serviceRequestResult[0];
                if (String(serviceRequest.serviceStatusCode).toUpperCase() === "CMTD") {
                    // Now soft delete and return
                    let updatedAsset = await knex
                        .update({ status: "CMTD", updatedAt: currentTime })
                        .where({
                            assetId: assetPayload.assetId,
                            entityId: assetPayload.serviceRequestId,
                            entityType: "service_requests"
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("assigned_assets");
                    //partResult = updatedPartResult[0]
                    trx.commit;
                    return res.status(200).json({
                        data: {
                            updatedAsset: updatedAsset
                        },
                        message: "Assigned asset status updated successfully !"
                    });
                }
                trx.commit;
                return res.status(200).json({
                    data: {
                        updatedAsset: null
                    },
                    message: "Asset status for this service order can not be updated because this service order is not completed yet."
                });
            });
        } catch (err) {
            console.log("[controllers][service][order] :  Error", err);
            //trx.rollback
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceRequestList: async (req, res) => {
        // We will get service request list
        try {

            let reqData = req.query;
            let {
                assignedTo,
                closingDate,
                completedBy,
                description,
                dueDateFrom,
                dueDateTo,
                location,
                priority,
                requestedBy,
                serviceFrom,
                serviceId,
                serviceTo,
                serviceType,
                status,
                unit,
                company,
                project
            } = req.body;
            let total, rows;
            console.log("service request list===", req.body)

            //console.log('USER**************************************',req.userProjectResources)
            const accessibleProjects = req.userProjectResources[0].projects

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let filters = {};
            if (description) {
                //filters["service_requests.description"] = description;
            }

            // completedOn -> null means due
            // serviceFrom -serviceTo = createdAt

            // Service ID
            if (serviceId) {
                filters["service_requests.id"] = serviceId;
            }

            // Location
            if (location) {
                filters["service_requests.location"] = location;
            }
            //  Service Status
            if (status) {
                filters["service_requests.serviceStatusCode"] = status;
            }

            // Service From Data & to Date
            let serviceFromDate, serviceToDate;

            const d = new Date();
            let differencesTime = d.getTimezoneOffset();

            moment.tz.setDefault(moment.tz.guess()); // now we've set the default time zone          
            let selectedTimeZone = moment().tz();
            let currentTime = moment();
            console.log("Current Time:", currentTime.format("MMMM Do YYYY, h:mm:ss a"));
            console.log("Selected Time Zone:", selectedTimeZone);


            if (serviceFrom && serviceTo) {

                // let fromDate = moment(serviceFrom).startOf('date').format();
                serviceFromDate = moment(serviceFrom).tz(selectedTimeZone).valueOf();
                let toDate = moment(serviceTo).endOf('date').format();

                serviceFromDate = serviceFrom;
                // serviceFromDate = new Date(fromDate).getTime();
                //serviceToDate = new Date(toDate).getTime();
                serviceToDate = serviceTo;
                // serviceToDate = moment(serviceTo).tz(selectedTimeZone).valueOf();

            }

            //else if (serviceFrom && !serviceTo) {
            //     // serviceFromDate = new Date(serviceFrom).getTime();
            //     serviceFromDate = moment(serviceFrom).tz(selectedTimeZone).valueOf();
            //     serviceToDate = new Date("2030-01-01").getTime();
            // } else if (!serviceFrom && serviceTo) {
            //     serviceFromDate = new Date("2000-01-01").getTime();
            //     serviceToDate = new Date(serviceTo).getTime();
            //     //serviceToDate = moment(serviceTo).tz(selectedTimeZone).valueOf();
            // }

            if (closingDate) {
                filters["service_requests.completedOn"] = closingDate;
            }

            if (priority) {
                filters["service_requests.priority"] = priority;
            }

            if (unit) {
                filters["property_units.id"] = unit;
            }

            if (serviceType) {
                filters["service_requests.serviceType"] = serviceType;
            }

            if (completedBy) {
                filters["service_requests.closedBy"] = completedBy;
            }

            if (assignedTo) {
                filters["assigned_service_team.userId"] = assignedTo;
            }

            if (requestedBy) {
                filters["service_requests.requestedBy"] = requestedBy;
            }
            if (company) {
                filters["service_requests.companyId"] = company;
            }
            if (project) {
                filters["service_requests.projectId"] = project;
            }

            let dueFrom, dueTo;
            if (dueDateFrom && dueDateTo) {
                dueFrom = new Date(dueDateFrom).getTime()
                dueTo = new Date(dueDateTo).getTime()
            }




            if (assignedTo ||
                closingDate ||
                completedBy ||
                description ||
                dueDateFrom ||
                dueDateTo ||
                location ||
                priority ||
                requestedBy ||
                serviceFrom ||
                serviceId ||
                serviceTo ||
                serviceType ||
                status ||
                unit ||
                company ||
                project) {



                [total, rows] = await Promise.all([
                    knex
                        // .count("* as count")
                        .from("service_requests")
                        .leftJoin(
                            "property_units",
                            "service_requests.houseId",
                            "property_units.id"
                        )

                        .leftJoin(
                            "assigned_service_team",
                            "service_requests.id",
                            "assigned_service_team.entityId"
                        )
                        .leftJoin(
                            "service_status AS status",
                            "service_requests.serviceStatusCode",
                            "status.statusCode"
                        )
                        .leftJoin("users as u", "service_requests.requestedBy", "u.id")
                        .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
                        .leftJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .leftJoin(
                            "requested_by",
                            "service_requests.requestedBy",
                            "requested_by.id"
                        )
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                        .leftJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")
                        .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                        .leftJoin('projects', 'service_requests.projectId', 'projects.id')

                        .select([
                            "service_requests.id as S Id",
                            "service_requests.description as Description",
                            // "incident_categories.descriptionEng as Category",
                            // "incident_sub_categories.descriptionEng as Problem",
                            "service_requests.priority as Priority",
                            // "assignUser.name as Tenant Name",
                            "status.descriptionEng as Status",
                            "property_units.unitNumber as Unit No",
                            "u.name as Requested By",
                            "service_requests.createdAt as Date Created",
                            "service_orders.id as SO Id",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",


                        ])
                        .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
                        .where({ 'service_requests.isCreatedFromSo': false })
                        .where(qb => {

                            if (serviceId) {
                                qb.where({ 'service_requests.displayId': serviceId })
                            }

                            if (location) {
                                qb.where('service_requests.location', 'iLIKE', `%${location}%`)
                            }
                            if (description) {
                                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                            }
                            if (priority) {
                                qb.where('service_requests.priority', 'iLIKE', `%${priority}%`)
                            }

                            if (unit) {
                                qb.where('property_units.id', unit)
                            }

                            if (status) {
                                qb.where('service_requests.serviceStatusCode', status)
                            }
                            if (serviceType) {
                                qb.where('service_requests.serviceType', serviceType)
                            }

                            if (serviceFromDate && serviceToDate) {
                                qb.whereBetween("service_requests.createdAt", [
                                    serviceFromDate,
                                    serviceToDate
                                ]);
                            }

                            if (requestedBy) {
                                qb.where('service_requests.requestedBy', requestedBy)
                            }

                            if (assignedTo) {

                                qb.where('assigned_service_team.userId', assignedTo)

                            }

                            if (completedBy) {
                                qb.where('service_requests.completedBy', completedBy)
                            }

                            if (company) {
                                qb.where('service_requests.companyId', company)
                            }

                            if (project) {
                                qb.where('service_requests.projectId', project)
                            }

                            // if (dueDateFrom && dueDateTo) {

                            //   console.log("dsfsdfsdfsdfsdfffffffffffffffffff=========")
                            //   qb.whereBetween("service_requests.createdAt", [
                            //     dueFrom,
                            //     dueTo
                            //   ]);
                            //   //qb.where({ closedBy: "" })
                            // }
                            //qb.where(filters);
                            qb.whereIn('service_requests.projectId', accessibleProjects)
                        })

                        .groupBy([
                            "service_requests.id",
                            "status.id",
                            "u.id",
                            "property_units.id",
                            "buildings_and_phases.id",
                            "service_problems.id",
                            "requested_by.id",
                            "assigned_service_team.id",
                            "teams.teamId",
                            "mainUsers.id",
                            "incident_categories.id",
                            // "assignUser.id",
                            // "user_house_allocation.id",
                            "service_orders.id",
                            "companies.id",
                            "projects.id"
                        ])
                        .distinct('service_requests.id'),
                    knex
                        .from("service_requests")
                        .leftJoin(
                            "property_units",
                            "service_requests.houseId",
                            "property_units.id"
                        )
                        .leftJoin(
                            "assigned_service_team",
                            "service_requests.id",
                            "assigned_service_team.entityId"
                        )
                        .leftJoin(
                            "service_status AS status",
                            "service_requests.serviceStatusCode",
                            "status.statusCode"
                        )
                        .leftJoin("users as u", "service_requests.requestedBy", "u.id")
                        .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
                        .leftJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .leftJoin(
                            "requested_by",
                            "service_requests.requestedBy",
                            "requested_by.id"
                        )
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                        .leftJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")
                        .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                        .leftJoin('projects', 'service_requests.projectId', 'projects.id')

                        .select([
                            "service_requests.id as S Id",
                            "service_requests.description as Description",
                            "service_requests.priority as Priority",
                            "status.descriptionEng as Status",
                            "property_units.unitNumber as Unit No",
                            // "assignUser.name as Tenant Name",
                            "requested_by.name as Requested By",
                            "service_requests.createdAt as Date Created",
                            "buildings_and_phases.buildingPhaseCode",
                            "buildings_and_phases.description as buildingDescription",
                            "incident_categories.descriptionEng as problemDescription",
                            "requested_by.email as requestedByEmail",
                            //"teams.teamName",
                            //"teams.teamCode",
                            //"mainUsers.name as mainUser",
                            "service_orders.id as SO Id",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",
                        ])
                        .orderBy('service_requests.id', 'desc')
                        .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
                        .where({ 'service_requests.isCreatedFromSo': false })
                        .where(qb => {

                            if (serviceId) {
                                qb.where({ 'service_requests.displayId': serviceId })
                            }

                            if (location) {
                                qb.where('service_requests.location', 'iLIKE', `%${location}%`)
                            }

                            if (description) {
                                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                            }

                            if (priority) {
                                qb.where('service_requests.priority', 'iLIKE', `%${priority}%`)
                            }

                            if (unit) {
                                qb.where('property_units.id', unit)
                            }
                            if (status) {
                                qb.where('service_requests.serviceStatusCode', status)
                            }

                            if (serviceType) {
                                qb.where('service_requests.serviceType', serviceType)
                            }

                            if (serviceFromDate && serviceToDate) {
                                qb.whereBetween("service_requests.createdAt", [
                                    serviceFromDate,
                                    serviceToDate
                                ]);
                            }

                            if (requestedBy) {
                                qb.where('service_requests.requestedBy', requestedBy)
                            }

                            if (assignedTo) {

                                qb.where('assigned_service_team.userId', assignedTo)

                            }

                            if (completedBy) {
                                qb.where('service_requests.completedBy', completedBy)
                            }

                            if (company) {
                                qb.where('service_requests.companyId', company)
                            }

                            if (project) {
                                qb.where('service_requests.projectId', project)
                            }

                            // if (dueDateFrom && dueDateTo) {
                            //   qb.whereBetween("service_requests.createdAt", [
                            //     dueFrom,
                            //     dueTo
                            //   ]);
                            //   //qb.where({ closedBy: "" })
                            // }
                            //qb.where(filters);
                            qb.whereIn('service_requests.projectId', accessibleProjects)


                        })
                        .offset(offset)
                        .limit(per_page)
                        .groupBy([
                            "service_requests.id",
                            "status.id",
                            "u.id",
                            "property_units.id",
                            "buildings_and_phases.id",
                            "service_problems.id",
                            "requested_by.id",
                            "assigned_service_team.id",
                            "teams.teamId",
                            "mainUsers.id",
                            "incident_categories.id",
                            // "assignUser.id",
                            // "user_house_allocation.id",
                            "service_orders.id",
                            "companies.id",
                            "projects.id"
                        ])
                        .distinct('service_requests.id')
                ]);



            } else {


                [total, rows] = await Promise.all([
                    knex
                        // .count("* as count")
                        .from("service_requests")
                        .leftJoin(
                            "property_units",
                            "service_requests.houseId",
                            "property_units.id"
                        )
                        .leftJoin(
                            "service_status AS status",
                            "service_requests.serviceStatusCode",
                            "status.statusCode"
                        )
                        .leftJoin("users as u", "service_requests.requestedBy", "u.id")
                        .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
                        .leftJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .leftJoin(
                            "requested_by",
                            "service_requests.requestedBy",
                            "requested_by.id"
                        )
                        .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                        .leftJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")
                        .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                        .leftJoin('projects', 'service_requests.projectId', 'projects.id')

                        .select([
                            "service_requests.id as S Id",
                            "service_requests.houseId as houseId",
                            "service_requests.description as Description",
                            "service_requests.priority as Priority",
                            // "assignUser.name as Tenant Name",
                            "status.descriptionEng as Status",
                            "property_units.unitNumber as Unit No",
                            "u.name as Requested By",
                            "service_requests.createdAt as Date Created",
                            "service_orders.id as SO Id",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",

                        ])
                        .groupBy([
                            "service_requests.id",
                            "status.id",
                            "u.id",
                            "property_units.id",
                            "buildings_and_phases.id",
                            "service_problems.id",
                            "requested_by.id",
                            "assigned_service_team.id",
                            "teams.teamId",
                            "mainUsers.id",
                            "incident_categories.id",
                            // "assignUser.id",
                            // "user_house_allocation.id",
                            "service_orders.id",
                            "companies.id",
                            "projects.id"
                        ])
                        .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
                        .whereIn('service_requests.projectId', accessibleProjects)
                        .where({ 'service_requests.isCreatedFromSo': false })
                        .distinct('service_requests.id'),


                    knex.from("service_requests")
                        .leftJoin(
                            "property_units",
                            "service_requests.houseId",
                            "property_units.id"
                        )
                        .leftJoin(
                            "service_status AS status",
                            "service_requests.serviceStatusCode",
                            "status.statusCode"
                        )
                        .leftJoin("users as u", "service_requests.requestedBy", "u.id")
                        .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
                        .leftJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .leftJoin(
                            "requested_by",
                            "service_requests.requestedBy",
                            "requested_by.id"
                        )
                        .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                        .leftJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")
                        .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                        .leftJoin('projects', 'service_requests.projectId', 'projects.id')

                        .select([
                            "service_requests.id as S Id",
                            "service_requests.houseId as houseId",
                            "service_requests.description as Description",
                            "service_requests.priority as Priority",
                            // "assignUser.name as Tenant Name",
                            "status.descriptionEng as Status",
                            "property_units.unitNumber as Unit No",
                            "requested_by.name as Requested By",
                            "service_requests.createdAt as Date Created",
                            "buildings_and_phases.buildingPhaseCode",
                            "buildings_and_phases.description as buildingDescription",
                            "incident_categories.descriptionEng as problemDescription",
                            "requested_by.email as requestedByEmail",
                            //"teams.teamName",
                            //"teams.teamCode",
                            //"mainUsers.name as mainUser",
                            "service_orders.id as SO Id",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",
                            "service_requests.id",
                        ])
                        .groupBy([
                            "service_requests.id",
                            "status.id",
                            "u.id",
                            "property_units.id",
                            "buildings_and_phases.id",
                            "service_problems.id",
                            "requested_by.id",
                            "assigned_service_team.id",
                            "teams.teamId",
                            "mainUsers.id",
                            "incident_categories.id",
                            // "assignUser.id",
                            // "user_house_allocation.id",
                            "service_orders.id",
                            "companies.id",
                            "projects.id"
                        ])
                        .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
                        .whereIn('service_requests.projectId', accessibleProjects)
                        .where({ 'service_requests.isCreatedFromSo': false })
                        .distinct('service_requests.id')
                        .orderBy('service_requests.id', 'desc')
                        .offset(offset)
                        .limit(per_page)

                    //

                    // knex
                    //   .from("service_requests")
                    //   .leftJoin(
                    //     "property_units",
                    //     "service_requests.houseId",
                    //     "property_units.id"
                    //   )
                    //   .leftJoin(
                    //     "service_status AS status",
                    //     "service_requests.serviceStatusCode",
                    //     "status.statusCode"
                    //   )
                    //   .leftJoin("users as u", "service_requests.requestedBy", "u.id")
                    //   .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
                    //   .leftJoin(
                    //     "service_problems",
                    //     "service_requests.id",
                    //     "service_problems.serviceRequestId"
                    //   )
                    //   .leftJoin(
                    //     "requested_by",
                    //     "service_requests.requestedBy",
                    //     "requested_by.id"
                    //   )
                    //   .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                    //   .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                    //   .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                    //   .select([
                    //     "service_requests.id as S Id",
                    //     "service_requests.houseId as houseId",
                    //     "service_requests.description as Description",
                    //     // "incident_categories.descriptionEng as Category",
                    //     // "incident_sub_categories.descriptionEng as Problem",
                    //     "service_requests.priority as Priority",
                    //     "status.descriptionEng as Status",
                    //     "property_units.unitNumber as Unit No",
                    //     "requested_by.name as Requested By",
                    //     "service_requests.createdAt as Date Created",
                    //     "buildings_and_phases.buildingPhaseCode",
                    //     "buildings_and_phases.description as buildingDescription",
                    //     "service_problems.description as problemDescription",
                    //     "requested_by.email as requestedByEmail",
                    //     "teams.teamName",
                    //     "teams.teamCode",
                    //     "mainUsers.name as mainUser"
                    //   ])
                    //   .offset(offset)
                    //   .limit(per_page)
                    //   .where({ "service_requests.orgId": req.orgId })
                    //   .whereIn('service_requests.projectId', accessibleProjects)
                    //   .orderBy('service_requests.id', 'desc')
                    //   .groupBy([
                    //     "service_requests.id",
                    //     "status.id",
                    //     "u.id",
                    //     "property_units.id",
                    //     "buildings_and_phases.id",
                    //     "service_problems.id",
                    //     "requested_by.id",
                    //     "assigned_service_team.id",
                    //     "teams.teamId",
                    //     "mainUsers.id"
                    //   ])
                    //   .distinct('service_requests.id')
                ]);


            }



            // if (_.isEmpty(filters) && _.isEmpty(serviceFrom && serviceTo) && _.isEmpty(dueDateFrom && dueDateTo)) {

            //   [total, rows] = await Promise.all([
            //     knex
            //       // .count("* as count")
            //       .from("service_requests")
            //       .leftJoin(
            //         "property_units",
            //         "service_requests.houseId",
            //         "property_units.id"
            //       )
            //       .leftJoin(
            //         "service_status AS status",
            //         "service_requests.serviceStatusCode",
            //         "status.statusCode"
            //       )
            //       .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            //       .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            //       .leftJoin(
            //         "service_problems",
            //         "service_requests.id",
            //         "service_problems.serviceRequestId"
            //       )
            //       .leftJoin(
            //         "requested_by",
            //         "service_requests.requestedBy",
            //         "requested_by.id"
            //       )
            //       .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
            //       .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            //       .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            //       .leftJoin(
            //         "incident_categories",
            //         "service_problems.categoryId",
            //         "incident_categories.id"
            //       )
            //       // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            //       // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            //       .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")

            //       .select([
            //         "service_requests.id as S Id",
            //         "service_requests.houseId as houseId",
            //         "service_requests.description as Description",
            //         "service_requests.priority as Priority",
            //         // "assignUser.name as Tenant Name",
            //         "status.descriptionEng as Status",
            //         "property_units.unitNumber as Unit No",
            //         "u.name as Requested By",
            //         "service_requests.createdAt as Date Created",
            //         "service_orders.id as SO Id",
            //         "property_units.id as unitId",
            //         "service_orders.displayId as SO#",
            //         "service_requests.displayId as SR#",

            //       ])
            //       .groupBy([
            //         "service_requests.id",
            //         "status.id",
            //         "u.id",
            //         "property_units.id",
            //         "buildings_and_phases.id",
            //         "service_problems.id",
            //         "requested_by.id",
            //         "assigned_service_team.id",
            //         "teams.teamId",
            //         "mainUsers.id",
            //         "incident_categories.id",
            //         // "assignUser.id",
            //         // "user_house_allocation.id",
            //         "service_orders.id"
            //       ])
            //       .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
            //       .whereIn('service_requests.projectId', accessibleProjects)
            //       .where({ 'service_requests.isCreatedFromSo': false })
            //       .distinct('service_requests.id')
            //     ,



            //     knex.from("service_requests")
            //       .leftJoin(
            //         "property_units",
            //         "service_requests.houseId",
            //         "property_units.id"
            //       )
            //       .leftJoin(
            //         "service_status AS status",
            //         "service_requests.serviceStatusCode",
            //         "status.statusCode"
            //       )
            //       .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            //       .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            //       .leftJoin(
            //         "service_problems",
            //         "service_requests.id",
            //         "service_problems.serviceRequestId"
            //       )
            //       .leftJoin(
            //         "requested_by",
            //         "service_requests.requestedBy",
            //         "requested_by.id"
            //       )
            //       .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
            //       .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            //       .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            //       .leftJoin(
            //         "incident_categories",
            //         "service_problems.categoryId",
            //         "incident_categories.id"
            //       )
            //       // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            //       // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            //       .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")

            //       .select([
            //         "service_requests.id as S Id",
            //         "service_requests.houseId as houseId",
            //         "service_requests.description as Description",
            //         "service_requests.priority as Priority",
            //         // "assignUser.name as Tenant Name",
            //         "status.descriptionEng as Status",
            //         "property_units.unitNumber as Unit No",
            //         "requested_by.name as Requested By",
            //         "service_requests.createdAt as Date Created",
            //         "buildings_and_phases.buildingPhaseCode",
            //         "buildings_and_phases.description as buildingDescription",
            //         "incident_categories.descriptionEng as problemDescription",
            //         "requested_by.email as requestedByEmail",
            //         "teams.teamName",
            //         "teams.teamCode",
            //         "mainUsers.name as mainUser",
            //         "service_orders.id as SO Id",
            //         "property_units.id as unitId",
            //         "service_orders.displayId as SO#",
            //         "service_requests.displayId as SR#",


            //       ])
            //       .groupBy([
            //         "service_requests.id",
            //         "status.id",
            //         "u.id",
            //         "property_units.id",
            //         "buildings_and_phases.id",
            //         "service_problems.id",
            //         "requested_by.id",
            //         "assigned_service_team.id",
            //         "teams.teamId",
            //         "mainUsers.id",
            //         "incident_categories.id",
            //         // "assignUser.id",
            //         // "user_house_allocation.id",
            //         "service_orders.id"

            //       ])
            //       .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
            //       .whereIn('service_requests.projectId', accessibleProjects)
            //       // .where({'service_requests.isCreatedFromSo':false})
            //       .distinct('service_requests.id')
            //       .orderBy('service_requests.id', 'desc')
            //       .offset(offset)
            //       .limit(per_page)

            //     //

            //     // knex
            //     //   .from("service_requests")
            //     //   .leftJoin(
            //     //     "property_units",
            //     //     "service_requests.houseId",
            //     //     "property_units.id"
            //     //   )
            //     //   .leftJoin(
            //     //     "service_status AS status",
            //     //     "service_requests.serviceStatusCode",
            //     //     "status.statusCode"
            //     //   )
            //     //   .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            //     //   .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            //     //   .leftJoin(
            //     //     "service_problems",
            //     //     "service_requests.id",
            //     //     "service_problems.serviceRequestId"
            //     //   )
            //     //   .leftJoin(
            //     //     "requested_by",
            //     //     "service_requests.requestedBy",
            //     //     "requested_by.id"
            //     //   )
            //     //   .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
            //     //   .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            //     //   .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            //     //   .select([
            //     //     "service_requests.id as S Id",
            //     //     "service_requests.houseId as houseId",
            //     //     "service_requests.description as Description",
            //     //     // "incident_categories.descriptionEng as Category",
            //     //     // "incident_sub_categories.descriptionEng as Problem",
            //     //     "service_requests.priority as Priority",
            //     //     "status.descriptionEng as Status",
            //     //     "property_units.unitNumber as Unit No",
            //     //     "requested_by.name as Requested By",
            //     //     "service_requests.createdAt as Date Created",
            //     //     "buildings_and_phases.buildingPhaseCode",
            //     //     "buildings_and_phases.description as buildingDescription",
            //     //     "service_problems.description as problemDescription",
            //     //     "requested_by.email as requestedByEmail",
            //     //     "teams.teamName",
            //     //     "teams.teamCode",
            //     //     "mainUsers.name as mainUser"
            //     //   ])
            //     //   .offset(offset)
            //     //   .limit(per_page)
            //     //   .where({ "service_requests.orgId": req.orgId })
            //     //   .whereIn('service_requests.projectId', accessibleProjects)
            //     //   .orderBy('service_requests.id', 'desc')
            //     //   .groupBy([
            //     //     "service_requests.id",
            //     //     "status.id",
            //     //     "u.id",
            //     //     "property_units.id",
            //     //     "buildings_and_phases.id",
            //     //     "service_problems.id",
            //     //     "requested_by.id",
            //     //     "assigned_service_team.id",
            //     //     "teams.teamId",
            //     //     "mainUsers.id"
            //     //   ])
            //     //   .distinct('service_requests.id')
            //   ]);




            // } else {


            //   [total, rows] = await Promise.all([
            //     knex
            //       // .count("* as count")
            //       .from("service_requests")
            //       .leftJoin(
            //         "property_units",
            //         "service_requests.houseId",
            //         "property_units.id"
            //       )

            //       .leftJoin(
            //         "assigned_service_team",
            //         "service_requests.id",
            //         "assigned_service_team.entityId"
            //       )
            //       .leftJoin(
            //         "service_status AS status",
            //         "service_requests.serviceStatusCode",
            //         "status.statusCode"
            //       )
            //       .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            //       .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            //       .leftJoin(
            //         "service_problems",
            //         "service_requests.id",
            //         "service_problems.serviceRequestId"
            //       )
            //       .leftJoin(
            //         "requested_by",
            //         "service_requests.requestedBy",
            //         "requested_by.id"
            //       )
            //       .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            //       .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            //       .leftJoin(
            //         "incident_categories",
            //         "service_problems.categoryId",
            //         "incident_categories.id"
            //       )
            //       // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            //       // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            //       .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")

            //       .select([
            //         "service_requests.id as S Id",
            //         "service_requests.description as Description",
            //         // "incident_categories.descriptionEng as Category",
            //         // "incident_sub_categories.descriptionEng as Problem",
            //         "service_requests.priority as Priority",
            //         // "assignUser.name as Tenant Name",
            //         "status.descriptionEng as Status",
            //         "property_units.unitNumber as Unit No",
            //         "u.name as Requested By",
            //         "service_requests.createdAt as Date Created",
            //         "service_orders.id as SO Id",
            //         "property_units.id as unitId",
            //         "service_orders.displayId as SO#",
            //         "service_requests.displayId as SR#",


            //       ])
            //       .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
            //       .where({ 'service_requests.isCreatedFromSo': false })
            //       .where(qb => {
            //         if (location) {
            //           qb.where('service_requests.location', 'iLIKE', `%${location}%`)
            //         }
            //         if (description) {
            //           qb.where('service_requests.description', 'iLIKE', `%${description}%`)
            //         }
            //         if (priority) {
            //           qb.where('service_requests.priority', 'iLIKE', `%${priority}%`)
            //         }

            //         if (serviceFromDate && serviceToDate) {
            //           qb.whereBetween("service_requests.createdAt", [
            //             serviceFromDate,
            //             serviceToDate
            //           ]);
            //         }
            //         if (dueDateFrom && dueDateTo) {

            //           console.log("dsfsdfsdfsdfsdfffffffffffffffffff=========")
            //           qb.whereBetween("service_requests.createdAt", [
            //             dueFrom,
            //             dueTo
            //           ]);
            //           qb.where({ closedBy: "" })
            //         }
            //         qb.where(filters);
            //         qb.whereIn('service_requests.projectId', accessibleProjects)
            //       })

            //       .groupBy([
            //         "service_requests.id",
            //         "status.id",
            //         "u.id",
            //         "property_units.id",
            //         "buildings_and_phases.id",
            //         "service_problems.id",
            //         "requested_by.id",
            //         "assigned_service_team.id",
            //         "teams.teamId",
            //         "mainUsers.id",
            //         "incident_categories.id",
            //         // "assignUser.id",
            //         // "user_house_allocation.id",
            //         "service_orders.id"
            //       ])
            //       .distinct('service_requests.id')
            //     ,
            //     knex
            //       .from("service_requests")
            //       .leftJoin(
            //         "property_units",
            //         "service_requests.houseId",
            //         "property_units.id"
            //       )
            //       .leftJoin(
            //         "assigned_service_team",
            //         "service_requests.id",
            //         "assigned_service_team.entityId"
            //       )
            //       .leftJoin(
            //         "service_status AS status",
            //         "service_requests.serviceStatusCode",
            //         "status.statusCode"
            //       )
            //       .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            //       .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            //       .leftJoin(
            //         "service_problems",
            //         "service_requests.id",
            //         "service_problems.serviceRequestId"
            //       )
            //       .leftJoin(
            //         "requested_by",
            //         "service_requests.requestedBy",
            //         "requested_by.id"
            //       )
            //       .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            //       .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            //       .leftJoin(
            //         "incident_categories",
            //         "service_problems.categoryId",
            //         "incident_categories.id"
            //       )
            //       // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            //       // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            //       .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")

            //       .select([
            //         "service_requests.id as S Id",
            //         "service_requests.description as Description",
            //         "service_requests.priority as Priority",
            //         "status.descriptionEng as Status",
            //         "property_units.unitNumber as Unit No",
            //         // "assignUser.name as Tenant Name",
            //         "requested_by.name as Requested By",
            //         "service_requests.createdAt as Date Created",
            //         "buildings_and_phases.buildingPhaseCode",
            //         "buildings_and_phases.description as buildingDescription",
            //         "incident_categories.descriptionEng as problemDescription",
            //         "requested_by.email as requestedByEmail",
            //         "teams.teamName",
            //         "teams.teamCode",
            //         "mainUsers.name as mainUser",
            //         "service_orders.id as SO Id",
            //         "property_units.id as unitId",
            //         "service_orders.displayId as SO#",
            //         "service_requests.displayId as SR#",


            //       ])
            //       .orderBy('service_requests.id', 'desc')
            //       .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
            //       .where({ 'service_requests.isCreatedFromSo': false })
            //       .where(qb => {
            //         if (location) {
            //           qb.where('service_requests.location', 'iLIKE', `%${location}%`)
            //         }
            //         if (priority) {
            //           qb.where('service_requests.priority', 'iLIKE', `%${priority}%`)
            //         }
            //         if (description) {
            //           qb.where('service_requests.description', 'iLIKE', `%${description}%`)
            //         }

            //         if (serviceFromDate && serviceToDate) {
            //           qb.whereBetween("service_requests.createdAt", [
            //             serviceFromDate,
            //             serviceToDate
            //           ]);
            //         }

            //         if (dueDateFrom && dueDateTo) {
            //           qb.whereBetween("service_requests.createdAt", [
            //             dueFrom,
            //             dueTo
            //           ]);
            //           qb.where({ closedBy: "" })
            //         }
            //         qb.where(filters);
            //         qb.whereIn('service_requests.projectId', accessibleProjects)


            //       })
            //       .offset(offset)
            //       .limit(per_page)
            //       .groupBy([
            //         "service_requests.id",
            //         "status.id",
            //         "u.id",
            //         "property_units.id",
            //         "buildings_and_phases.id",
            //         "service_problems.id",
            //         "requested_by.id",
            //         "assigned_service_team.id",
            //         "teams.teamId",
            //         "mainUsers.id",
            //         "incident_categories.id",
            //         // "assignUser.id",
            //         // "user_house_allocation.id",
            //         "service_orders.id"
            //       ])
            //       .distinct('service_requests.id')
            //   ]);
            // }

            let count = total.length;
            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + rows.length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;

            const Parallel = require('async-parallel');

            // rows.tenantName = await Parallel.map(rows, async item => {

            //   let userId = await knex('assigned_service_additional_users').where({ entityId: item["S Id"] ,'entityType':'service_requests'}).select('userId').first();

            //   let tenantName =null;   
            //   if(userId){
            //   tenantName = await knex('users').where({ id: userId }).select('name').first();
            //   tenantName="assssssssssss"
            //   }

            //   return userId;

            // });

            // let Parallel = require('async-parallel');
            pagination.data = await Parallel.map(rows, async pd => {



                console.log("===================", pd, "==========================")

                let teamName = '';
                let teamCode = '';
                let mainUser = '';

                let teamResult = await knex.from('assigned_service_team')
                    .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                    .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                    .select(['teams.teamName', 'teams.teamCode', 'mainUsers.name as mainUser'])
                    .where({
                        'assigned_service_team.orgId': req.orgId,
                        'assigned_service_team.entityType': 'service_requests',
                        'assigned_service_team.entityId': pd["S Id"]
                    }).first();

                if (teamResult) {


                    teamName = teamResult.teamName;
                    teamCode = teamResult.teamCode;
                    mainUser = teamResult.mainUser;

                }

                let houseResult = await knex.from('user_house_allocation').select('userId').where({ houseId: pd.unitId }).first().orderBy('id', 'desc')

                if (houseResult) {
                    let tetantResult = await knex.from('users').select('name').where({ id: houseResult.userId }).first()
                    return {
                        ...pd,
                        "Tenant Name": tetantResult.name,
                        "teamName": teamName,
                        "teamCode": teamCode,
                        "mainUser": mainUser
                    }
                } else {
                    return {
                        ...pd,
                        "Tenant Name": '',
                        "teamName": teamName,
                        "teamCode": teamCode,
                        "mainUser": mainUser
                    }
                }



            })

            // pagination.data = _.uniqBy(rows,'S Id');



            return res.status(200).json({
                data: {
                    service_requests: pagination,
                },
                message: "Service Request List!"
            });
        } catch (err) {
            console.log("[controllers][service][request] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    exportServiceRequest: async (req, res) => {
        try {
            let reqData = req.query;
            let {
                description,
                completedOn,
                serviceFrom,
                serviceTo,
                id,
                location,
                serviceStatus,
                priority,
                unitNo,
                createdBy,
                serviceType,
                recuring,
                completedBy,
                assignedTo
            } = req.body;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let filters = {};
            if (description) {
                filters["service_requests.description"] = description;
            }

            // completedOn -> null means due
            // serviceFrom -serviceTo = createdAt

            if (id) {
                filters["service_requests.id"] = id;
            }
            if (location) {
                filters["service_requests.location"] = location;
            }
            if (serviceStatus) {
                filters["service_requests.serviceStatusCode"] = serviceStatus;
            }

            let serviceFromDate, serviceToDate;
            if (serviceFrom && serviceTo) {
                serviceFromDate = new Date(serviceFrom).getTime();
                serviceToDate = new Date(serviceTo).getTime();
            } else if (serviceFrom && !serviceTo) {
                serviceFromDate = new Date(serviceFrom).getTime();
                serviceToDate = new Date("2030-01-01").getTime();
            } else if (!serviceFrom && serviceTo) {
                serviceFromDate = new Date("2000-01-01").getTime();
                serviceToDate = new Date(serviceTo).getTime();
            }

            if (completedOn) {
                filters["service_requests.completedOn"] = completedOn;
            }

            if (priority) {
                filters["service_requests.priority"] = priority;
            }

            if (unitNo) {
                filters["property_units.unitNumber"] = unitNo;
            }

            if (createdBy) {
                filters["service_requests.createdBy"] = createdBy;
            }

            if (serviceType) {
                filters["service_requests.serviceType"] = serviceType;
            }

            if (completedBy) {
                filters["service_requests.closedby"] = completedBy;
            }

            if (assignedTo) {
                filters["service_requests.assignedTo"] = assignedTo;
            }

            //    if(recuring){
            //     filters['service_requests.recuring'] = recuring
            //    }

            if (_.isEmpty(filters)) {
                [total, rows] = await Promise.all([
                    knex
                        .count("* as count")
                        .from("service_requests")
                        .innerJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .innerJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        .innerJoin(
                            "incident_sub_categories",
                            "incident_categories.id",
                            "incident_sub_categories.incidentCategoryId"
                        )
                        .innerJoin(
                            "property_units",
                            "service_requests.houseId",
                            "property_units.id"
                        )

                        .select([
                            "service_requests.id as S Id",
                            "service_requests.description as Description",
                            "incident_categories.descriptionEng as Category",
                            "incident_sub_categories.descriptionEng as Problem",
                            "service_requests.priority as Priority",
                            "service_requests.serviceStatusCode as Status",
                            "property_units.unitNumber as Unit No",
                            "service_requests.requestedBy as Requested By",
                            "service_requests.createdAt as Date Created"
                        ])
                        .groupBy([
                            "service_requests.id",
                            "service_problems.id",
                            "incident_categories.id",
                            "incident_sub_categories.id",
                            "property_units.id"
                        ]),
                    knex
                        .from("service_requests")
                        .innerJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .innerJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        .innerJoin(
                            "incident_sub_categories",
                            "incident_categories.id",
                            "incident_sub_categories.incidentCategoryId"
                        )
                        .innerJoin(
                            "property_units",
                            "service_requests.houseId",
                            "property_units.id"
                        )
                        .select([
                            "service_requests.id as S Id",
                            "service_requests.description as Description",
                            "incident_categories.descriptionEng as Category",
                            "incident_sub_categories.descriptionEng as Problem",
                            "service_requests.priority as Priority",
                            "service_requests.serviceStatusCode as Status",
                            "property_units.unitNumber as Unit No",
                            "service_requests.requestedBy as Requested By",
                            "service_requests.createdAt as Date Created"
                        ])
                        .offset(offset)
                        .limit(per_page)
                ]);
            } else {
                //console.log('IN else: ')
                //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
                [total, rows] = await Promise.all([
                    knex
                        .count("* as count")
                        .from("service_requests")
                        .innerJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .innerJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        .innerJoin(
                            "incident_sub_categories",
                            "incident_categories.id",
                            "incident_sub_categories.incidentCategoryId"
                        )
                        .innerJoin(
                            "property_units",
                            "service_requests.houseId",
                            "property_units.id"
                        )
                        .select([
                            "service_requests.id as S Id",
                            "service_requests.description as Description",
                            "incident_categories.descriptionEng as Category",
                            "incident_sub_categories.descriptionEng as Problem",
                            "service_requests.priority as Priority",
                            "service_requests.serviceStatusCode as Status",
                            "property_units.unitNumber as Unit No",
                            "service_requests.requestedBy as Requested By",
                            "service_requests.createdAt as Date Created"
                        ])
                        .where(qb => {
                            qb.where(filters);
                            if (serviceFromDate && serviceToDate) {
                                qb.whereBetween("service_requests.createdAt", [
                                    serviceFromDate,
                                    serviceToDate
                                ]);
                            }
                        })
                        .groupBy([
                            "service_requests.id",
                            "service_problems.id",
                            "incident_categories.id",
                            "incident_sub_categories.id",
                            "property_units.id"
                        ]),
                    knex
                        .from("service_requests")
                        .innerJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .innerJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        .innerJoin(
                            "incident_sub_categories",
                            "incident_categories.id",
                            "incident_sub_categories.incidentCategoryId"
                        )
                        .innerJoin(
                            "property_units",
                            "service_requests.houseId",
                            "property_units.id"
                        )
                        .select([
                            "service_requests.id as S Id",
                            "service_requests.description as Description",
                            "incident_categories.descriptionEng as Category",
                            "incident_sub_categories.descriptionEng as Problem",
                            "service_requests.priority as Priority",
                            "service_requests.serviceStatusCode as Status",
                            "property_units.unitNumber as Unit No",
                            "service_requests.requestedBy as Requested By",
                            "service_requests.createdAt as Date Created"
                        ])
                        .where(qb => {
                            qb.where(filters);
                            if (serviceFromDate && serviceToDate) {
                                qb.whereBetween("service_requests.createdAt", [
                                    serviceFromDate,
                                    serviceToDate
                                ]);
                            }
                        })
                        .offset(offset)
                        .limit(per_page)
                ]);
            }

            var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
            var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
            let filename = "ServiceRequest-" + Date.now() + ".csv";
            let filepath = "uploads/" + filename;

            let check = XLSX.writeFile(wb, filepath);

            const s3 = new AWS.S3({
                accessKeyId: "S3RVER",
                secretAccessKey: "S3RVER",
                s3ForcePathStyle: false
            });
            const s3Params = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: "service-request/" + filename,
                ContentType: "application/vnd.ms-excel",
                ACL: "public-read-write"
            };
            //  let uploadURL = await s3.getSignedUrl('putObject', s3Params);
            //if (Boolean(process.env.IS_OFFLINE)) {
            //  uploadURL = uploadURL.replace("https://", "http://").replace(".com", ".com:8000");
            //}
            //console.log("++++++++++",uploadURL,"+====================")
            await s3.putObject(s3Params, function (err, data) {
                if (err) {
                    console.log("Error==", err, "Error");
                } else {
                    console.log("data==", data, "data");
                }
            });

            return res.status(200).json({
                data: rows,
                message: "Service Request Data Export Successfully!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    importServiceRequest: async (req, res) => {
        try {
            if (req.file) {
                let file_path = appRoot + "/uploads/" + req.file.filename;
                let wb = XLSX.readFile(file_path, { type: "binary" });
                let ws = wb.Sheets[wb.SheetNames[0]];
                let data = XLSX.utils.sheet_to_json(ws, {
                    type: "string",
                    header: "A",
                    raw: false
                });
                let result = null;
                if (data[0].B === "Description" && data[0].F === "Priority") {
                    if (data.length > 0) {
                        const currentTime = new Date().getTime();
                        data.forEach(async (inservalue, key) => {
                            console.log(inservalue, "+++++++++++");
                            const insertData = {
                                description: inservalue.B,
                                priority: inservalue.F,
                                serviceStatusCode: inservalue.G,
                                createdAt: currentTime
                            };
                            console.log(
                                "[controllers][service][requestId]: Insert Data",
                                insertData
                            );
                            const serviceResult = await knex
                                .insert(insertData)
                                .returning(["*"])
                                .into("service_requests");
                            result = serviceResult[0];
                        });

                        return res.status(200).json({
                            data: result,
                            message: "Service Request Data Import Successfully!"
                        });
                    }
                } else {
                    return res.status(500).json({
                        errors: [{
                            code: "VALIDATION_ERROR",
                            message: "Please Select valid files"
                        }]
                    });
                }
            } else {
                return res.status(500).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: "csv file can't empty" }
                    ]
                });
            }
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    //  getServiceRequestLocationsByServiceRequestId: async(req,res) => {
    //      try {
    //          const serviceRequestId = req.body.serviceRequestId;
    //          const data = await knex
    //                             .from('service_requests')
    //                             .innerJoin('property_units', 'service_requests.houseId', 'property_units.id')
    //                             .innerJoin('companies', 'property_units.companyId', 'companies.id')
    //                             .innerJoin('projects', 'property_units.projectId', 'projects.id')
    //                             .innerJoin('floor_and_zones', 'property_units.floorZoneId', 'floor_and_zones.id')
    //                             .innerJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
    //                             .innerJoin('')
    //                             .select([
    //                             'companies.id as companyId',
    //                             ''
    //                             ])
    //      } catch(err) {
    //          return res.status(500).json({
    //              errors: [
    //                  { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
    //              ],
    //          })
    //      }
    //  },
    getPropertyUnits: async (req, res) => {
        try {
            let ids = req.body;
            let filters = {};
            if (ids.companyId) {
                filters["property_units.companyId"] = ids.companyId;
            }
            if (ids.projectId) {
                filters["property_units.projectId"] = ids.projectId;
            }
            if (ids.buildingPhaseId) {
                filters["property_units.buildingPhaseId"] = ids.buildingPhaseId;
            }
            if (ids.floorZoneId) {
                filters["property_units.floorZoneId"] = ids.floorZoneId;
            }
            if (ids.unitNumber) {
                filters["property_units.unitNumber"] = ids.unitNumber;
            }
            if (ids.houseId) {
                filters["property_units.id"] = ids.houseId;
            }
            const units = await knex
                .from("property_units")
                .innerJoin("companies", "property_units.id", "companies.id")
                .innerJoin("projects", "property_units.projectId", "projects.id")
                .innerJoin(
                    "buildings_and_phases",
                    "property_units.buildingPhaseId",
                    "buildings_and_phases.id"
                )
                .innerJoin(
                    "floor_and_zones",
                    "property_units.floorZoneId",
                    "floor_and_zones.id"
                )
                .where(filters)
                .select([
                    "property_units.companyId as companyId",
                    "companies.companyName as companyName",
                    "property_units.projectId as projectId",
                    "projects.projectName as projectName",
                    "property_units.buildingPhaseId as buildingPhaseId",
                    "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
                    "property_units.floorZoneId as floorZoneId",
                    "floor_and_zones.floorZoneCode as floorZoneCode",
                    "property_units.unitNumber as unitNumber",
                    "property_units.id as houseId"
                ]);
            return res.status(200).json({
                data: {
                    units
                },
                message: "Property units"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    // Service Request
    getServiceRequestReportData: async (req, res) => {
        try {
            // We need to extract service requests on monthly basis
            // service requests with completed status
            // based on today's date get the service request of current month
            const payload = req.body;

            // let currentDate = new Date().getTime()

            const schema = Joi.object().keys({
                selectedMonth: Joi.string().required()
            });

            const result = Joi.validate(payload, schema);
            console.log("[controllers][service][problem]: JOi Result", result);

            let [startDate, plusOneMonth] = getStartAndEndDate(
                payload.selectedMonth,
                "M"
            );
            // Now get the data of the selected month
            const selectG = await knex("service_requests")
                .count("id as count")
                .where({ serviceStatusCode: "G" })
                .where("createdAt", ">=", Number(startDate))
                .where("createdAt", "<", Number(plusOneMonth));
            const selectR = await knex("service_requests")
                .count("id as count")
                .where({ serviceStatusCode: "R" })
                .where("createdAt", ">=", Number(startDate))
                .where("createdAt", "<", Number(plusOneMonth));
            const selectC = await knex("service_requests")
                .count("id as count")
                .where({ serviceStatusCode: "C" })
                .where("createdAt", ">=", Number(startDate))
                .where("createdAt", "<", Number(plusOneMonth));
            const selectA = await knex("service_requests")
                .count("id as count")
                .where({ serviceStatusCode: "A" })
                .where("createdAt", ">=", Number(startDate))
                .where("createdAt", "<", Number(plusOneMonth));

            const selectUS = await knex("service_requests")
                .count("id as count")
                .where({ serviceStatusCode: "US" })
                .where("createdAt", ">=", Number(startDate))
                .where("createdAt", "<", Number(plusOneMonth));
            const selectIP = await knex("service_requests")
                .count("id as count")
                .where({ serviceStatusCode: "IP" })
                .where("createdAt", ">=", Number(startDate))
                .where("createdAt", "<", Number(plusOneMonth));
            const selectOH = await knex("service_requests")
                .count("id as count")
                .where({ serviceStatusCode: "OH" })
                .where("createdAt", ">=", Number(startDate))
                .where("createdAt", "<", Number(plusOneMonth));
            const selectCMTD = await knex("service_requests")
                .count("id as count")
                .where({ serviceStatusCode: "CMTD" })
                .where("createdAt", ">=", Number(startDate))
                .where("createdAt", "<", Number(plusOneMonth));

            //us,ip,oh,cmtd

            return res.status(200).json({
                srConfirm: selectG[0].count,
                srReject: selectR[0].count,
                srCancel: selectC[0].count,
                srApprove: selectA[0].count,
                srUnderSurvey: selectUS[0].count,
                srInProgress: selectIP[0].count,
                srOnHold: selectOH[0].count,
                srCompleted: selectCMTD[0].count
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceRequestByMonth: async (req, res) => { },

    getUrl: imageHelper.getUploadURL,

    getServiceRequestAssignedAssets: async (req, res) => {
        try {
            let { serviceRequestId } = req.body;
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            [total, rows] = await Promise.all([
                knex("assigned_assets")
                    .leftJoin(
                        "asset_master",
                        "assigned_assets.assetId",
                        "asset_master.id"
                    )
                    .leftJoin(
                        "asset_category_master",
                        "asset_master.assetCategoryId",
                        "asset_category_master.id"
                    )
                    // .leftJoin(
                    //   "assigned_assets",
                    //   "asset_master.id",
                    //   "assigned_assets.assetId"
                    // )
                    .leftJoin("companies", "asset_master.companyId", "companies.id")
                    .select([
                        "asset_master.id as id",
                        "asset_master.assetName as assetName",
                        "asset_master.assetSerial as assetSerial",
                        "asset_master.model as model",
                        "asset_category_master.categoryName as categoryName",
                        "companies.companyName as companyName",
                        "assigned_assets.id as aid",
                        "asset_master.displayId"
                    ])
                    .where({
                        entityType: "service_requests",
                        entityId: serviceRequestId,
                        "asset_master.orgId": req.orgId
                    }),

                knex("assigned_assets")
                    .leftJoin(
                        "asset_master",
                        "assigned_assets.assetId",
                        "asset_master.id"
                    )
                    .leftJoin(
                        "asset_category_master",
                        "asset_master.assetCategoryId",
                        "asset_category_master.id"
                    )

                    .leftJoin("companies", "asset_master.companyId", "companies.id")
                    // .leftJoin(
                    //   "asset_category_master",
                    //   "asset_master.assetCategoryId",
                    //   "asset_category_master.id"
                    // )
                    // .leftJoin(
                    //   "assigned_assets",
                    //   "asset_master.id",
                    //   "assigned_assets.entityId"
                    // )
                    // .leftJoin("companies", "asset_master.companyId", "companies.id")
                    .select([
                        "asset_master.id as id",

                        "asset_master.assetName as assetName",
                        "asset_master.assetSerial as assetSerial",
                        "asset_master.model as model",
                        "asset_category_master.categoryName as categoryName",
                        "companies.companyName as companyName",
                        "assigned_assets.id as aid",
                        "asset_master.displayId"

                    ])
                    .where({
                        entityType: "service_requests",
                        entityId: serviceRequestId,
                        "asset_master.orgId": req.orgId
                    })
                    .limit(per_page)
                    .offset(offset)
            ]);

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
                    assets: pagination
                }
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    /**CREATE SERVICE REQUEST */
    createServiceRequest: async (req, res) => {
        try {

            let result;
            let orgId = req.orgId;
            let payload = _.omit(req.body, ["images", "isSo", "mobile", "email", "name"]);

            await knex.transaction(async trx => {

                const schema = Joi.object().keys({
                    serviceRequestId: Joi.number().required(),
                    areaName: Joi.string().allow("").optional(),
                    building: Joi.string().required(),
                    commonArea: Joi.string().allow("").optional(),
                    company: Joi.string().required(),
                    serviceStatusCode: Joi.string().required(),
                    description: Joi.string().required(),
                    floor: Joi.string().required(),
                    house: Joi.string().allow('').optional(),
                    location: Joi.string().allow("").optional(),
                    locationTags: Joi.array().items(Joi.string().optional()),
                    project: Joi.string().required(),
                    serviceType: Joi.string().required(),
                    unit: Joi.string().required(),
                    userId: Joi.string().allow("").optional(),
                    priority: Joi.string().allow("").optional(),
                    // name: Joi
                    //   .allow("")
                    //   .optional(),
                    // mobile: Joi
                    //   .allow("")
                    //   .optional(),
                    // email: Joi.string()
                    //   .allow("")
                    //   .optional(),
                    uid: Joi.string().allow("").optional()
                });

                const result = Joi.validate(payload, schema);
                console.log("[controllers][service][problem]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }
                const currentTime = new Date().getTime();
                let requestedByResult;

                // Insert into requested by

                /*CHECK REQUIESTED BY OPEN */

                let requestByData = await knex('requested_by').where({ name: req.body.name, mobile: req.body.mobile, email: req.body.email, orgId: req.orgId }).returning(['*']);

                if (requestByData && requestByData.length) {

                    requestedByResult = requestByData;
                } else {

                    requestedByResult = await knex('requested_by').insert({
                        name: req.body.name,
                        mobile: req.body.mobile,
                        email: req.body.email,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                    }).returning(['*'])
                }
                /*CHECK REQUIESTED BY CLOSE */

                /*UPDATE SERVICE REQUEST DATA OPEN */
                let common;
                let priority;
                if (payload.priority) {
                    priority = payload.priority;
                } else {
                    priority = "HIGH";
                }
                let insertData;

                let propertyUnit = await knex
                    .select(['companyId'])
                    .where({ id: payload.house })
                    .into("property_units").first();


                if (payload.commonArea) {
                    insertData = {
                        description: payload.description,
                        projectId: payload.project,
                        companyId: propertyUnit.companyId,
                        houseId: payload.house,
                        commonId: payload.commonArea,
                        // requestedBy: payload.userId,
                        requestedBy: requestedByResult[0].id,
                        serviceType: payload.serviceType,
                        location: payload.location,
                        priority: priority,
                        serviceStatusCode: payload.serviceStatusCode,
                        orgId: orgId,
                        moderationStatus: true,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        isCreatedFromSo: req.body.isSo ? true : false,
                        state: req.body.isSo ? 2 : 1,
                        createdBy: req.me.id
                    };
                } else {
                    insertData = {
                        description: payload.description,
                        projectId: payload.project,
                        companyId: propertyUnit.companyId,
                        houseId: payload.house,
                        requestedBy: requestedByResult[0].id,
                        // requestedBy: payload.userId,
                        serviceType: payload.serviceType,
                        location: payload.location,
                        priority: priority,
                        serviceStatusCode: payload.serviceStatusCode,
                        orgId: orgId,
                        moderationStatus: true,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        isCreatedFromSo: req.body.isSo ? true : false,
                        state: req.body.isSo ? 2 : 1,
                        createdBy: req.me.id
                    };
                }
                let serviceResult = await knex
                    .update(insertData)
                    .where({ id: payload.serviceRequestId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_requests");
                /*UPDATE SERVICE REQUEST DATA CLOSE */

                /*INSERT LOCATION TAGS DATA OPEN */
                let locationTagIds = []
                for (let locationTag of payload.locationTags) {
                    let result = await knex('location_tags_master').select('id').where({ title: locationTag })
                    if (result && result.length) {
                        locationTagIds.push(result[0].id)
                    } else {
                        result = await knex('location_tags_master').insert({ title: locationTag, orgId: req.orgId, createdBy: req.me.id, descriptionEng: locationTag }).returning(['*'])
                        locationTagIds.push(result[0].id)
                    }
                }
                for (let locationId of locationTagIds) {
                    const insertLocation = {
                        entityId: payload.serviceRequestId,
                        entityType: "service_requests",
                        locationTagId: locationId,
                        orgId: orgId,
                        createdAt: currentTime,
                        updatedAt: currentTime
                    };
                    let locationResult = await knex
                        .insert(insertLocation)
                        .returning(["*"])
                        .transacting(trx)
                        .into("location_tags");
                }
                /*INSERT LOCATION TAGS DATA CLOSE*/

                /*INSERT IMAGE TABLE DATA OPEN */

                if (req.body.images && req.body.images.length) {
                    let imagesData = req.body.images;
                    for (image of imagesData) {
                        let d = await knex
                            .insert({
                                entityId: payload.serviceRequestId,
                                ...image,
                                entityType: "service_requests",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("images");
                    }
                }
                /*INSERT IMAGE TABLE DATA CLOSE */

                /*USER DETAIL UPDATE OPEN */
                if (payload.uid) {
                    let userUpdateData = {
                        name: payload.name,
                        mobileNo: payload.mobile,
                        email: payload.email
                    };
                    let userResult = await knex
                        .update(userUpdateData)
                        .where({ id: payload.uid })
                        .returning(["*"])
                        .transacting(trx)
                        .into("users");
                }
                /*USER DETAIL UPDATE CLOSE */

                trx.commit;
            });


            await knex
                .update({ moderationStatus: true })
                .where({ id: payload.serviceRequestId })
                .into("service_requests");

            return res.status(200).json({
                //data:result,
                message: "Service Request created successfully"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /**GET COMPANY ,PROJECT , BUILDING ,FLOOR BY HOUSE ID */
    getHouseDetailData: async (req, res) => {
        try {
            let unitResult;
            let userResult;
            await knex.transaction(async trx => {
                let houseId = req.query.houseId;
                let orgId = req.orgId;
                let company, project, propertyType, building, floor;
                let result = await knex
                    .from("property_units")
                    .select("*")
                    .where({ "property_units.id": houseId, orgId: orgId });

                unitResult = result[0];
                let houseResult = await knex
                    .from("user_house_allocation")
                    .select("userId")
                    .where({ "user_house_allocation.houseId": houseId, orgId: orgId });

                if (houseResult && houseResult.length) {
                    let user = await knex
                        .from("users")
                        .select("name", "email", "mobileNo", "id as userId")
                        .where({ "users.id": houseResult[0].userId });
                    userResult = user[0];
                }
            });
            return res.status(200).json({
                data: {
                    unit: unitResult,
                    users: userResult
                },
                message: "House Details"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*GET HOUSE ID BY UNIT NO. */
    getHouseIdByUnitNo: async (req, res) => {
        try {
            let unitResult;
            let userResult;
            let serviceResult;
            await knex.transaction(async trx => {
                let orgId = req.orgId;
                let unitId = req.query.unitId;
                let serviceRequestId = req.query.serviceRequestId;
                // let result = await knex
                //   .from("property_units")
                //   .select("*")
                //   .where({ "property_units.id": unitId, orgId: orgId });

                // unitResult = result[0];
                let houseResult = await knex
                    .from("user_house_allocation")
                    .select("userId")
                    .where({
                        "user_house_allocation.houseId": unitId,
                        orgId: orgId
                    });

                if (houseResult && houseResult.length) {
                    let user = await knex
                        .from("users")
                        .select("name", "email", "mobileNo", "id as userId")
                        .where({ "users.id": houseResult[0].userId });
                    userResult = user[0];
                } else {

                    serviceResult = await knex('service_requests')
                        .where(qb => {
                           // if (req.query.serviceRequestId) {
                                qb.where('id', req.query.serviceRequestId)
                            //}
                            qb.where({ orgId: req.orgId })
                        })

                    if (serviceResult && serviceResult.length) {

                        let user2 = await knex
                            .from("users")
                            .select("name", "email", "mobileNo", "id as userId")
                            .where({ "users.id": serviceResult[0].createdBy });
                        userResult = user2[0];
                    }

                }
            });
            return res.status(200).json({
                data: {
                    houseData: unitResult,
                    users: userResult
                },
                message: "House Id Successfully!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*GET SERVICE REQUEST DETAILS BY SERVICE REQUEST ID. */
    getServiceRequestDetailById: async (req, res) => {
        try {
            let serviceResult;
            let locationTags;
            let problemResult;
            await knex.transaction(async trx => {
                let orgId = req.orgId;
                let id = req.query.id;
                let result = await knex
                    .from("service_requests")
                    .leftJoin(
                        "property_units",
                        "service_requests.houseId",
                        "property_units.id"
                    )
                    .leftJoin(
                        'requested_by',
                        'service_requests.requestedBy',
                        'requested_by.id'
                    )
                    .select(
                        "service_requests.houseId as house",
                        "service_requests.commonId as commonArea",
                        "service_requests.description",
                        "service_requests.location",
                        "service_requests.priority",
                        "service_requests.serviceType",
                        "requested_by.name as requestedByName",
                        "requested_by.email as requestedByEmail",
                        "requested_by.mobile as requestedByMobile",
                        "requested_by.id as requestedById",
                        "property_units.companyId as company",
                        "property_units.buildingPhaseId as building",
                        "property_units.floorZoneId as floor",
                        "property_units.projectId as project",
                        "property_units.id as unit",
                        "property_units.type as type"
                        //'property_units.',
                        //'property_units.',
                    )
                    .where({ "service_requests.id": id });
                serviceResult = result[0];

                serviceResult.uploadedImages = await knex.from('images')
                    // .where({ "entityId": incidentRequestPayload.id, "entityType": "service_requests", orgId: orgId })
                    .where({ "entityId": id, "entityType": "service_requests" })
                    .select('s3Url', 'title', 'name', 'id');

                // let problem = await knex
                //   .from("service_problems")
                //   .leftJoin(
                //     "incident_categories",
                //     "service_problems.categoryId",
                //     "incident_categories.id"
                //   )
                //   .leftJoin(
                //     "incident_sub_categories",
                //     "service_problems.problemId",
                //     "incident_sub_categories.id"
                //   )
                //   .select(
                //     "service_problems.description",
                //     "service_problems.id",
                //     "incident_sub_categories.descriptionEng as Problem",
                //     "incident_categories.descriptionEng as category"
                //   )
                //   .where({ serviceRequestId: id });

                let problem = await knex("service_problems")
                    .leftJoin("incident_categories", "service_problems.categoryId", "=", "incident_categories.id")
                    .leftJoin("incident_sub_categories", "service_problems.problemId", "=", "incident_sub_categories.id")
                    .select(
                        "incident_categories.categoryCode ",
                        "incident_categories.descriptionEng as category",
                        "incident_categories.id as categoryId",
                        "incident_sub_categories.id as subCategoryId",
                        // "incident_sub_categories.categoryCode as subCategoryCode",
                        "incident_sub_categories.descriptionEng as subCategory",
                        "service_problems.description",
                        "service_problems.id",
                    )
                    .where({
                        "service_problems.serviceRequestId": id,
                        "service_problems.orgId": req.orgId
                    });

                problemResult = problem;

                const Parallel = require('async-parallel');
                problemResult = await Parallel.map(problemResult, async pd => {
                    imagesResult = await knex.from('images')
                        .where({ "entityId": id, "entityType": "service_problems" })
                        .select('s3Url', 'title', 'name', 'id');
                    return {
                        ...pd,
                        uploadedImages: imagesResult
                    };
                });


                let location = await knex("location_tags")
                    .innerJoin('location_tags_master', 'location_tags.locationTagId', 'location_tags_master.id')
                    .select(["location_tags.locationTagId", 'location_tags_master.title'])
                    .where({ entityId: id, entityType: "service_requests" });
                locationTags = _.uniqBy(location, 'title')
            });

            return res.status(200).json({
                data: {
                    serviceData: {
                        ...serviceResult,
                        locationTags: locationTags,
                        problemResult
                    }
                },
                message: "Service Request Details Successful!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*UPDATE SERVICE REQUEST */
    editServiceRequest: async (req, res) => {
        try {
            let result;
            let orgId = req.orgId;
            await knex.transaction(async trx => {
                let payload = _.omit(req.body, ["images", "name", "mobile", "email"]);
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.number().required(),
                    areaName: Joi.string()
                        .allow("")
                        .optional(),
                    building: Joi.string().required(),
                    commonArea: Joi.string()
                        .allow("")
                        .optional(),
                    company: Joi.string().required(),
                    description: Joi.string().required(),
                    floor: Joi.string().required(),
                    house: Joi.string().required(),
                    location: Joi.string()
                        .allow("")
                        .optional(),
                    locationTags: Joi.array().items(Joi.string().optional()),
                    project: Joi.string().required(),
                    serviceType: Joi.string().required(),
                    unit: Joi.string().required(),
                    userId: Joi.string().allow('').optional(),
                    priority: Joi.string()
                        .allow("")
                        .optional(),
                    // name: Joi.string()
                    //   .allow("")
                    //   .optional(),
                    // mobile: Joi.string()
                    //   .allow("")
                    //   .optional(),
                    // email: Joi.string()
                    //   .allow("")
                    //   .optional(),
                    uid: Joi.string()
                        .allow("")
                        .optional(),
                    teamId: Joi.string()
                        .allow("")
                        .optional(),
                    additionalUsers: Joi.array().items(Joi.number().optional()),
                    mainUserId: Joi.string()
                        .allow("")
                        .optional()
                });

                const result = Joi.validate(payload, schema);
                console.log("[controllers][service][problem]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }
                const currentTime = new Date().getTime();

                let currentServiceRequestData = await knex('service_requests').select('*').where({ 'id': payload.serviceRequestId }).first();

                //await knex('requested_by').update({ name: req.body.name, mobile: req.body.mobile, email: req.body.email }).where({ id: currentServiceRequestData.requestedBy });


                // Insert into requested by

                /*CHECK REQUIESTED BY OPEN */

                let requestedByResult;
                let requestId;

                if (req.body.name && req.body.email) {

                    let requestByData = await knex('requested_by').where({ name: req.body.name, mobile: req.body.mobile, email: req.body.email, orgId: req.orgId }).returning(['*']);

                    if (requestByData && requestByData.length) {

                        requestedByResult = requestByData;
                        requestId = requestedByResult[0].id;
                    } else {

                        requestedByResult = await knex('requested_by').insert({
                            name: req.body.name,
                            mobile: req.body.mobile,
                            email: req.body.email,
                            createdAt: currentTime,
                            updatedAt: currentTime,
                            orgId: req.orgId
                        }).returning(['*'])
                        requestId = requestedByResult[0].id;
                    }
                } else {
                    requestId = currentServiceRequestData.requestedBy;
                }
                /*CHECK REQUIESTED BY CLOSE */


                /*UPDATE SERVICE REQUEST DATA OPEN */
                let common;
                let priority;
                if (payload.priority) {
                    priority = payload.priority;
                } else {
                    priority = "HIGH";
                }
                let insertData;
                if (payload.commonArea) {
                    insertData = {
                        description: payload.description,
                        projectId: payload.project,
                        houseId: payload.house,
                        commonId: payload.commonArea,
                        // requestedBy: payload.userId,
                        serviceType: payload.serviceType,
                        location: payload.location,
                        priority: priority,
                        serviceStatusCode: "O",
                        // createdBy: req.me.id,
                        orgId: orgId,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        createdBy: req.me.id,
                        requestedBy: requestId
                    };
                } else {
                    insertData = {
                        description: payload.description,
                        projectId: payload.project,
                        houseId: payload.house,
                        // requestedBy: payload.userId,
                        serviceType: payload.serviceType,
                        location: payload.location,
                        //createdBy: req.me.id,
                        priority: priority,
                        serviceStatusCode: "O",
                        orgId: orgId,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        //createdBy: req.me.id,
                        requestedBy: requestId
                    };
                }
                let serviceResult = await knex
                    .update(insertData)
                    .where({ id: payload.serviceRequestId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_requests");
                /*UPDATE SERVICE REQUEST DATA CLOSE */

                /*INSERT LOCATION TAGS DATA OPEN */

                // let delLocation = await knex("location_tags")
                //   .where({
                //     entityId: payload.serviceRequestId,
                //     entityType: "service_requests",
                //     orgId: orgId
                //   })
                //   .del();
                // for (let locationId of payload.locationTags) {
                //   const insertLocation = {
                //     entityId: payload.serviceRequestId,
                //     entityType: "service_requests",
                //     locationTagId: locationId,
                //     orgId: orgId,
                //     createdAt: currentTime,
                //     updatedAt: currentTime
                //   };
                //   let locationResult = await knex
                //     .insert(insertLocation)
                //     .returning(["*"])
                //     .transacting(trx)
                //     .into("location_tags");
                // }

                // Discard if some location tags already exists


                let locationTagIds = []
                let finalLocationTags = _.uniq(payload.locationTags)

                for (let locationTag of finalLocationTags) {
                    let result = await knex('location_tags_master').select('id').where({ title: locationTag })
                    if (result && result.length) {
                        locationTagIds.push(result[0].id)
                    } else {
                        result = await knex('location_tags_master').insert({ title: locationTag, orgId: req.orgId, createdBy: req.me.id, descriptionEng: locationTag }).returning(['*'])
                        locationTagIds.push(result[0].id)
                    }
                }
                for (let locationId of locationTagIds) {
                    const insertLocation = {
                        entityId: payload.serviceRequestId,
                        entityType: "service_requests",
                        locationTagId: locationId,
                        orgId: orgId,
                        createdAt: currentTime,
                        updatedAt: currentTime
                    };
                    let locationResult = await knex
                        .insert(insertLocation)
                        .returning(["*"])
                        .transacting(trx)
                        .into("location_tags");
                }
                /*INSERT LOCATION TAGS DATA CLOSE*/

                /*INSERT IMAGE TABLE DATA OPEN */

                if (req.body.images && req.body.images.length) {
                    let imagesData = req.body.images;
                    for (image of imagesData) {
                        let d = await knex
                            .insert({
                                entityId: payload.serviceRequestId,
                                ...image,
                                entityType: "service_requests",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("images");
                    }
                }
                /*INSERT IMAGE TABLE DATA CLOSE */

                /*USER DETAIL UPDATE OPEN */
                if (payload.uid) {
                    let userUpdateData = {
                        name: payload.name,
                        mobileNo: payload.mobile,
                        email: payload.email
                    };
                    let userResult = await knex
                        .update(userUpdateData)
                        .where({ id: payload.uid })
                        .returning(["*"])
                        .transacting(trx)
                        .into("users");
                }
                /*USER DETAIL UPDATE CLOSE */

                trx.commit;
            });
            return res.status(200).json({
                //data:result,
                message: "Service Request updated successfully"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    declineServiceRequest: async (req, res) => {
        try {
            const serviceRequestId = req.body.serviceRequestId;
            const status = await knex("service_requests")
                .update({ serviceStatusCode: "C" })
                .where({ id: serviceRequestId });
            return res.status(200).json({
                data: {
                    status: "C"
                },
                message: "Service Declined Successfully!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    approveServiceRequest: async (req, res) => {
        try {
            let serviceRequestId = req.body.data.serviceRequestId;
            let updateStatus = req.body.data.status;
            let cancelReason = req.body.data.cancelReason;
            let comments = req.body.data.comment;
            let ratings = req.body.data.ratings;
            let signatureImg = req.body.data.signature;
            const currentTime = new Date().getTime();
            console.log('REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7', req.body)

            if (updateStatus === 'A') {


                let quotationsAtached = await knex('quotations').select('id')
                    .where({ serviceRequestId: serviceRequestId, orgId: req.orgId })
                let assignedPartsResult = []
                let assignedChargesResult = []
                for (let q of quotationsAtached) {
                    assignedPartsResultData = await knex('assigned_parts')
                        .innerJoin('quotations', 'assigned_parts.entityId', 'quotations.id')
                        .select('assigned_parts.*')
                        .where({ entityId: q.id, entityType: 'quotations', quotationStatus: 'Approved' }) //.first()
                    assignedPartsResult.push(assignedPartsResultData)


                    assignedChargesResultData = await knex('assigned_service_charges')
                        .innerJoin('quotations', 'assigned_service_charges.entityId', 'quotations.id')
                        .select('assigned_service_charges.*')
                        .where({ entityId: q.id, entityType: 'quotations', quotationStatus: 'Approved' }) //.first()
                    assignedChargesResult.push(assignedChargesResultData)
                    // Approve all the attached quotations
                    // await knex('quotations').update({
                    //   quotationStatus: 'Approved', updatedAt: currentTime,
                    //   updatedBy: req.me.id,
                    //   approvedBy: req.me.id,
                    //   orgId: req.orgId}).where({id:q.id})

                }

                let assignedParts = _.uniqBy(_.flatten(assignedPartsResult), 'id').map(v => _.omit(v, ['id']))
                let assignedCharges = _.uniqBy(_.flatten(assignedChargesResult), 'id').map(v => _.omit(v, ['id']))
                let serviceOrderIdResult = await knex('service_orders').select('id').where({ serviceRequestId: serviceRequestId, orgId: req.orgId }).first()
                let checkIfAlreadyExists = await knex('assigned_parts')
                    .where({ entityType: 'service_orders', entityId: serviceOrderIdResult.id })

                let checkIfAlreadyExistsCharges = await knex('assigned_service_charges')
                    .where({ entityType: 'service_orders', entityId: serviceOrderIdResult.id })

                if (checkIfAlreadyExists && checkIfAlreadyExists.length) {

                } else {
                    for (let p of assignedParts) {
                        await knex('assigned_parts')
                            .insert({ ...p, entityId: serviceOrderIdResult.id, entityType: 'service_orders' })
                    }
                }

                if (checkIfAlreadyExistsCharges && checkIfAlreadyExistsCharges.length) {

                } else {
                    for (let p of assignedCharges) {
                        await knex('assigned_service_charges')
                            .insert({ ...p, entityId: serviceOrderIdResult.id, entityType: 'service_orders' })
                    }
                }

                await knex("service_requests")
                    .update({ serviceStatusCode: updateStatus, updatedAt: currentTime, approvedBy: req.me.id, approvedOn: currentTime })
                    .where({ id: serviceRequestId });

            }

            if (updateStatus === 'COM') {
                await knex("service_requests")
                    .update({ serviceStatusCode: updateStatus, updatedAt: currentTime, completedBy: req.me.id, completedOn: currentTime })
                    .where({ id: serviceRequestId });

                await knex("service_orders")
                    .update({ signature: signatureImg, ratings: ratings, comment: comments, updatedAt: currentTime, completedOn: currentTime })
                    .where({ serviceRequestId: serviceRequestId });
            }
            if (updateStatus === 'C') {
                await knex("service_requests")
                    .update({ serviceStatusCode: updateStatus, cancellationReason: cancelReason, updatedAt: currentTime, cancelledBy: req.me.id, cancelledOn: currentTime })
                    .where({ id: serviceRequestId });
            }
            if (updateStatus === 'IP' || updateStatus === 'OH') {
                await knex("service_requests")
                    .update({ serviceStatusCode: updateStatus, updatedAt: currentTime })
                    .where({ id: serviceRequestId });

                if (updateStatus === 'OH') {
                    await knex("service_orders")
                        .update({ comment: comments, updatedAt: currentTime })
                        .where({ serviceRequestId: serviceRequestId });
                }

            }




            // await knex("service_requests")
            //   .update({ serviceStatusCode: updateStatus, updatedAt: currentTime })
            //   .where({ id: serviceRequestId });

            return res.status(200).json({
                data: {
                    status: updateStatus
                },
                message: "Service status updated successfully!"
            });

        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    deleteServiceProblem: async (req, res) => {
        try {
            const id = req.body.id;
            const deletedProblem = await knex('service_problems').where({ id: id }).del().returning(['*'])
            return res.status(200).json({
                data: {
                    message: 'Deleted successfully!',
                    deletedProblem
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    checkServiceRequestId: async (req, res) => {
        try {
            const id = req.body.id;
            let payload = req.body;

            let tagResult;
            let result;
            let tagId;

            let serviceResult = await knex('service_requests')
                .where({ displayId: payload.id, companyId: payload.companyId, orgId: req.orgId }).first();
            if (serviceResult) {

                tagResult = await knex('location_tags').where({ entityId: serviceResult.id, entityType: "service_requests", orgId: req.orgId });

                tagId = tagResult.map(v => v.locationTagId);

                result = await knex('location_tags_master')
                    .where({ orgId: req.orgId })
                    .whereIn('id', tagId);

            }

            if (!id) {
                return res.status(200).json({
                    data: {
                        exists: false,
                        tags: result
                        //propertyData:data
                    }
                })
            }

            const srId = await knex('service_requests').select('*').where({
                displayId: id,
                companyId: req.body.companyId,
                orgId: req.orgId
            }).first()
            //const houseId = srId.houseId;
            //console.log('HOUSEID :**************************: ',houseId)

            //console.log('Data :**************************: ', data)

            if (srId) {
                const data = await knex('property_units')
                    .select([
                        "property_units.companyId",
                        "property_units.projectId",
                        "property_units.buildingPhaseId",
                        "property_units.floorZoneId",
                        "property_units.unitNumber",
                        "property_units.id as unitId"
                    ])
                    .where({ id: srId.houseId, orgId: req.orgId }).first()
                return res.status(200).json({
                    data: {
                        exists: true,
                        propertyData: data,
                        tags: result


                    }
                })
            } else {
                return res.status(200).json({
                    data: {
                        exists: false,
                        tags: result

                        //propertyData:data
                    }
                })
            }

        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceAssignedTeamAndUsers: async (req, res) => {
        try {
            const serviceRequestId = req.body.serviceRequestId;
            const team = await knex('assigned_service_team').select(['teamId', 'userId as mainUserId']).where({ entityId: serviceRequestId, entityType: 'service_requests' })

            let additionalUsers = await knex('assigned_service_additional_users').select(['userId']).where({ entityId: serviceRequestId, entityType: 'service_requests' })


            return res.status(200).json({
                data: {
                    team,
                    additionalUsers
                }
            })

        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    updateServiceRequestProjectId: async (req, res) => {
        try {
            const { projectId, serviceRequestId } = req.body;
            let result = await knex('service_requests').update({ projectId: projectId }).where({ id: serviceRequestId }).returning(['*'])
            return res.status(200).json({
                data: {
                    updated: true,
                    result
                }
            })
        } catch (err) {
            return res.status(200).json({
                data: {
                    update: false
                }
            })
        }
    },
    getAssignedAssetsByEntity: async (req, res) => {
        try {
            const { entityId, entityType } = req.body;
            let assigned_assets = []
            assigned_assets = await knex('assigned_assets')
                .innerJoin('asset_master', 'assigned_assets.assetId', 'asset_master.id')
                .select(['asset.id as assetId', 'asset_master.assetName'])
                .where({ 'assigned_assets.entityId': entityId, 'assigned_assets.entityType': entityType })

            return res.status(200).json({
                data: {
                    assigned_assets
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceOrderIdByServiceRequestId: async (req, res) => {
        try {
            const serviceRequestId = req.body.serviceRequestId;
            const serviceOrderId = await knex('service_orders').select('id', 'displayId').where({ serviceRequestId: serviceRequestId }).first()
            return res.status(200).json({
                data: {
                    serviceOrderId
                }
            })
        } catch (err) {
            return res.status(200).json({
                data: {
                    update: false
                }
            })
        }
    },
    getServiceRequestIdByServiceOrderId: async (req, res) => {
        try {
            const serviceOrderId = req.body.serviceOrderId;
            const serviceRequestId = await knex('service_orders').select('serviceRequestId').where({ id: serviceOrderId }).first()
            return res.status(200).json({
                data: {
                    serviceRequestId
                }
            })
        } catch (err) {
            return res.status(200).json({
                data: {
                    update: false
                }
            })
        }
    },
    getServiceRequestForReport: async (req, res) => {
        try {
            const payload = req.body;
            let sr, rows;
            console.log("service request report priority", payload.priority)
            const accessibleProjects = req.userProjectResources[0].projects;


            /**fff */


            [sr, rows] = await Promise.all([
                knex
                    // .count("* as count")
                    .from("service_requests")
                    .leftJoin(
                        "property_units",
                        "service_requests.houseId",
                        "property_units.id"
                    )

                    .leftJoin(
                        "assigned_service_team",
                        "service_requests.id",
                        "assigned_service_team.entityId"
                    )
                    .leftJoin(
                        "service_status AS status",
                        "service_requests.serviceStatusCode",
                        "status.statusCode"
                    )
                    .leftJoin("users as u", "service_requests.requestedBy", "u.id")
                    .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
                    .leftJoin(
                        "service_problems",
                        "service_requests.id",
                        "service_problems.serviceRequestId"
                    )
                    .leftJoin(
                        "requested_by",
                        "service_requests.requestedBy",
                        "requested_by.id"
                    )
                    .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                    .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                    .leftJoin(
                        "incident_categories",
                        "service_problems.categoryId",
                        "incident_categories.id"
                    )
                    .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                    .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')

                    // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                    // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                    .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")
                    .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                    .leftJoin('projects', 'service_requests.projectId', 'projects.id')
                    .leftJoin('users as completedUser', 'service_requests.completedBy', 'completedUser.id')

                    .select([
                        "service_requests.id as S Id",
                        "service_requests.houseId as houseId",
                        "service_requests.description as Description",
                        "service_requests.priority as Priority",
                        "service_requests.location as Location",
                        "status.descriptionEng as Status",
                        "property_units.unitNumber as Unit No",
                        "requested_by.name as Requested By",
                        "service_requests.createdAt as Date Created",
                        "buildings_and_phases.buildingPhaseCode",
                        "buildings_and_phases.description as buildingDescription",
                        "incident_categories.descriptionEng as problemDescription",
                        // "requested_by.email as requestedByEmail",
                        "teams.teamName",
                        "teams.teamCode",
                        "mainUsers.name as mainUser",
                        "service_orders.id as SO Id",
                        "property_units.id as unitId",
                        "service_requests.completedOn",
                        "service_requests.displayId as srNo",
                        "service_orders.displayId as soNo",
                        "incident_type.descriptionEng as problemType",
                        "incident_sub_categories.descriptionEng as subCategory",
                        "completedUser.name as completedBy"

                    ])
                    .orderBy('service_requests.createdAt', 'desc')
                    .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
                    .where({ 'service_requests.isCreatedFromSo': false })
                    .where(qb => {


                        if (payload.fromDate && payload.toDate) {
                            qb.whereBetween('service_requests.createdAt', [payload.fromDate, payload.toDate])
                        }
                        if (payload.teamId && payload.teamId.length) {
                            qb.whereIn('teams.teamId', payload.teamId)
                        }
                        if (payload.buildingId && payload.buildingId.length) {
                            qb.whereIn('buildings_and_phases.id', payload.buildingId)
                        }
                        if (payload.companyId) {
                            qb.where('service_requests.companyId', payload.companyId)
                        }
                        if (payload.projectId) {
                            qb.where('service_requests.projectId', payload.projectId)
                        }
                        if (payload.categoryId) {
                            console.log("CategoryID", payload.categoryId);
                            qb.whereIn('incident_categories.id', payload.categoryId)
                        }
                        if (payload.status && payload.status.length) {
                            qb.whereIn('status.statusCode', payload.status)
                        }
                        if (payload.priority && payload.priority.length) {
                            qb.whereIn('service_requests.priority', payload.priority)
                        }
                        if (payload.requestBy) {
                            qb.where('service_requests.requestedBy', payload.requestBy)
                        }

                        qb.whereIn('service_requests.projectId', accessibleProjects)
                    })

                    .groupBy([
                        "service_requests.id",
                        "status.id",
                        "u.id",
                        "property_units.id",
                        "buildings_and_phases.id",
                        "service_problems.id",
                        "requested_by.id",
                        "assigned_service_team.id",
                        "teams.teamId",
                        "mainUsers.id",
                        "incident_categories.id",
                        // "assignUser.id",
                        // "user_house_allocation.id",
                        "service_orders.id",
                        "companies.id",
                        "projects.id",
                        "incident_type.id",
                        "incident_sub_categories.id",
                        "completedUser.id"
                    ])
                    .distinct('service_requests.id'),
                // knex
                // .from("service_requests")
                // .leftJoin(
                //     "property_units",
                //     "service_requests.houseId",
                //     "property_units.id"
                // )
                // .leftJoin(
                //     "assigned_service_team",
                //     "service_requests.id",
                //     "assigned_service_team.entityId"
                // )
                // .leftJoin(
                //     "service_status AS status",
                //     "service_requests.serviceStatusCode",
                //     "status.statusCode"
                // )
                // .leftJoin("users as u", "service_requests.requestedBy", "u.id")
                // .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
                // .leftJoin(
                //     "service_problems",
                //     "service_requests.id",
                //     "service_problems.serviceRequestId"
                // )
                // .leftJoin(
                //     "requested_by",
                //     "service_requests.requestedBy",
                //     "requested_by.id"
                // )
                // .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                // .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                // .leftJoin(
                //     "incident_categories",
                //     "service_problems.categoryId",
                //     "incident_categories.id"
                // )
                // .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")
                // .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                // .leftJoin('projects', 'service_requests.projectId', 'projects.id')

                // .select([
                //     "service_requests.id as S Id",
                //     "service_requests.description as Description",
                //     "service_requests.priority as Priority",
                //     "status.descriptionEng as Status",
                //     "property_units.unitNumber as Unit No",
                //     // "assignUser.name as Tenant Name",
                //     "requested_by.name as Requested By",
                //     "service_requests.createdAt as Date Created",
                //     "buildings_and_phases.buildingPhaseCode",
                //     "buildings_and_phases.description as buildingDescription",
                //     "incident_categories.descriptionEng as problemDescription",
                //     "requested_by.email as requestedByEmail",
                //     "teams.teamName",
                //     "teams.teamCode",
                //     "mainUsers.name as mainUser",
                //     "service_orders.id as SO Id",
                //     "property_units.id as unitId",
                //     "service_orders.displayId as SO#",
                //     "service_requests.displayId as SR#",
                //     "companies.companyName",
                //     "companies.companyId",
                //     "projects.project",
                //     "projects.projectName",
                // ])
                // .orderBy('service_requests.createdAt', 'desc')
                // .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
                // .where({ 'service_requests.isCreatedFromSo': false })
                // .where(qb => {

                //                     qb.whereIn('service_requests.projectId', accessibleProjects)

                // })
                // .groupBy([
                //     "service_requests.id",
                //     "status.id",
                //     "u.id",
                //     "property_units.id",
                //     "buildings_and_phases.id",
                //     "service_problems.id",
                //     "requested_by.id",
                //     "assigned_service_team.id",
                //     "teams.teamId",
                //     "mainUsers.id",
                //     "incident_categories.id",
                //     // "assignUser.id",
                //     // "user_house_allocation.id",
                //     "service_orders.id",
                //     "companies.id",
                //     "projects.id"
                // ])
                // .distinct('service_requests.id')
            ]);




            /** */


            // let sr = await knex.from("service_requests")
            //   .leftJoin(
            //     "property_units",
            //     "service_requests.houseId",
            //     "property_units.id"
            //   )
            //   .leftJoin(
            //     "service_status AS status",
            //     "service_requests.serviceStatusCode",
            //     "status.statusCode"
            //   )
            //   .leftJoin("users as u", "service_requests.requestedBy", "u.id")
            //   .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
            //   .leftJoin('companies', 'buildings_and_phases.companyId', 'companies.id')
            //   .leftJoin('projects', 'buildings_and_phases.projectId', 'projects.id')
            //   .leftJoin(
            //     "service_problems",
            //     "service_requests.id",
            //     "service_problems.serviceRequestId"
            //   )
            //   .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
            //   .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            //   .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
            //   .leftJoin(
            //     "incident_categories",
            //     "service_problems.categoryId",
            //     "incident_categories.id"
            //   )
            //   .leftJoin("service_orders", "service_requests.id", "service_orders.serviceRequestId")
            //   .leftJoin("requested_by", 'service_requests.requestedBy', 'requested_by.id')
            //   .select([
            //     "service_requests.id as S Id",
            //     "service_requests.houseId as houseId",
            //     "service_requests.description as Description",
            //     "service_requests.priority as Priority",
            //     "service_requests.location as Location",
            //     "status.descriptionEng as Status",
            //     "property_units.unitNumber as Unit No",
            //     "requested_by.name as Requested By",
            //     "service_requests.createdAt as Date Created",
            //     "buildings_and_phases.buildingPhaseCode",
            //     "buildings_and_phases.description as buildingDescription",
            //     "incident_categories.descriptionEng as problemDescription",
            //     // "requested_by.email as requestedByEmail",
            //     "teams.teamName",
            //     "teams.teamCode",
            //     "mainUsers.name as mainUser",
            //     "service_orders.id as SO Id",
            //     "property_units.id as unitId",
            //     "service_requests.completedOn"

            //   ])
            //   .orderBy('service_requests.createdAt', 'desc')
            //   .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
            //   .where({ 'service_requests.isCreatedFromSo': false })
            //   // .where({ "service_requests.orgId": req.orgId, 'service_requests.moderationStatus': true })
            //   // .where({ 'service_requests.isCreatedFromSo': false })
            //   // //.whereNot('status.descriptionEng', 'Cancel')
            //   .where(qb => {

            //     if (payload.fromDate && payload.toDate) {
            //       qb.whereBetween('service_requests.createdAt', [payload.fromDate, payload.toDate])
            //     }
            //     if (payload.teamId && payload.teamId.length) {
            //       qb.whereIn('teams.teamId', payload.teamId)
            //     }
            //     if (payload.buildingId && payload.buildingId.length) {
            //       qb.whereIn('buildings_and_phases.id', payload.buildingId)
            //     }
            //     if (payload.companyId) {
            //       qb.where('service_requests.companyId', payload.companyId)
            //     }
            //     if (payload.projectId) {
            //       qb.where('service_request.projectId', payload.projectId)
            //     }
            //     if (payload.categoryId) {
            //       console.log("CategoryID", payload.categoryId);
            //       qb.whereIn('incident_categories.id', payload.categoryId)
            //     }
            //     if (payload.status && payload.status.length) {
            //       qb.whereIn('status.statusCode', payload.status)
            //     }
            //     if (payload.priority && payload.priority.length) {
            //       qb.whereIn('service_requests.priority', payload.priority)
            //     }
            //     if (payload.requestBy) {
            //       qb.where('service_requests.requestedBy', payload.requestBy)
            //     }
            //     qb.whereIn('service_requests.projectId', accessibleProjects)
            //   })
            //   .groupBy([
            //     "service_requests.id",
            //     "status.id",
            //     "u.id",
            //     "property_units.id",
            //     "buildings_and_phases.id",
            //     "service_problems.id",
            //     "requested_by.id",
            //     "assigned_service_team.id",
            //     "teams.teamId",
            //     "mainUsers.id",
            //     "incident_categories.id",
            //     "service_orders.id",
            //     "companies.id",
            //     "projects.id"
            //   ])
            //   .distinct('service_requests.id')

            sr = _.uniqBy(sr, "id");



            const Parallel = require('async-parallel')
            let srWithTenant = await Parallel.map(sr, async pd => {

                let tagsResult = [];
                tagsResult = await knex('location_tags')
                    .leftJoin('location_tags_master', 'location_tags.locationTagId', 'location_tags_master.id')
                    .where({ 'location_tags.entityId': pd['S Id'], 'location_tags.entityType': 'service_requests', 'location_tags.orgId': req.orgId });

                tagsResult = _.uniqBy(tagsResult, 'title');
                tagsResult = tagsResult.map(v => v.title);
                let tag = tagsResult.toString();

                let houseResult = await knex.from('user_house_allocation').select('userId').where({ houseId: pd.unitId }).first().orderBy('id', 'desc')

                if (houseResult) {
                    let tetantResult = await knex.from('users').select('name').where({ id: houseResult.userId }).first()
                    return {
                        ...pd,
                        "Tenant Name": tetantResult.name,
                        tags: tag
                    }
                } else {
                    return {
                        ...pd,
                        "Tenant Name": '',
                        tags: tag

                    }
                }

            })


            let filterStatus = sr.filter(v => v.Status != "Cancel")


            let serviceIds = srWithTenant.map(it => it.id);

            serviceIds = _.uniqBy(serviceIds);

            let serviceProblem = await knex.from('service_problems')
                .leftJoin('service_requests', 'service_problems.serviceRequestId', 'service_requests.id')
                .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                .select([
                    'service_problems.problemId',
                    'service_problems.categoryId',
                    'service_problems.serviceRequestId',
                    'incident_type.typeCode as problemTypeCode',
                    'incident_type.descriptionEng as problemType',
                    'incident_categories.categoryCode',
                    'incident_categories.descriptionEng as category',
                    'incident_sub_categories.descriptionEng as subCategory',
                    'service_requests.serviceStatusCode',
                ])
                .groupBy([
                    "service_problems.problemId",
                    "service_problems.categoryId",
                    "service_problems.serviceRequestId",
                    "incident_type.descriptionEng",
                    "incident_type.typeCode",
                    "incident_categories.descriptionEng",
                    "incident_sub_categories.descriptionEng",
                    "service_requests.serviceStatusCode",
                    "incident_categories.categoryCode"
                ])
                .whereIn('service_problems.serviceRequestId', serviceIds)
                .where({ 'service_problems.orgId': req.orgId })
                .orderBy('incident_type.typeCode', 'asc');



            let mapData = _.chain(serviceProblem).groupBy('categoryId').map((value, key) => ({
                category: key,
                serviceOrder: value.length,
                value: value[0]
            }))

            // console.log("mapData", mapData);
            // console.log("serviceProblem", serviceProblem);

            let arr = [];
            let totalServiceOrder = 0;

            for (let md of mapData) {

                //totalServiceOrder += Number(md.serviceOrder)
                totalServiceOrder = srWithTenant.length;
                arr.push({
                    totalServiceOrder,
                    serviceOrder: md.serviceOrder,
                    problemTypeCode: md.value.problemTypeCode,
                    problemType: md.value.problemType,
                    categoryCode: md.value.categoryCode,
                    category: md.value.category,
                    subCategory: md.value.subCategory,
                })
            }


            return res.status(200).json({
                data: {
                    service_requests: srWithTenant,
                    problemData: _.orderBy(arr, "totalServiceOrder", "asc"),
                    sr,
                    serviceIds,
                    rows

                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    /*GET ALL LIST OF REQUESTED BY */
    getAllRequestedByList: async (req, res) => {

        try {

            let result = await knex.from('requested_by').where({ orgId: req.orgId }).orderBy('requested_by.name', 'asc');

            return res.status(200).json({
                data: result,
                message: "List successfully!"
            })


        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },
    /*GET SERVICE REQUEST REPORT  */
    getServiceRequestReport: async (req, res) => {

        try {


            let meData = req.me;
            let payload = req.query;
            const schema = Joi.object().keys({
                id: Joi.string().required()
            });

            const result = Joi.validate(payload, schema);
            console.log("[controllers][service][problem]: JOi Result", result);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let reportResult = await knex('service_requests')
                .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                .leftJoin('projects', 'service_requests.projectId', 'projects.id')
                .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                .leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                .select([
                    'service_requests.*',
                    'companies.*',
                    'projects.project as ProjectCode',
                    'projects.projectName',
                    'buildings_and_phases.buildingPhaseCode',
                    'buildings_and_phases.description as BuildingDescription',
                    'requested_by.name as requestedByUser',
                    'service_problems.description as serviceProblemDescription',
                    'incident_categories.categoryCode',
                    'incident_categories.descriptionEng as categoryDescription',
                    'incident_sub_categories.descriptionEng as subCategory',
                    'service_problems.createdAt as incidentDate',
                    'service_problems.serviceRequestId',
                ])
                .where('service_requests.id', payload.id).first();

            let images = await knex('images').where({ entityId: payload.id, entityType: 'service_problems' })



            return res.status(200).json({
                data: { ...reportResult, images, printedBy: meData },
                message: "Service Request Report Successfully!",
            });

        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }

    },

    /*GET REPORT BREAK BY STATUS */
    getReportByStatus: async (req, res) => {

        try {

            let payload = req.body;
            let companyId = Number(payload.companyId.id);
            let teamCode = (payload.teamId.teamCode);
            let projectId = Number(payload.projectId.id);
            // teamCode = "'" + teamCode + "'";


            let month;

            if (Number(payload.startMonth) <= 9) {

                month = "0" + Number(payload.startMonth);

            } else {
                month = Number(payload.startMonth);
            }
            let period = payload.startYear + "-" + month;


            let result = await knex.raw(`select a.Stat ,b."1",b."2",b."3",b."4",b."5",b."6",b."7",b."8",b."9",b."10",b."11",b."12",b."13",b."14",b."15",b."16",b."17",b."18",b."19",b."20",b."21",b."22",b."23",b."24",b."25",b."26",b."27",b."28",b."29",b."30",b."31" from (select'Open+Under Survey' Stat, 1 Sort union select'Approved', 3 union select'On-Hold', 4 union select 'In Progress', 5 union select'Completed', 6) a LEFT OUTER JOIN( select case when P."serviceStatusCode" in ('O','US') then 'Open+Under Survey' else case when P."serviceStatusCode" = 'A' then 'Approved' else case when P."serviceStatusCode" = 'OH' then 'On-Hold' else case when P."serviceStatusCode" = 'COM' then 'Completed' else 'In Progress' end end end end Stat, SUM(P."D01") as "1" , SUM(P."D02") as "2", SUM(P."D03") as "3" , SUM(P."D04") as "4", SUM(P."D05") as "5", SUM(P."D06") as "6", SUM(P."D07") as "7", SUM(P."D08") as "8", SUM(P."D09") as "9", SUM(P."D10") as "10", SUM(P."D11") as "11", SUM(P."D12") as "12", SUM(P."D13") as "13", SUM(P."D14") as "14", SUM(P."D15") as "15", SUM(P."D16") as "16", SUM(P."D17") as "17" , SUM(P."D18") as "18", SUM(P."D19") as "19", SUM(P."D20") as "20", SUM(P."D21") as "21", SUM(P."D22") as "22", SUM(P."D23") as "23", SUM(P."D24") as "24", SUM(P."D25") as "25", SUM(P."D26") as "26", SUM(P."D27") as "27", SUM(P."D28") as "28", SUM(P."D29") as "29", SUM(P."D30") as "30", SUM(P."D31") as "31", SUM(P."TOTAL") as "TOTAL"  from (select sr."orgId" ,sr.id, sr."serviceStatusCode", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '1' then 1 else null end as "D01",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '2' then 1 else null end as "D02",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '3' then 1 else null end as "D03", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '4' then 1 else null end as "D04",  case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '5' then 1 else null end as "D05", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '6' then 1 else null end as "D06", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '7' then 1 else null end as "D07", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '8' then 1 else null end as "D08", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '9' then 1 else null end as "D09", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '10' then 1 else null end as "D10",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '11' then 1 else null end as "D11",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '12' then 1 else null end as "D12",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '13' then 1 else null end as "D13", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '14' then 1 else null end as "D14", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '15' then 1 else null end as "D15", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '16' then 1 else null end as "D16", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '17' then 1 else null end as "D17", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '18' then 1 else null end as "D18", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '19' then 1 else null end as "D19", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '20' then 1 else null end as "D20",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '21' then 1 else null end as "D21",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '22' then 1 else null end as "D22",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '23' then 1 else null end as "D23", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '24' then 1 else null end as "D24", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '25' then 1 else null end as "D25", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '26' then 1 else null end as "D26", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '27' then 1 else null end as "D27", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '28' then 1 else null end as "D28", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '29' then 1 else null end as "D29", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '30' then 1 else null end as "D30",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '31' then 1 else null end as "D31",case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then 1 else null end as "TOTAL" from service_requests sr where sr."orgId" = ${req.orgId} and  sr."companyId" = ${companyId}and sr."projectId" = ${projectId} and sr."moderationStatus" = true  and sr."serviceStatusCode" != 'C' and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' and public.f_get_teamname(sr."orgId" ,sr.id) in ('${teamCode}')) P group by  case when P."serviceStatusCode" in ('O','US') then 'Open+Under Survey' else case when P."serviceStatusCode" = 'A' then 'Approved' else case when P."serviceStatusCode" = 'OH' then 'On-Hold' else case when P."serviceStatusCode" = 'COM' then 'Completed' else 'In Progress' end end end end) b ON  a.stat = b.stat order by sort`)


            //  let result = await knex.raw(`select a.Stat ,b."1",b."2",b."3",b."4",b."5",b."6",b."7",b."8",b."9",b."10",b."11",b."12",b."13",b."14",b."15",b."16",b."17",b."18",b."19",b."20",b."21",b."22",b."23",b."24",b."25" ,b."26",b."27",b."28",b."29",b."30",b."31" from (select 'Open+Under Survey' Stat, 1 Sort union select 'Approved', 3 union select 'On-Hold', 4 union select 'In Progress', 5 union select 'Completed', 6) a LEFT OUTER JOIN ( select case when P."serviceStatusCode" in ('O','US') then 'Open+Under Survey' else case when P."serviceStatusCode" = 'A' then 'Approved' else case when P."serviceStatusCode" = 'OH' then 'On-Hold' else case when P."serviceStatusCode" = 'COM' then 'Completed' else 'In Progress' end end end end Stat , SUM(P."D01") as "1" , SUM(P."D02") as "2", SUM(P."D03") as "3", SUM(P."D04") as "4", SUM(P."D05") as "5", SUM(P."D06") as "6" , SUM(P."D07") as "7" , SUM(P."D08") as "8", SUM(P."D09") as "9" , SUM(P."D10") as "10", SUM(P."D11") as "11" , SUM(P."D12") as "12" , SUM(P."D13") as "13" , SUM(P."D14") as "14" , SUM(P."D15") as "15" , SUM(P."D16") as "16" , SUM(P."D17") as "17" , SUM(P."D18") as "18", SUM(P."D19") as "19", SUM(P."D20") as "20", SUM(P."D21") as "21", SUM(P."D22") as "22", SUM(P."D23") as "23", SUM(P."D24") as "24", SUM(P."D25") as "25", SUM(P."D26") as "26", SUM(P."D27") as "27", SUM(P."D28") as "28", SUM(P."D29") as "29", SUM(P."D30") as "30", SUM(P."D31") as "31", SUM(P."TOTAL") as "TOTAL" from (select sr."orgId" ,sr.id, sr."serviceStatusCode", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '1' then 1 else null end as "D01",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '2' then 1 else null end as "D02", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '3' then 1 else null end as "D03",  case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '4' then 1 else null end as "D04", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '5' then 1 else null end as "D05", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '6' then 1 else null end as "D06", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '7' then 1 else null end as "D07", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '8' then 1 else null end as "D08", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '9' then 1 else null end as "D09", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '10' then 1 else null end as "D10", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '11' then 1 else null end as "D11", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '12' then 1 else null end as "D12", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '13' then 1 else null end as "D13",  case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '14' then 1 else null end as "D14", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '15' then 1 else null end as "D15", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '16' then 1 else null end as "D16", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '17' then 1 else null end as "D17", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '18' then 1 else null end as "D18", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '19' then 1 else null end as "D19", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '20' then 1 else null end as "D20",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '21' then 1 else null end as "D21",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '22' then 1 else null end as "D22",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '23' then 1 else null end as "D23", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '24' then 1 else null end as "D24", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '25' then 1 else null end as "D25", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '26' then 1 else null end as "D26",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '27' then 1 else null end as "D27", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '28' then 1 else null end as "D28", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '29' then 1 else null end as "D29", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '30' then 1 else null end as "D30", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '31' then 1 else null end as "D31",case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then 1 else null end as "TOTAL" from service_requests sr where sr."orgId" = ${req.orgId} and  sr."companyId" = ${companyId} and sr."moderationStatus" = true and sr."serviceStatusCode" != 'C' and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' and public.f_get_teamname(sr."orgId" ,sr.id) in ('${teamCode}')) P group by  case when P."serviceStatusCode" in ('O','US') then 'Open+Under Survey' else case when P."serviceStatusCode" = 'A' then 'Approved' else case when P."serviceStatusCode" = 'OH' then 'On-Hold' else case when P."serviceStatusCode" = 'COM' then 'Completed' else 'In Progress' end end end end) b ON  a.stat = b.stat order by sort`)


            const Parallel = require('async-parallel');
            let total1 = 0;
            let total2 = 0;
            let total3 = 0;
            let total4 = 0;
            let total5 = 0;
            let total6 = 0;
            let total7 = 0;
            let total8 = 0;
            let total9 = 0;
            let total10 = 0;
            let total11 = 0;
            let total12 = 0;
            let total13 = 0;
            let total14 = 0;
            let total15 = 0;
            let total16 = 0;
            let total17 = 0;
            let total18 = 0;
            let total19 = 0;
            let total20 = 0;
            let total21 = 0;
            let total22 = 0;
            let total23 = 0;
            let total24 = 0;
            let total25 = 0;
            let total26 = 0;
            let total27 = 0;
            let total28 = 0;
            let total29 = 0;
            let total30 = 0;
            let total31 = 0;
            let totalValue = 0;
            let TOTAL;
            let arr = [];

            result.rows = await Parallel.map(result.rows, async st => {


                TOTAL = (Number(st["1"]) + Number(st["2"]) + Number(st["3"]) + Number(st["4"]) + Number(st["5"]) + Number(st["6"]) + Number(st["7"]) + Number(st["8"]) + Number(st["9"]) + Number(st["10"]) + Number(st["11"]) + Number(st["12"]) + Number(st["13"]) + Number(st["14"]) + Number(st["15"]) + Number(st["16"]) + Number(st["17"]) + Number(st["18"]) + Number(st["19"]) + Number(st["20"]) + Number(st["21"]) + Number(st["22"]) + Number(st["23"]) + Number(st["24"]) + Number(st["25"]) + Number(st["26"]) + Number(st["27"]) + Number(st["28"]) + Number(st["29"]) + Number(st["30"]) + Number(st["31"]));

                arr.push(TOTAL);

                total1 += Number(st["1"]);
                total2 += Number(st["2"]);
                total3 += Number(st["3"]);
                total4 += Number(st["4"]);
                total5 += Number(st["5"]);
                total6 += Number(st["6"]);
                total7 += Number(st["7"]);
                total8 += Number(st["8"]);
                total9 += Number(st["9"]);
                total10 += Number(st["10"]);
                total11 += Number(st["11"]);
                total12 += Number(st["12"]);
                total13 += Number(st["13"]);
                total14 += Number(st["14"]);
                total15 += Number(st["15"]);
                total16 += Number(st["16"]);
                total17 += Number(st["17"]);
                total18 += Number(st["18"]);
                total19 += Number(st["19"]);
                total20 += Number(st["20"]);
                total21 += Number(st["21"]);
                total22 += Number(st["22"]);
                total23 += Number(st["23"]);
                total24 += Number(st["24"]);
                total25 += Number(st["25"]);
                total26 += Number(st["26"]);
                total27 += Number(st["27"]);
                total28 += Number(st["28"]);
                total29 += Number(st["29"]);
                total30 += Number(st["30"]);
                total31 += Number(st["31"]);
                totalValue += TOTAL;

                let sumTotal = arr.reduce(function (a, b) {
                    return a + b;
                }, 0);

                return {
                    ...st,
                    total1,
                    total2,
                    total3,
                    total4,
                    total5,
                    total6,
                    total7,
                    total8,
                    total9,
                    total10,
                    total11,
                    total12,
                    total13,
                    total14,
                    total15,
                    total16,
                    total17,
                    total18,
                    total19,
                    total20,
                    total21,
                    total22,
                    total23,
                    total24,
                    total25,
                    total26,
                    total27,
                    total28,
                    total29,
                    total30,
                    total31,
                    totalValue: sumTotal,
                    TOTAL: TOTAL,
                    arr
                };

            })


            let final = [];
            let grouped = _.groupBy(result.rows, "stat");
            final.push(grouped);

            let chartData = _.flatten(final.filter(v => !_.isEmpty(v)).map(v => _.keys(v).map(p => ({

                [p]: (v[p][0].TOTAL)

            })))).reduce((a, p) => {

                let l = _.keys(p)[0];
                if (a[l]) {
                    a[l] += p[l];

                } else {
                    a[l] = p[l];
                }
                return a;
            }, {});



            return res.status(200).json({
                data: result.rows,
                companyId,
                teamCode,
                period,
                chartData,
                companyName: payload.companyId.CompanyName,
                teamName: payload.teamId.teamName,
                message: "Report Break By Status Successfully!",
            });



        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }


    },

    /*GET REPORT BREAK BY TEAM */
    getReportByTeam: async (req, res) => {

        try {

            let payload = req.body;
            let companyId = Number(payload.companyId.id);
            let teamCode = (payload.teamId.teamCode);
            let projectId = Number(payload.projectId.id);


            let month;

            if (Number(payload.startMonth) <= 9) {

                month = "0" + Number(payload.startMonth);

            } else {
                month = Number(payload.startMonth);
            }

            // teamCode = "'" + teamCode + "'";
            let period = payload.startYear + "-" + month;
            let result = await knex.raw(`select public.f_get_teamname(P."orgId" ,P.id) TEAM, SUM(P."D01") as "1", SUM(P."D02") as "2", SUM(P."D03") as "3", SUM(P."D04") as "4", SUM(P."D05") as "5", SUM(P."D06") as "6", SUM(P."D07") as "7", SUM(P."D08") as "8", SUM(P."D09") as "9", SUM(P."D10") as "10", SUM(P."D11") as "11", SUM(P."D12") as "12", SUM(P."D13") as "13", SUM(P."D14") as "14", SUM(P."D15") as "15", SUM(P."D16") as "16", SUM(P."D17") as "17", SUM(P."D18") as "18", SUM(P."D19") as "19", SUM(P."D20") as "20", SUM(P."D21") as "21", SUM(P."D22") as "22", SUM(P."D23") as "23", SUM(P."D24") as "24", SUM(P."D25") as "25", SUM(P."D26") as "26", SUM(P."D27") as "27", SUM(P."D28") as "28", SUM(P."D29") as "29", SUM(P."D30") as "30", SUM(P."D31") as "31", SUM(P."Incomplete")  as "Incomplete", round(SUM(P."Incomplete")*100./SUM(P."TOTAL"),2) as "Incomplete(%)", SUM(P."Completed") as "Completed", 100-round(SUM(P."Incomplete")*100./SUM(P."TOTAL"),2) as "Completed(%)" , SUM(P."TOTAL") as "TOTAL" from (select sr."orgId" ,sr.id,case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '1' then 1 else null end as "D01",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '2' then 1 else null end as "D02",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '3' then 1 else null end as "D03", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '4' then 1 else null end as "D04", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '5' then 1 else null end as "D05", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '6' then 1 else null end as "D06", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '7' then 1 else null end as "D07", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '8' then 1 else null end as "D08", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '9' then 1 else null end as "D09", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '10' then 1 else null end as "D10",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '11' then 1 else null end as "D11",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '12' then 1 else null end as "D12",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '13' then 1 else null end as "D13", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '14' then 1 else null end as "D14", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '15' then 1 else null end as "D15", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '16' then 1 else null end as "D16", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '17' then 1 else null end as "D17", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '18' then 1 else null end as "D18", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '19' then 1 else null end as "D19", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '20' then 1 else null end as "D20",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '21' then 1 else null end as "D21",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '22' then 1 else null end as "D22",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '23' then 1 else null end as "D23", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '24' then 1 else null end as "D24", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '25' then 1 else null end as "D25", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '26' then 1 else null end as "D26", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '27' then 1 else null end as "D27", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '28' then 1 else null end as "D28", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '29' then 1 else null end as "D29", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '30' then 1 else null end as "D30",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '31' then 1 else null end as "D31",case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then case when sr."serviceStatusCode" = 'COM' then 0 else 1 end else null end as "Incomplete", case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then case when sr."serviceStatusCode" = 'COM' then 1 else null end else null end as "Completed", case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then 1 else null end as "TOTAL" from service_requests sr where sr."orgId" = ${req.orgId} and sr."companyId" = ${companyId} and sr."projectId" = ${projectId} and sr."moderationStatus" = true  and sr."serviceStatusCode" != 'C' and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}') P group by public.f_get_teamname(P."orgId" ,P.id) order by 1`);
            //let result = await knex.raw(`select public.f_get_teamname(P."orgId" ,P.id) TEAM, SUM(P."D01") as "1", SUM(P."D02") as "2", SUM(P."D03") as "3", SUM(P."D04") as "4", SUM(P."D05") as "5", SUM(P."D06") as "6" , SUM(P."D07") as "7", SUM(P."D08") as "8" , SUM(P."D09") as "9" , SUM(P."D10") as "10" , SUM(P."D11") as "11", SUM(P."D12") as "12" , SUM(P."D13") as "13", SUM(P."D14") as "14", SUM(P."D15") as "15", SUM(P."D16") as "16", SUM(P."D17") as "17" , SUM(P."D18") as "18" , SUM(P."D19") as "19" , SUM(P."D20") as "20", SUM(P."D21") as "21", SUM(P."D22") as "22", SUM(P."D23") as "23", SUM(P."D24") as "24" , SUM(P."D25") as "25" , SUM(P."D26") as "26", SUM(P."D27") as "27", SUM(P."D28") as "28", SUM(P."D29") as "29", SUM(P."D30") as "30" , SUM(P."D31") as "31", SUM(P."TOTAL") as "TOTAL" from (select sr."orgId" ,sr.id, case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '1' then 1 else null end as "D01",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '2' then 1 else null end as "D02",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '3' then 1 else null end as "D03", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '4' then 1 else null end as "D04", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '5' then 1 else null end as "D05", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '6' then 1 else null end as "D06", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '7' then 1 else null end as "D07", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '8' then 1 else null end as "D08", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '9' then 1 else null end as "D09", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '10' then 1 else null end as "D10", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '11' then 1 else null end as "D11",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '12' then 1 else null end as "D12",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '13' then 1 else null end as "D13", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '14' then 1 else null end as "D14",  case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '15' then 1 else null end as "D15",  case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '16' then 1 else null end as "D16", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '17' then 1 else null end as "D17", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '18' then 1 else null end as "D18", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '19' then 1 else null end as "D19", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '20' then 1 else null end as "D20",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '21' then 1 else null end as "D21",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '22' then 1 else null end as "D22", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '23' then 1 else null end as "D23", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '24' then 1 else null end as "D24", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '25' then 1 else null end as "D25",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '26' then 1 else null end as "D26", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '27' then 1 else null end as "D27", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '28' then 1 else null end as "D28", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '29' then 1 else null end as "D29", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '30' then 1 else null end as "D30",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '31' then 1 else null end as "D31",case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then 1 else null end as "TOTAL" from service_requests sr where sr."orgId" = ${req.orgId} and  sr."companyId" = ${companyId} and sr."projectId" = ${projectId} and sr."moderationStatus" = true and sr."serviceStatusCode" != 'C' and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}') P group by public.f_get_teamname(P."orgId" ,P.id) order by 1`);



            const Parallel = require('async-parallel');
            let total1 = 0;
            let total2 = 0;
            let total3 = 0;
            let total4 = 0;
            let total5 = 0;
            let total6 = 0;
            let total7 = 0;
            let total8 = 0;
            let total9 = 0;
            let total10 = 0;
            let total11 = 0;
            let total12 = 0;
            let total13 = 0;
            let total14 = 0;
            let total15 = 0;
            let total16 = 0;
            let total17 = 0;
            let total18 = 0;
            let total19 = 0;
            let total20 = 0;
            let total21 = 0;
            let total22 = 0;
            let total23 = 0;
            let total24 = 0;
            let total25 = 0;
            let total26 = 0;
            let total27 = 0;
            let total28 = 0;
            let total29 = 0;
            let total30 = 0;
            let total31 = 0;
            let totalValue = 0;
            let totalIncomplete = 0;
            let totalComplete = 0;
            let totalIncompletePercentage = 0;
            let totalCompletePercentage = 0;

            let arr = [];

            for (let d of result.rows) {

                if (d.team) {

                    arr.push({ ...d });

                }

            }

            result.rows = await Parallel.map(arr, async st => {


                total1 += Number(st["1"]);
                total2 += Number(st["2"]);
                total3 += Number(st["3"]);
                total4 += Number(st["4"]);
                total5 += Number(st["5"]);
                total6 += Number(st["6"]);
                total7 += Number(st["7"]);
                total8 += Number(st["8"]);
                total9 += Number(st["9"]);
                total10 += Number(st["10"]);
                total11 += Number(st["11"]);
                total12 += Number(st["12"]);
                total13 += Number(st["13"]);
                total14 += Number(st["14"]);
                total15 += Number(st["15"]);
                total16 += Number(st["16"]);
                total17 += Number(st["17"]);
                total18 += Number(st["18"]);
                total19 += Number(st["19"]);
                total20 += Number(st["20"]);
                total21 += Number(st["21"]);
                total22 += Number(st["22"]);
                total23 += Number(st["23"]);
                total24 += Number(st["24"]);
                total25 += Number(st["25"]);
                total26 += Number(st["26"]);
                total27 += Number(st["27"]);
                total28 += Number(st["28"]);
                total29 += Number(st["29"]);
                total30 += Number(st["30"]);
                total31 += Number(st["31"]);
                totalValue += Number(st['TOTAL']);

                totalIncomplete += Number(st['Incomplete']);
                totalComplete += Number(st["Completed"]);

                totalIncompletePercentage = (100 * (totalIncomplete) / totalValue);
                totalCompletePercentage = (100 * (totalComplete) / totalValue);
                totalIncompletePercentage = totalIncompletePercentage.toFixed(2);
                totalCompletePercentage = totalCompletePercentage.toFixed(2);

                return {
                    ...st,
                    total1,
                    total2,
                    total3,
                    total4,
                    total5,
                    total6,
                    total7,
                    total8,
                    total9,
                    total10,
                    total11,
                    total12,
                    total13,
                    total14,
                    total15,
                    total16,
                    total17,
                    total18,
                    total19,
                    total20,
                    total21,
                    total22,
                    total23,
                    total24,
                    total25,
                    total26,
                    total27,
                    total28,
                    total29,
                    total30,
                    total31,
                    totalValue,
                    totalIncomplete,
                    totalComplete,
                    totalIncompletePercentage,
                    totalCompletePercentage,
                };

            })


            let final = [];

            let grouped = _.groupBy(result.rows, "team");
            final.push(grouped);

            let chartData = _.flatten(final.filter(v => !_.isEmpty(v)).map(v => _.keys(v).map(p => ({

                [p]: (v[p][0].TOTAL)

            })))).reduce((a, p) => {

                let l = _.keys(p)[0];
                // console.log("===============", a[l], "======================")

                if (a[l]) {
                    a[l] += p[l];

                } else {
                    a[l] = p[l];
                }
                return a;
            }, {});

            return res.status(200).json({
                data: result.rows,
                companyId,
                teamCode,
                period,
                chartData,
                grouped,
                companyName: payload.companyId.CompanyName,
                teamName: payload.teamId.teamName,
                message: "Report Break By Team Successfully!",
            });



        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }


    }

    ,


    /*GET REPORT BREAK BY SYSTEM */
    getReportBySystem: async (req, res) => {

        try {

            let payload = req.body;
            let companyId = Number(payload.companyId.id);
            let teamCode = (payload.teamId.teamCode);
            let projectId = Number(payload.projectId.id);

            // teamCode = "'" + teamCode + "'";


            let month;

            if (Number(payload.startMonth) <= 9) {

                month = "0" + Number(payload.startMonth);

            } else {
                month = Number(payload.startMonth);
            }
            let period = payload.startYear + "-" + month;


            let result = await knex.raw(`select public.f_get_problem_types(P."orgId" ,P.id) as "Type" , SUM(P."D01") as "1", SUM(P."D02") as "2", SUM(P."D03") as "3", SUM(P."D04") as "4", SUM(P."D05") as "5", SUM(P."D06") as "6", SUM(P."D07") as "7", SUM(P."D08") as "8", SUM(P."D09") as "9", SUM(P."D10") as "10", SUM(P."D11") as "11", SUM(P."D12") as "12", SUM(P."D13") as "13", SUM(P."D14") as "14", SUM(P."D15") as "15", SUM(P."D16") as "16", SUM(P."D17") as "17", SUM(P."D18") as "18", SUM(P."D19") as "19", SUM(P."D20") as "20", SUM(P."D21") as "21", SUM(P."D22") as "22", SUM(P."D23") as "23", SUM(P."D24") as "24", SUM(P."D25") as "25", SUM(P."D26") as "26", SUM(P."D27") as "27", SUM(P."D28") as "28", SUM(P."D29") as "29", SUM(P."D30") as "30", SUM(P."D31") as "31", SUM(P."Incomplete")  as "Incomplete", round(SUM(P."Incomplete")*100./SUM(P."TOTAL"),2) as "Incomplete(%)", SUM(P."Completed") as "Completed", 100-round(SUM(P."Incomplete")*100./SUM(P."TOTAL"),2) as "Completed(%)" , SUM(P."TOTAL") as "TOTAL" from (select sr."orgId" ,sr.id, "houseId",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '1' then 1 else null end as "D01", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '2' then 1 else null end as "D02",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '3' then 1 else null end as "D03", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '4' then 1 else null end as "D04", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '5' then 1 else null end as "D05", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '6' then 1 else null end as "D06", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '7' then 1 else null end as "D07", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '8' then 1 else null end as "D08", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '9' then 1 else null end as "D09", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '10' then 1 else null end as "D10",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '11' then 1 else null end as "D11",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '12' then 1 else null end as "D12",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '13' then 1 else null end as "D13", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '14' then 1 else null end as "D14", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '15' then 1 else null end as "D15", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '16' then 1 else null end as "D16", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '17' then 1 else null end as "D17", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '18' then 1 else null end as "D18", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '19' then 1 else null end as "D19", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '20' then 1 else null end as "D20",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '21' then 1 else null end as "D21",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '22' then 1 else null end as "D22",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '23' then 1 else null end as "D23", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '24' then 1 else null end as "D24", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '25' then 1 else null end as "D25", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '26' then 1 else null end as "D26", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '27' then 1 else null end as "D27", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '28' then 1 else null end as "D28", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '29' then 1 else null end as "D29", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '30' then 1 else null end as "D30",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '31' then 1 else null end as "D31",case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then case when sr."serviceStatusCode" = 'COM' then 0 else 1 end else null end as "Incomplete", case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then case when sr."serviceStatusCode" = 'COM' then 1 else null end else null end as "Completed", case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then 1 else null end as "TOTAL" from service_requests sr where sr."orgId" = ${req.orgId} and sr."companyId" = ${companyId} and sr."projectId" = ${projectId} and sr."moderationStatus" = true  and sr."serviceStatusCode" != 'C' and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' and public.f_get_teamname(sr."orgId" ,sr.id) in ('${teamCode}')) P group by public.f_get_problem_types(P."orgId" ,P.id)`);

            //let result = await knex.raw(`select public.f_get_problem_types(P."orgId" ,P.id) as "Type" , SUM(P."D01") as "1" , SUM(P."D02") as "2", SUM(P."D03") as "3", SUM(P."D04") as "4" , SUM(P."D05") as "5" , SUM(P."D06") as "6" , SUM(P."D07") as "7", SUM(P."D08") as "8", SUM(P."D09") as "9" , SUM(P."D10") as "10" , SUM(P."D11") as "11", SUM(P."D12") as "12", SUM(P."D13") as "13", SUM(P."D14") as "14", SUM(P."D15") as "15", SUM(P."D16") as "16", SUM(P."D17") as "17", SUM(P."D18") as "18", SUM(P."D19") as "19", SUM(P."D20") as "20", SUM(P."D21") as "21", SUM(P."D22") as "22", SUM(P."D23") as "23", SUM(P."D24") as "24", SUM(P."D25") as "25", SUM(P."D26") as "26", SUM(P."D27") as "27", SUM(P."D28") as "28", SUM(P."D29") as "29", SUM(P."D30") as "30", SUM(P."D31") as "31", SUM(P."TOTAL") as "TOTAL" from (select sr."orgId" ,sr.id, "houseId",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '1' then 1 else null end as "D01",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '2' then 1 else null end as "D02", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '3' then 1 else null end as "D03", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '4' then 1 else null end as "D04",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '5' then 1 else null end as "D05", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '6' then 1 else null end as "D06", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '7' then 1 else null end as "D07", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '8' then 1 else null end as "D08", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '9' then 1 else null end as "D09", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '10' then 1 else null end as "D10",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '11' then 1 else null end as "D11",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '12' then 1 else null end as "D12",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '13' then 1 else null end as "D13", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '14' then 1 else null end as "D14",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '15' then 1 else null end as "D15", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '16' then 1 else null end as "D16", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '17' then 1 else null end as "D17", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '18' then 1 else null end as "D18", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '19' then 1 else null end as "D19", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '20' then 1 else null end as "D20",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '21' then 1 else null end as "D21",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '22' then 1 else null end as "D22",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '23' then 1 else null end as "D23",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '24' then 1 else null end as "D24", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '25' then 1 else null end as "D25", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '26' then 1 else null end as "D26", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '27' then 1 else null end as "D27", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '28' then 1 else null end as "D28", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '29' then 1 else null end as "D29", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '30' then 1 else null end as "D30",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '31' then 1 else null end as "D31",case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then 1 else null end as "TOTAL" from service_requests sr where sr."orgId" = ${req.orgId} and  sr."companyId" = ${companyId} and sr."projectId" = ${projectId} and sr."moderationStatus" = true and sr."serviceStatusCode" != 'C' and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' and public.f_get_teamname(sr."orgId" ,sr.id) in ('${teamCode}')) P group by public.f_get_problem_types(P."orgId" ,P.id) order by 1`)


            const Parallel = require('async-parallel');
            let total1 = 0;
            let total2 = 0;
            let total3 = 0;
            let total4 = 0;
            let total5 = 0;
            let total6 = 0;
            let total7 = 0;
            let total8 = 0;
            let total9 = 0;
            let total10 = 0;
            let total11 = 0;
            let total12 = 0;
            let total13 = 0;
            let total14 = 0;
            let total15 = 0;
            let total16 = 0;
            let total17 = 0;
            let total18 = 0;
            let total19 = 0;
            let total20 = 0;
            let total21 = 0;
            let total22 = 0;
            let total23 = 0;
            let total24 = 0;
            let total25 = 0;
            let total26 = 0;
            let total27 = 0;
            let total28 = 0;
            let total29 = 0;
            let total30 = 0;
            let total31 = 0;
            let totalValue = 0;
            let totalIncomplete = 0;
            let totalComplete = 0;
            let totalIncompletePercentage = 0;
            let totalCompletePercentage = 0;

            result.rows = await Parallel.map(result.rows, async st => {


                total1 += Number(st["1"]);
                total2 += Number(st["2"]);
                total3 += Number(st["3"]);
                total4 += Number(st["4"]);
                total5 += Number(st["5"]);
                total6 += Number(st["6"]);
                total7 += Number(st["7"]);
                total8 += Number(st["8"]);
                total9 += Number(st["9"]);
                total10 += Number(st["10"]);
                total11 += Number(st["11"]);
                total12 += Number(st["12"]);
                total13 += Number(st["13"]);
                total14 += Number(st["14"]);
                total15 += Number(st["15"]);
                total16 += Number(st["16"]);
                total17 += Number(st["17"]);
                total18 += Number(st["18"]);
                total19 += Number(st["19"]);
                total20 += Number(st["20"]);
                total21 += Number(st["21"]);
                total22 += Number(st["22"]);
                total23 += Number(st["23"]);
                total24 += Number(st["24"]);
                total25 += Number(st["25"]);
                total26 += Number(st["26"]);
                total27 += Number(st["27"]);
                total28 += Number(st["28"]);
                total29 += Number(st["29"]);
                total30 += Number(st["30"]);
                total31 += Number(st["31"]);
                totalValue += Number(st['TOTAL']);
                totalIncomplete += Number(st['Incomplete']);
                totalComplete += Number(st["Completed"]);

                totalIncompletePercentage = (100 * (totalIncomplete) / totalValue);
                totalCompletePercentage = (100 * (totalComplete) / totalValue);
                totalIncompletePercentage = totalIncompletePercentage.toFixed(2);
                totalCompletePercentage = totalCompletePercentage.toFixed(2);

                return {
                    ...st,
                    total1,
                    total2,
                    total3,
                    total4,
                    total5,
                    total6,
                    total7,
                    total8,
                    total9,
                    total10,
                    total11,
                    total12,
                    total13,
                    total14,
                    total15,
                    total16,
                    total17,
                    total18,
                    total19,
                    total20,
                    total21,
                    total22,
                    total23,
                    total24,
                    total25,
                    total26,
                    total27,
                    total28,
                    total29,
                    total30,
                    total31,
                    totalValue,
                    totalIncomplete,
                    totalComplete,
                    totalIncompletePercentage,
                    totalCompletePercentage,

                };

            })
            let final = [];
            let grouped = _.groupBy(result.rows, "Type");
            final.push(grouped);

            let chartData = _.flatten(final.filter(v => !_.isEmpty(v)).map(v => _.keys(v).map(p => ({

                [p]: (v[p][0].TOTAL)

            })))).reduce((a, p) => {

                let l = _.keys(p)[0];
                if (a[l]) {
                    a[l] += p[l];

                } else {
                    a[l] = p[l];
                }
                return a;
            }, {});


            return res.status(200).json({
                data: result.rows,
                companyId,
                teamCode,
                period,
                chartData,
                companyName: payload.companyId.CompanyName,
                teamName: payload.teamId.teamName,
                message: "Report Break By System Successfully!",
            });



        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }


    },

    /*GET REPORT BREAK BY TAG */
    getReportByTag: async (req, res) => {

        try {

            let payload = req.body;
            let companyId = Number(payload.companyId.id);
            let teamCode = (payload.teamId.teamCode);
            let projectId = Number(payload.projectId.id);

            // teamCode = "'" + teamCode + "'";

            let month;

            if (Number(payload.startMonth) <= 9) {

                month = "0" + Number(payload.startMonth);

            } else {
                month = Number(payload.startMonth);
            }
            let period = payload.startYear + "-" + month;
            let result = await knex.raw(`select public.f_get_user_category(P."orgId",P."houseId") as "Tags" , SUM(P."D01") as "1", SUM(P."D02") as "2", SUM(P."D03") as "3", SUM(P."D04") as "4", SUM(P."D05") as "5", SUM(P."D06") as "6", SUM(P."D07") as "7", SUM(P."D08") as "8", SUM(P."D09") as "9", SUM(P."D10") as "10", SUM(P."D11") as "11", SUM(P."D12") as "12", SUM(P."D13") as "13", SUM(P."D14") as "14", SUM(P."D15") as "15", SUM(P."D16") as "16", SUM(P."D17") as "17", SUM(P."D18") as "18", SUM(P."D19") as "19", SUM(P."D20") as "20", SUM(P."D21") as "21", SUM(P."D22") as "22", SUM(P."D23") as "23", SUM(P."D24") as "24", SUM(P."D25") as "25", SUM(P."D26") as "26", SUM(P."D27") as "27", SUM(P."D28") as "28", SUM(P."D29") as "29", SUM(P."D30") as "30", SUM(P."D31") as "31", SUM(P."Incomplete")  as "Incomplete", round(SUM(P."Incomplete")*100./SUM(P."TOTAL"),2) as "Incomplete(%)", SUM(P."Completed") as "Completed", 100-round(SUM(P."Incomplete")*100./SUM(P."TOTAL"),2) as "Completed(%)" , SUM(P."TOTAL") as "TOTAL" from (select sr."orgId" ,sr.id, "houseId",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '1' then 1 else null end as "D01",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '2' then 1 else null end as "D02",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '3' then 1 else null end as "D03", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '4' then 1 else null end as "D04", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '5' then 1 else null end as "D05", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '6' then 1 else null end as "D06", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '7' then 1 else null end as "D07", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '8' then 1 else null end as "D08", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '9' then 1 else null end as "D09", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '10' then 1 else null end as "D10",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '11' then 1 else null end as "D11",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '12' then 1 else null end as "D12",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '13' then 1 else null end as "D13", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '14' then 1 else null end as "D14", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '15' then 1 else null end as "D15", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '16' then 1 else null end as "D16", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '17' then 1 else null end as "D17", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '18' then 1 else null end as "D18", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '19' then 1 else null end as "D19", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '20' then 1 else null end as "D20",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '21' then 1 else null end as "D21",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '22' then 1 else null end as "D22",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '23' then 1 else null end as "D23", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '24' then 1 else null end as "D24", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '25' then 1 else null end as "D25", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '26' then 1 else null end as "D26", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '27' then 1 else null end as "D27", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '28' then 1 else null end as "D28", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '29' then 1 else null end as "D29", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '30' then 1 else null end as "D30",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '31' then 1 else null end as "D31",case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then case when sr."serviceStatusCode" = 'COM' then 0 else 1 end else null end as "Incomplete", case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then case when sr."serviceStatusCode" = 'COM' then 1 else null end else null end as "Completed", case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then 1 else null end as "TOTAL" from service_requests sr where sr."orgId" = ${req.orgId} and sr."companyId" = ${companyId} and sr."projectId" = ${projectId} and sr."moderationStatus" = true and sr."serviceStatusCode" != 'C' and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' and public.f_get_teamname(sr."orgId" ,sr.id) in ('${teamCode}')) P group by public.f_get_user_category(P."orgId",P."houseId") order by 1`);
            //let result = await knex.raw(`select public.f_get_user_category(P."orgId",P."houseId") as "Tags" , SUM(P."D01") as "1", SUM(P."D02") as "2", SUM(P."D03") as "3", SUM(P."D04") as "4", SUM(P."D05") as "5", SUM(P."D06") as "6", SUM(P."D07") as "7", SUM(P."D08") as "8" , SUM(P."D09") as "9", SUM(P."D10") as "10", SUM(P."D11") as "11" , SUM(P."D12") as "12", SUM(P."D13") as "13", SUM(P."D14") as "14", SUM(P."D15") as "15" , SUM(P."D16") as "16", SUM(P."D17") as "17", SUM(P."D18") as "18", SUM(P."D19") as "19", SUM(P."D20") as "20", SUM(P."D21") as "21", SUM(P."D22") as "22", SUM(P."D23") as "23", SUM(P."D24") as "24", SUM(P."D25") as "25", SUM(P."D26") as "26", SUM(P."D27") as "27", SUM(P."D28") as "28", SUM(P."D29") as "29", SUM(P."D30") as "30", SUM(P."D31") as "31", SUM(P."TOTAL") as "TOTAL" from (select sr."orgId" ,sr.id, "houseId",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '1' then 1 else null end as "D01",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '2' then 1 else null end as "D02",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '3' then 1 else null end as "D03", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '4' then 1 else null end as "D04", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '5' then 1 else null end as "D05", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '6' then 1 else null end as "D06", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '7' then 1 else null end as "D07", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '8' then 1 else null end as "D08", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '9' then 1 else null end as "D09", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '10' then 1 else null end as "D10", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '11' then 1 else null end as "D11",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '12' then 1 else null end as "D12", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '13' then 1 else null end as "D13", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '14' then 1 else null end as "D14", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '15' then 1 else null end as "D15", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '16' then 1 else null end as "D16", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '17' then 1 else null end as "D17", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '18' then 1 else null end as "D18", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '19' then 1 else null end as "D19", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '20' then 1 else null end as "D20",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '21' then 1 else null end as "D21",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '22' then 1 else null end as "D22",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '23' then 1 else null end as "D23", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '24' then 1 else null end as "D24", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '25' then 1 else null end as "D25", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '26' then 1 else null end as "D26", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '27' then 1 else null end as "D27", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '28' then 1 else null end as "D28", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '29' then 1 else null end as "D29", case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '30' then 1 else null end as "D30",case when to_char(to_timestamp(sr."createdAt"/1000),'fmDD') = '31' then 1 else null end as "D31",case when to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' then 1 else null end as "TOTAL" from service_requests sr where sr."orgId" = ${req.orgId} and  sr."companyId" = ${companyId} and sr."projectId" = ${projectId}  and sr."moderationStatus" = true  and sr."serviceStatusCode" != 'C' and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}' and public.f_get_teamname(sr."orgId" ,sr.id) in ('${teamCode}')) P group by public.f_get_user_category(P."orgId",P."houseId") order by 1`);



            const Parallel = require('async-parallel');
            let total1 = 0;
            let total2 = 0;
            let total3 = 0;
            let total4 = 0;
            let total5 = 0;
            let total6 = 0;
            let total7 = 0;
            let total8 = 0;
            let total9 = 0;
            let total10 = 0;
            let total11 = 0;
            let total12 = 0;
            let total13 = 0;
            let total14 = 0;
            let total15 = 0;
            let total16 = 0;
            let total17 = 0;
            let total18 = 0;
            let total19 = 0;
            let total20 = 0;
            let total21 = 0;
            let total22 = 0;
            let total23 = 0;
            let total24 = 0;
            let total25 = 0;
            let total26 = 0;
            let total27 = 0;
            let total28 = 0;
            let total29 = 0;
            let total30 = 0;
            let total31 = 0;
            let totalValue = 0;
            let totalIncomplete = 0;
            let totalComplete = 0;
            let totalIncompletePercentage = 0;
            let totalCompletePercentage = 0;



            result.rows = await Parallel.map(result.rows, async st => {


                total1 += Number(st["1"]);
                total2 += Number(st["2"]);
                total3 += Number(st["3"]);
                total4 += Number(st["4"]);
                total5 += Number(st["5"]);
                total6 += Number(st["6"]);
                total7 += Number(st["7"]);
                total8 += Number(st["8"]);
                total9 += Number(st["9"]);
                total10 += Number(st["10"]);
                total11 += Number(st["11"]);
                total12 += Number(st["12"]);
                total13 += Number(st["13"]);
                total14 += Number(st["14"]);
                total15 += Number(st["15"]);
                total16 += Number(st["16"]);
                total17 += Number(st["17"]);
                total18 += Number(st["18"]);
                total19 += Number(st["19"]);
                total20 += Number(st["20"]);
                total21 += Number(st["21"]);
                total22 += Number(st["22"]);
                total23 += Number(st["23"]);
                total24 += Number(st["24"]);
                total25 += Number(st["25"]);
                total26 += Number(st["26"]);
                total27 += Number(st["27"]);
                total28 += Number(st["28"]);
                total29 += Number(st["29"]);
                total30 += Number(st["30"]);
                total31 += Number(st["31"]);
                totalValue += Number(st['TOTAL']);
                totalIncomplete += Number(st['Incomplete']);
                totalComplete += Number(st["Completed"]);

                totalIncompletePercentage = (100 * (totalIncomplete) / totalValue);
                totalCompletePercentage = (100 * (totalComplete) / totalValue);
                totalIncompletePercentage = totalIncompletePercentage.toFixed(2);
                totalCompletePercentage = totalCompletePercentage.toFixed(2);


                return {
                    ...st,
                    total1,
                    total2,
                    total3,
                    total4,
                    total5,
                    total6,
                    total7,
                    total8,
                    total9,
                    total10,
                    total11,
                    total12,
                    total13,
                    total14,
                    total15,
                    total16,
                    total17,
                    total18,
                    total19,
                    total20,
                    total21,
                    total22,
                    total23,
                    total24,
                    total25,
                    total26,
                    total27,
                    total28,
                    total29,
                    total30,
                    total31,
                    totalValue,
                    totalIncomplete,
                    totalComplete,
                    totalIncompletePercentage,
                    totalCompletePercentage,
                };

            })


            let final = [];
            let grouped = _.groupBy(result.rows, "Tags");
            final.push(grouped);

            let chartData = _.flatten(final.filter(v => !_.isEmpty(v)).map(v => _.keys(v).map(p => ({

                [p]: (v[p][0].TOTAL)

            })))).reduce((a, p) => {

                let l = _.keys(p)[0];
                if (a[l]) {
                    a[l] += p[l];

                } else {
                    a[l] = p[l];
                }
                return a;
            }, {});


            return res.status(200).json({
                data: result.rows,
                companyId,
                teamCode,
                period,
                chartData,
                companyName: payload.companyId.CompanyName,
                teamName: payload.teamId.teamName,
                message: "Report Break By Tag Successfully!",
            });



        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }


    },

    getReportCmRevenue: async (req, res) => {

        try {

            let payload = req.body;
            let companyId = Number(payload.companyId.id);
            let projectId = Number(payload.projectId.id);
            let costArr = [];

            let month;

            if (Number(payload.startMonth) <= 9) {

                month = "0" + Number(payload.startMonth);

            } else {
                month = Number(payload.startMonth);
            }
            let period = payload.startYear + "-" + month;

            let result = await knex.raw(`select "SO no", "createdAt", "Problem Type", "Problem Description", "buildName", "Assign Team", "Assign MainUser", "Tags", "Customer Name" , case when part_cost is null then 0 else -1*part_cost end + case when part_asscost is null then 0 else part_asscost end   part_cost, part_price, case when part_price is null then 0 else part_price end-(case when part_cost is null then 0 else -1*part_cost end + case when part_asscost is null then 0 else part_asscost end) part_diff, charge_cost, charge_price,  case when charge_price is null then 0 else charge_price end -case when charge_cost is null then 0 else charge_cost end charge_diff, "serviceStatus" from (select so."displayId" as "SO no",to_char(to_timestamp(sr."createdAt"/1000),'fmDD/MM/YYYY') "createdAt",public.f_get_problem_types(sr."orgId" ,sr.id) as "Problem Type",public.f_get_problem_desc(sr."orgId", sr.id) as "Problem Description",public.f_get_building_name_fuid(sr."houseId") as "buildName",public.f_get_teamname(sr."orgId" ,so.id) as "Assign Team",public.f_get_teammain_name(sr."orgId" ,so.id ) as "Assign MainUser",public.f_get_sr_status(sr."serviceStatusCode") as "serviceStatus",public.f_get_user_category(sr."orgId",sr."houseId") as "Tags",public.f_get_tenantname(sr."orgId",sr.tenantid) as "Customer Name" ,public.f_sum_partcost(sr."orgId" , so."displayId") part_cost,public.f_sum_asspartcost(sr."orgId" , so."displayId") part_asscost,public.f_sum_chargecost(sr."orgId" , so.id) charge_cost,public.f_sum_partprice(sr."orgId" , so.id) part_price,public.f_sum_chargeprice(sr."orgId" , so.id) charge_price,sr."orgId" ,sr.id srid,so.id soid from service_requests sr left outer join service_orders so on sr.id = so."serviceRequestId" and sr."orgId" = so."orgId" and sr."companyId" = so."companyId" where sr."orgId" = ${req.orgId} and sr."companyId" = ${companyId} and sr."projectId" = ${projectId} and sr."moderationStatus" = true and sr."serviceStatusCode" not in ('C','O') and to_char(to_timestamp(sr."createdAt"/1000),'YYYY-MM') = '${period}') F order by 1`);

            if (payload.showData == false) {

                for (let d of result.rows) {

                    if (d.part_cost || d.part_price || d.part_diff || d.charge_cost || d.charge_price || d.charge_diff) {

                        costArr.push({ ...d });

                    }
                }
            } else {
                costArr = result.rows;
            }



            const Parallel = require('async-parallel');

            let totalPartCost = 0;
            let totalPartPrice = 0;
            let totalPartDiff = 0;
            let totalChargeCost = 0;
            let totalChargePrice = 0;
            let totalChargeDiff = 0;
            costArr = await Parallel.map(costArr, async st => {

                let partCost = Math.abs(st.part_cost);
                let partPrice = Math.abs(st.part_price);
                let partDiff = Math.abs(st.part_diff);
                let chargeCost = Math.abs(st.charge_cost);
                let chargePrice = Math.abs(st.charge_price);
                let chargeDiff = Math.abs(st.charge_diff);

                totalPartCost += Number(partCost);
                totalPartPrice += Number(partPrice);
                totalPartDiff += Number(partDiff);
                totalChargeCost += Number(chargeCost);
                totalChargePrice += Number(chargePrice);
                totalChargeDiff += Number(chargeDiff);



                return {
                    ...st,
                    part_diff: partDiff,
                    charge_diff: chargeDiff,
                    totalPartCost,
                    totalPartPrice,
                    totalPartDiff,
                    totalChargeCost,
                    totalChargePrice,
                    totalChargeDiff
                }

            })



            return res.status(200).json({
                data: costArr,
                message: "CM Revenue report Successfully!",
            });


        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }

    }


};

// Y, M, D
function getStartAndEndDate(startDate, perWhat) {
    let selectedDate = moment(startDate).valueOf();
    let plusOneMOnth = moment(selectedDate)
        .add(1, perWhat)
        .valueOf();
    return [selectedDate, plusOneMOnth].map(v => Number(v));
}


module.exports = serviceRequestController;