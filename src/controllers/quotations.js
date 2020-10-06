const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");

const knex = require("../db/knex");

const bcrypt = require("bcrypt");
const XLSX = require("xlsx");
const saltRounds = 10;
const fs = require('fs');


const quotationsController = {

    generateQuotationId: async(req, res) => {
        try {
            let quotationId = null;

            const currentTime = new Date().getTime();

            let orgId = req.orgId;

            const insertData = {
                moderationStatus: 0,
                isActive: "true",
                orgId: orgId,
                createdAt: currentTime,
                updatedAt: currentTime
            };

            console.log(
                "[controllers][quotation][generateQuotation]: Insert Data",
                insertData
            );

            const quotationResult = await knex
                .insert(insertData)
                .returning(["*"])
                .into("quotations");

            quotationId = quotationResult[0];

            res.status(200).json({
                data: {
                    quotation: quotationId
                },
                message: "Quotation Id generated successfully !"
            });


        } catch (err) {
            console.log("[controllers][quotation][generateQuotation] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    updateQuotations: async(req, res) => {
        try {
            let assignedServiceTeam = null;
            let additionalUsersList = [];
            let orgId = req.orgId;
            let userId = req.me.id;

            let quotationPayload = _.omit(req.body, ["images"]);

            let images = req.body.images;

            console.log(
                "[controllers][quotations][updateQuotation] : Quotation Body", quotationPayload
            );

            // validate keys
            const schema = Joi.object().keys({
                // serviceRequestId: Joi.string().allow('').allow(null).optional(),
                company: Joi.number().required(),
                project: Joi.number().required(),
                building: Joi.number().required(),
                floor: Joi.number().required(),
                unit: Joi.number().required(),
                quotationValidityDate: Joi.string().allow('').optional(),
                quotationId: Joi.number().required(),
                checkedBy: Joi.string().required(),
                inspectedBy: Joi.string().required(),
                acknowledgeBy: Joi.string().required(),

                // quotationData: Joi.array().required()
            });

            const result = Joi.validate(_.omit(quotationPayload, "serviceRequestId", "locationTags"), schema);
            console.log(
                "[controllers][quotations][updateQuotation]: JOi Result",
                result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            // Insert in quotation table,
            const currentTime = new Date().getTime();
            let serId = 0

            if (quotationPayload.serviceRequestId) {

                let srResult = await knex('service_requests').select('*').where({
                    displayId: quotationPayload.serviceRequestId,
                    companyId: quotationPayload.company,
                    orgId: req.orgId
                }).first();

                if (srResult) {
                    serId = srResult.id;
                } else {

                    serId = 0;

                }

                //serId = quotationPayload.serviceRequestId
            }

            let quotationValidityDate;
            if (quotationPayload.quotationValidityDate) {
                let date = new Date(quotationPayload.quotationValidityDate).getTime();
                console.log("New Date++++++++++", date);
                quotationValidityDate = date;
            } else {
                quotationValidityDate = moment().add('days', 15).valueOf();
            }
            let tagResult = [];

            await knex.transaction(async trx => {

                const updateQuotationReq = await knex
                    .update({
                        serviceRequestId: serId,
                        companyId: quotationPayload.company,
                        projectId: quotationPayload.project,
                        buildingId: quotationPayload.building,
                        floorId: quotationPayload.floor,
                        unitId: quotationPayload.unit,
                        quotationValidityDate: quotationValidityDate,
                        checkedBy: quotationPayload.checkedBy,
                        inspectedBy: quotationPayload.inspectedBy,
                        acknowledgeBy: quotationPayload.acknowledgeBy,
                        updatedAt: currentTime,
                        isActive: true,
                        moderationStatus: 1,
                        quotationStatus: 'Pending',
                        createdBy: userId
                    })
                    .where({ id: quotationPayload.quotationId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("quotations");

                let locationTagIds = []
                let finalLocationTags = _.uniq(quotationPayload.locationTags)

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
                        entityId: quotationPayload.quotationId,
                        entityType: "quotations",
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

                    tagResult.push(locationResult)
                }


                quotationsResponse = updateQuotationReq[0];
                trx.commit;
            });

            await knex
                .update({ moderationStatus: 1 })
                .where({ id: quotationPayload.quotationId })
                .into("quotations");

            return res.status(200).json({
                data: {
                    quotationsResponse,
                    tagResult
                },
                message: "Quotations updated successfully !"
            });


        } catch (err) {
            console.log("[controllers][quotation][updateQuotation] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getQuotationDetails: async(req, res) => {
        try {
            //let quotationRequestId = req.query.id;
            // Get Quotations Details

            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    quotationId: Joi.number().required()
                });

                let result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][quotation][Quotation Details]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                let quotationRequestId = payload.quotationId;

                quotationView = await knex("quotations")
                    .leftJoin('companies', 'quotations.companyId', 'companies.id')
                    .leftJoin('projects', 'quotations.projectId', 'projects.id')
                    .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
                    .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
                    .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
                    .leftJoin(
                        "assigned_service_team as astm", "astm.entityId", "=", "quotations.id",
                        "astm.entityType", "=", "quotations"
                    )
                    .leftJoin("teams", "teams.teamId", "=", "astm.teamId")
                    .leftJoin("users as astUser", "astUser.id", "=", "astm.userId")

                .leftJoin("users as authUser", "authUser.id", "=", "quotations.createdBy")
                    .leftJoin("users as checkUser", "checkUser.id", "=", "quotations.checkedBy")
                    .leftJoin("users as inspectedUser", "inspectedUser.id", "=", "quotations.inspectedBy")
                    .leftJoin("users as acknowledgeUser", "acknowledgeUser.id", "=", "quotations.acknowledgeBy")
                    .leftJoin(
                        "quotation_service_charges", "quotation_service_charges.quotationId", "=",
                        "quotation_service_charges.quotationId"
                    )
                    .leftJoin("organisation_user_roles", "astm.userId", "=", "organisation_user_roles.userId")
                    .leftJoin("organisation_roles", "organisation_user_roles.roleId", "=", "organisation_roles.id")
                    .leftJoin("service_requests", 'quotations.serviceRequestId', 'service_requests.id')
                    .select(
                        "quotations.id as quotationId",
                        "quotations.serviceRequestId as serviceRequestId",
                        "checkUser.name as checkedBy",
                        "inspectedUser.name as inspectedBy",
                        "checkUser.id as checkedByUserId",
                        "inspectedUser.id as inspectedByUserId",
                        "acknowledgeUser.id as acknowledgeByUserId",
                        "acknowledgeUser.name as acknowledgeBy",
                        "quotations.createdAt",
                        "quotations.quotationStatus",
                        "companies.companyName",
                        "projects.projectName",
                        "buildings_and_phases.buildingPhaseCode",
                        "buildings_and_phases.description as buildingPhaseDescription",
                        "floor_and_zones.floorZoneCode",
                        "floor_and_zones.description as floorZoneDescription",
                        "property_units.unitNumber",
                        "companies.id as companyId",
                        "projects.id as projectId",
                        "buildings_and_phases.id as buildingId",
                        "floor_and_zones.id as floorId",
                        "property_units.id as unitId",
                        "teams.teamName as assignTeam",
                        "astUser.name as assignedMainUsers",
                        "authUser.name as createdBy",
                        "organisation_roles.name as userRole",
                        "quotations.invoiceData as invoiceData",
                        "quotations.quotationValidityDate as validityDate",
                        "property_units.description as propertyUnitDescription",
                        "quotations.displayId as displayId",
                        "property_units.type",
                        'service_requests.displayId as srNo'
                    )
                    .where({ "quotations.id": quotationRequestId });
                console.log(
                    "[controllers][teams][getTeamList] : Team List",
                    quotationView
                );
                quotationsDetails = _.omit(
                    quotationView[0], ["id"], ["isActive"], ["updatedAt"]
                );

                // Get addtional User list For Quotations
                addtionalUser = await knex("assigned_service_additional_users")
                    .leftJoin("users", "assigned_service_additional_users.userId", "=", "users.id")
                    .leftJoin("organisation_user_roles", "assigned_service_additional_users.userId", "=", "organisation_user_roles.userId")
                    .leftJoin("organisation_roles", "organisation_user_roles.roleId", "=", "organisation_roles.id")
                    .select("users.name as addtionalUsers", "organisation_roles.name as userRole")
                    .where({
                        "assigned_service_additional_users.entityId": quotationRequestId,
                        "assigned_service_additional_users.entityType": "quotations"
                    });
                console.log(
                    "[controllers][teams][getTeamList] : Addtional Users List", addtionalUser
                );
                quotationsDetails.addtinalUserList = addtionalUser;
                quotationsDetails.parts = [];
                quotationsDetails.assets = [];
                quotationsDetails.charges = [];
                quotationsDetails.tags = [];


                // Description IN Invoice
                commentsData = await knex("remarks_master")
                    .select(
                        "remarks_master.description"
                    )
                    .where({
                        "remarks_master.entityId": quotationRequestId,
                        "remarks_master.entityType": "quotations_notes",
                        "remarks_master.orgId": req.orgId
                    })
                    .orderBy('id', 'desc')
                    .limit('1')
                    .first();
                quotationsDetails.comments = commentsData;
                teamResult = { quotation: quotationsDetails };

                let tag = await knex('location_tags').where({ entityId: payload.quotationId, entityType: 'quotations', orgId: req.orgId })

                if (tag) {
                    let tagId = tag.map(v => v.locationTagId);

                    let tagResult = await knex('location_tags_master')
                        .where({ orgId: req.orgId })
                        .whereIn('id', tagId)

                    quotationsDetails.tags = tagResult;
                }


            });

            res.status(200).json({
                data: teamResult,
                message: "Quotations details !"
            });
        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    addQuotationPart: async(req, res) => {
        try {
            let part = [];
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    quotationId: Joi.string().required(),
                    partId: Joi.string().required(),
                    unitCost: Joi.required(),
                    quantity: Joi.number().required(),
                    status: Joi.string().required()
                });

                let result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][quotation][addQuotationPart]: JOi Result",
                    result
                );

                // if (result && result.hasOwnProperty("error") && result.error) {
                //     return res.status(400).json({
                //         errors: [
                //             { code: "VALIDATION_ERROR", message: result.error.message }
                //         ]
                //     });
                // }
                let avgUnitPrice;
                let currentTime = new Date().getTime();


                for (let d of payload) {


                    if (d.quotationId && d.partId && d.unitCost && d.quantity && d.status) {


                        let avgResult = await knex('part_master').where({ id: d.partId, orgId: req.orgId }).first();
                        if (avgResult) {
                            avgUnitPrice = avgResult.avgUnitPrice;
                        }



                        let insertData = {
                            unitCost: avgUnitPrice,
                            quantity: d.quantity,
                            status: d.status,
                            partId: d.partId,
                            entityId: d.quotationId,
                            entityType: "quotations",
                            updatedAt: currentTime,
                            createdAt: currentTime,
                            orgId: req.orgId,
                            avgUnitPrice: avgUnitPrice
                        };
                        let partResult = await knex
                            .insert(insertData)
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_parts");
                        part.push(partResult[0]);
                        trx.commit;

                    } else {
                        return res.status(400).json({
                            errors: [
                                { code: "VALIDATION_ERROR", message: "Fill All Field!" }
                            ]
                        });

                    }

                }
            });

            return res.status(200).json({
                data: {
                    part: part
                },
                message: "Part assigned to quotation successfully"
            });
        } catch (err) {
            console.log("[controllers][quotation][addQuotationPart] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    addQuotationAsset: async(req, res) => {
        try {
            let asset = null;
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    assetId: Joi.string().required(),
                    quotationId: Joi.string().required(),
                    price: Joi.string().required(),
                    status: Joi.string().required()
                });
                let result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][quotation][addQuotationAsset]: JOi Result",
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
                    entityId: payload.quotationId,
                    entityType: "quotations",
                    assetId: payload.assetId,
                    updatedAt: currentTime,
                    createdAt: currentTime,
                    price: payload.price,
                    status: payload.status,
                    orgId: req.orgId
                };
                let assetResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("assigned_assets");
                asset = assetResult[0];

                trx.commit;
            });

            return res.status(200).json({
                data: {
                    asset: asset
                },
                message: "Asset added to quotation successfully!"
            });
        } catch (err) {
            console.log("[controllers][quotation][addQuotationAsset] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationList: async(req, res) => {
        try {
            let reqData = req.query;
            //let filters = req.body;
            let total, rows;
            const accessibleProjects = req.userProjectResources[0].projects

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let filters = {};
            let {
                quotationId,
                serviceId,
                description,
                dateFrom,
                dateTo,
                quotationStatus,
                priority,
                archive,
                location,
                createdBy,
                assignedBy,
                requestedBy,
                quotationFrom,
                quotationTo,
                quotationDueFrom,
                quotationDueTo,
                completedBy,
                completedFrom,
                completedTo,
                assingedTo,
                company,
                project,
                serviceIdForShared,
            } = req.body;

            let newDateFrom;
            let newDateTo;
            let startTime;
            let endTime;

            const d = new Date();
            let differencesTime = d.getTimezoneOffset();           

            moment.tz.setDefault(moment.tz.guess()); // now we've set the default time zone          
            let selectedTimeZone = moment().tz();
            let currentTime = moment();
            console.log("Current Time:",currentTime.format("MMMM Do YYYY, h:mm:ss a"));

            if (dateFrom && dateTo) {

                //newDateFrom = moment(dateFrom).startOf('date').format();
                // newDateTo = moment(dateTo).endOf('date', 'days').format();
                //startTime = new Date(newDateFrom).getTime();
                startTime = moment(dateFrom).tz(selectedTimeZone).valueOf();
                
                newDateTo = moment(dateTo).endOf('date').format();
                endTime = new Date(newDateTo).getTime();

            }

            if (quotationId) {
                filters["quotations.displayId"] = quotationId;
            }
            if (serviceId) {
                filters["service_requests.displayId"] = serviceId;
            }
            if (serviceIdForShared) {
                filters["quotations.serviceRequestId"] = serviceIdForShared;
            }
            // if (quotationStatus) {
            //   filters["quotations.quotationStatus"] = quotationStatus;
            // }
            if (priority) {
                filters["service_requests.priority"] = priority;
            }
            if (archive) {
                filters["service_requests.archive"] = archive;
            }
            if (location) {
                filters["service_requests.location"] = location;
            }
            if (createdBy) {
                filters["quotations.createdBy"] = createdBy;
            }
            if (assignedBy) {
                filters["quotations.createdBy"] = assignedBy;
            }

            if (requestedBy) {
                filters["service_requests.requestedBy"] = requestedBy;
            }
            if (quotationFrom && quotationTo) {
                quotationFrom = new Date(quotationFrom).getTime();
                quotationTo = new Date(quotationTo).getTime();
            }
            if (quotationDueFrom && quotationDueTo) {
                quotationDueFrom = quotationDueFrom;
                quotationDueTo = quotationDueTo;
            }
            if (completedBy) {
                filters["quotations.completedBy"] = completedBy;
            }
            if (completedFrom && completedTo) {
                completedFrom = completedFrom;
                completedTo = completedTo;
            }
            if (assingedTo) {
                filters["users.name"] = assingedTo;
            }

            if (company) {
                filters["quotations.companyId"] = company;
            }
            if (project) {
                filters["quotations.projectId"] = project;
            }

            //  if (_.isEmpty(filters)) {
            [total, rows] = await Promise.all([
                knex
                .count("* as count")
                .leftJoin('companies', 'quotations.companyId', 'companies.id')
                .leftJoin('projects', 'quotations.projectId', 'projects.id')
                .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
                .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
                .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
                .from("quotations")
                .leftJoin(
                    "service_requests",
                    "quotations.serviceRequestId",
                    "service_requests.id"
                )
                .leftJoin(
                    "assigned_service_team",
                    "service_requests.id",
                    "assigned_service_team.entityId"
                )
                .leftJoin("users", "quotations.createdBy", "users.id")
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
                .leftJoin(
                    "incident_categories",
                    "service_problems.categoryId",
                    "incident_categories.id"
                )

                //.leftJoin('user_house_allocation', 'quotations.unitId', 'user_house_allocation.houseId')
                // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                .where("quotations.orgId", req.orgId)
                .where(qb => {
                    if (serviceId) {
                        qb.where('service_requests.displayId', serviceId)
                    }
                    if (quotationId) {
                        qb.where('quotations.displayId', quotationId)
                    }
                    if (serviceIdForShared) {
                        qb.where('quotations.serviceRequestId', serviceIdForShared)
                    }
                    if (company) {
                        qb.where('quotations.companyId', company)
                    }
                    if (project) {
                        qb.where('quotations.projectId', project)
                    }
                    if (quotationStatus) {
                        qb.where('quotations.quotationStatus', quotationStatus)
                    }
                    if (description) {
                        qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                    }
                    if (dateFrom && dateTo) {
                        qb.whereBetween('quotations.createdAt', [startTime, endTime])
                    }
                })
                .whereIn('quotations.projectId', accessibleProjects)
                // .havingNotNull('quotations.quotationStatus')
                .groupBy([
                    "quotations.id",
                    "service_requests.id",
                    "assigned_service_team.id",
                    "users.id",
                    "companies.companyName",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "floor_and_zones.floorZoneCode",
                    "property_units.unitNumber",
                    "requested_by.id",
                    "service_problems.id",
                    "incident_categories.id",
                    "companies.companyId",
                    "projects.project",
                    //  "assignUser.id",
                    // "user_house_allocation.id"
                ])
                .distinct('quotations.id'),
                knex
                .distinct('quotations.id')
                .from("quotations")
                .leftJoin('companies', 'quotations.companyId', 'companies.id')
                .leftJoin('projects', 'quotations.projectId', 'projects.id')
                .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
                .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
                .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
                .leftJoin(
                    "service_requests",
                    "quotations.serviceRequestId",
                    "service_requests.id"
                )
                // .leftJoin(
                //   "assigned_service_team",
                //   "service_requests.id",
                //   "assigned_service_team.entityId"
                // )
                .leftJoin("users", "quotations.createdBy", "users.id")
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
                .leftJoin(
                    "incident_categories",
                    "service_problems.categoryId",
                    "incident_categories.id"
                )

                //.leftJoin('user_house_allocation', 'quotations.unitId', 'user_house_allocation.houseId')
                //.leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')

                .select([
                    "quotations.id as QId",
                    "quotations.serviceRequestId as serviceRequestId",
                    "service_requests.description as Description",
                    "service_requests.id as SRID",
                    "service_requests.priority as Priority",
                    "users.name as Created By",
                    "companies.companyName",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "buildings_and_phases.description as buildingDescription",
                    "floor_and_zones.floorZoneCode",
                    "property_units.unitNumber",
                    //"assignUser.name as Tenant Name",
                    "quotations.quotationStatus as Status",
                    "quotations.createdAt as Date Created",
                    "incident_categories.descriptionEng as problemDescription",
                    "requested_by.name as requestedBy",
                    //"user_house_allocation",
                    "property_units.id as unitId",
                    "quotations.displayId as Q No",
                    "service_requests.displayId as SR#",
                    "companies.companyId",
                    "projects.project",

                ])
                .where("quotations.orgId", req.orgId)
                .where(qb => {
                    if (serviceId) {
                        qb.where('service_requests.displayId', serviceId)
                    }
                    if (serviceId) {
                        qb.where('service_requests.displayId', serviceId)
                    }
                    if (serviceIdForShared) {
                        qb.where('quotations.serviceRequestId', serviceIdForShared)
                    }
                    if (quotationStatus) {
                        qb.where('quotations.quotationStatus', quotationStatus)
                    }

                    if (quotationId) {
                        qb.where('quotations.displayId', quotationId)
                    }
                    if (company) {
                        qb.where('quotations.companyId', company)
                    }
                    if (project) {
                        qb.where('quotations.projectId', project)
                    }
                    if (description) {
                        qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                    }

                    if (dateFrom && dateTo) {
                        qb.whereBetween('quotations.createdAt', [startTime, endTime])
                    }
                })
                .whereIn('quotations.projectId', accessibleProjects)
                // .havingNotNull('quotations.quotationStatus')
                .groupBy(["quotations.id", "service_requests.id", "users.id", "companies.companyName",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "floor_and_zones.floorZoneCode",
                    "property_units.unitNumber",
                    "requested_by.id",
                    "service_problems.id",
                    "incident_categories.id",
                    "incident_categories.descriptionEng",
                    //"assignUser.id",
                    // "assignUser.name",
                    //"user_house_allocation.id",
                    "buildings_and_phases.description",
                    // "user_house_allocation.userId",
                    "property_units.id",
                    "companies.companyName",
                    "companies.companyId",
                    "projects.project"

                ])
                .orderBy('quotations.id', 'desc')
                .offset(offset)
                .limit(per_page)
            ]);
            // } else {
            //   filters = _.omitBy(filters, val =>
            //     val === "" || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val)
            //       ? true
            //       : false
            //   );
            //   try {
            //     [total, rows] = await Promise.all([
            //       knex
            //         .count("* as count")
            //         .from("quotations")
            //         .leftJoin('companies', 'quotations.companyId', 'companies.id')
            //         .leftJoin('projects', 'quotations.projectId', 'projects.id')
            //         .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
            //         .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
            //         .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
            //         .leftJoin(
            //           "service_requests",
            //           "quotations.serviceRequestId",
            //           "service_requests.id"
            //         )
            //         .leftJoin(
            //           "assigned_service_team",
            //           "service_requests.id",
            //           "assigned_service_team.entityId"
            //         )
            //         .leftJoin("users", "assigned_service_team.userId", "users.id")
            //         .leftJoin('user_house_allocation', 'quotations.unitId', 'user_house_allocation.houseId')
            //         .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')

            //         .where(qb => {
            //           qb.where(filters);
            //           if (quotationFrom && quotationTo) {
            //             qb.whereBetween("quotations.createdAt", [
            //               quotationFrom,
            //               quotationTo
            //             ]);
            //           }
            //           qb.where("quotations.orgId", req.orgId)
            //           qb.whereIn('quotations.projectId', accessibleProjects)

            //         })
            //         .havingNotNull('quotations.quotationStatus')
            //         .groupBy([
            //           "quotations.id",
            //           "service_requests.id",
            //           "assigned_service_team.id",
            //           "users.id", "companies.companyName",
            //           "projects.projectName",
            //           "buildings_and_phases.buildingPhaseCode",
            //           "floor_and_zones.floorZoneCode",
            //           "property_units.unitNumber",
            //           "assignUser.id",
            //           "user_house_allocation.id"
            //         ]),
            //       knex
            //         .from("quotations")
            //         .leftJoin('companies', 'quotations.companyId', 'companies.id')
            //         .leftJoin('projects', 'quotations.projectId', 'projects.id')
            //         .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
            //         .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
            //         .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
            //         .leftJoin(
            //           "service_requests",
            //           "quotations.serviceRequestId",
            //           "service_requests.id"
            //         )
            //         .leftJoin(
            //           "assigned_service_team",
            //           "service_requests.id",
            //           "assigned_service_team.entityId"
            //         )
            //         .leftJoin("users", "quotations.createdBy", "users.id")
            //         .leftJoin('user_house_allocation', 'quotations.unitId', 'user_house_allocation.houseId')
            //         .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            //         .select([
            //           "quotations.id as QId",
            //           "quotations.serviceRequestId as serviceRequestId",
            //           "service_requests.description as Description",
            //           "service_requests.id as SRID",
            //           "service_requests.priority as Priority",
            //           "users.name as Created By",
            //           "companies.companyName",
            //           "projects.projectName",
            //           "buildings_and_phases.buildingPhaseCode",
            //           "floor_and_zones.floorZoneCode",
            //           "property_units.unitNumber",
            //           "assignUser.name as Tenant Name",
            //           "quotations.quotationStatus as Status",
            //           "quotations.createdAt as Date Created"
            //         ])
            //         .where(qb => {
            //           qb.where(filters);
            //           if (quotationFrom && quotationTo) {
            //             qb.whereBetween("quotations.createdAt", [
            //               quotationFrom,
            //               quotationTo
            //             ]);
            //           }
            //           qb.where("quotations.orgId", req.orgId)
            //           qb.whereIn('quotations.projectId', accessibleProjects)
            //         })
            //         .offset(offset)
            //         .limit(per_page)
            //     ]);
            //   } catch (e) {
            //     // Error
            //   }
            // }

            let count = total.length;

            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + rows.length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;

            let rowsWithDays = rows.map(q => {
                    if (q['Date Created']) {

                        let creationDate = new Date(+q['Date Created'])
                        let todaysDate = new Date()
                            // console.log(q['Date Created'],creationDate,todaysDate,'***************************************************************************88')

                        let a = moment([creationDate.getFullYear(), creationDate.getMonth(), creationDate.getDate()]);
                        let b = moment([todaysDate.getFullYear(), todaysDate.getMonth(), todaysDate.getDate()]);
                        let diff = b.diff(a, 'days') // =1
                        return {...q, Status: q['Status'] + ` (${diff} days)` }
                    } else {
                        return {...q }
                    }

                })
                //   pagination.data = rows;//_.uniqBy(rowsWithDays, 'QId');

            let tetantResult;
            let houseResult;
            let Parallel = require('async-parallel');
            pagination.data = await Parallel.map(rows, async pd => {

                houseResult = await knex.from('user_house_allocation').select('userId').where({ houseId: pd.unitId }).first().orderBy('id', 'desc')

                if (houseResult) {
                    tetantResult = await knex.from('users').select('name').where({ id: houseResult.userId }).first()
                    return {
                        ...pd,
                        "Tenant Name": tetantResult.name
                    }
                } else {
                    return {
                        ...pd,
                        "Tenant Name": ''
                    }
                }



            })


            return res.status(200).json({
                data: {
                    quotations: pagination,
                },
                message: "Quotations List!"
            });
        } catch (err) {
            console.log("[controllers][quotation][list] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    exportQuotation: async(req, res) => {

        try {
            let reqData = req.query;
            let total, rows;
            const accessibleProjects = req.userProjectResources[0].projects
            let pagination = {};

            [rows] = await Promise.all([

                knex
                //.distinct('quotations.id')
                .from("quotations")
                .leftJoin('companies', 'quotations.companyId', 'companies.id')
                .leftJoin('projects', 'quotations.projectId', 'projects.id')
                .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
                .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
                .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
                .leftJoin(
                    "service_requests",
                    "quotations.serviceRequestId",
                    "service_requests.id"
                )
                .leftJoin("users", "quotations.createdBy", "users.id")
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
                .leftJoin(
                    "incident_categories",
                    "service_problems.categoryId",
                    "incident_categories.id"
                )
                .select([
                    "quotations.id as Q_ID",
                    "quotations.serviceRequestId as SERVICE_REQUEST_ID",
                    "service_requests.description as DESCRIPTION",
                    //"service_requests.id as SRID",
                    //"service_requests.priority as PRIORITY",
                    //"companies.companyName",
                    //"projects.projectName",
                    "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
                    "buildings_and_phases.description as BUILDING_NAME",
                    //"floor_and_zones.floorZoneCode",
                    "property_units.unitNumber as UNIT_NUMBER",
                    "property_units.description as UNIT_DESCRIPTION",
                    //"assignUser.name as Tenant Name",
                    //"quotations.quotationStatus as Status",
                    //"quotations.createdAt as Date Created",
                    //"incident_categories.descriptionEng as problemDescription",
                    //"requested_by.name as requestedBy",
                    //"user_house_allocation",
                    //"property_units.id as unitId"

                ])
                .where("quotations.orgId", req.orgId)
                .whereIn('quotations.projectId', accessibleProjects)
                .havingNotNull('quotations.quotationStatus')
                .groupBy(["quotations.id", "service_requests.id", "users.id", "companies.companyName",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "floor_and_zones.floorZoneCode",
                    "property_units.unitNumber",
                    "requested_by.id",
                    "service_problems.id",
                    "incident_categories.id",
                    "incident_categories.descriptionEng",
                    //"assignUser.id",
                    // "assignUser.name",
                    //"user_house_allocation.id",
                    "buildings_and_phases.description",
                    // "user_house_allocation.userId",
                    "property_units.id"
                ])
                .orderBy('quotations.id', 'desc')
            ]);

            // let tetantResult;
            // let houseResult;
            // let Parallel = require('async-parallel');
            // pagination.data = await Parallel.map(rows, async pd => {

            //   houseResult = await knex.from('user_house_allocation').select('userId').where({ houseId: pd.unitId }).first().orderBy('id', 'desc')

            //   if (houseResult) {
            //     tetantResult = await knex.from('users').select('name').where({ id: houseResult.userId }).first()
            //     return {
            //       ...pd,
            //       "Tenant Name": tetantResult.name
            //     }
            //   } else {
            //     return {
            //       ...pd,
            //       "Tenant Name": ''
            //     }
            //   }
            // })

            let tempraryDirectory = null;
            let bucketName = null;
            if (process.env.IS_OFFLINE) {
                bucketName = process.env.S3_BUCKET_NAME;
                tempraryDirectory = 'tmp/';
            } else {
                tempraryDirectory = '/tmp/';
                bucketName = process.env.S3_BUCKET_NAME;
            }

            //res.json(rows)

            var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
            var ws;
            if (rows && rows.length) {
                ws = XLSX.utils.json_to_sheet(rows);
            } else {
                ws = XLSX.utils.json_to_sheet([{
                    Q_ID: "",
                    SERVICE_REQUEST_ID: "",
                    DESCRIPTION: "",
                    BUILDING_PHASE_CODE: "",
                    BUILDING_NAME: "",
                    UNIT_NUMBER: "",
                    UNIT_DESCRIPTION: ""
                }]);
            }
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
            let filename = "QuotationData-" + Date.now() + ".csv";
            let filepath = tempraryDirectory + filename;
            let check = XLSX.writeFile(wb, filepath);
            const AWS = require('aws-sdk');

            fs.readFile(filepath, function(err, file_buffer) {
                var s3 = new AWS.S3();
                var params = {
                    Bucket: bucketName,
                    Key: "Export/Quotation/" + filename,
                    Body: file_buffer,
                    ACL: 'public-read'
                }
                s3.putObject(params, function(err, data) {
                    if (err) {
                        console.log("Error at uploadCSVFileOnS3Bucket function", err);
                        res.status(500).json({
                            errors: [
                                { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                            ],
                        });
                        //next(err);
                    } else {
                        console.log("File uploaded Successfully");

                        let url = process.env.S3_BUCKET_URL + "/Export/Quotation/" +
                            filename;

                        // let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Quotation/" + filename;
                        res.status(200).json({
                            data: rows,
                            message: "Quotation data export successfully!",
                            url: url
                        });
                    }
                });
            })

        } catch (err) {
            console.log("[controllers][exportQuotation][list] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }

    },
    updateQuotationNotes: async(req, res) => {
        // Define try/catch block
        try {
            let userId = req.me.id;
            let problemImagesData = [];


            await knex.transaction(async trx => {
                let upNotesPayload = _.omit(req.body, ["images"]);
                console.log(
                    "[controllers][quotation][updateNotes] : Request Body",
                    upNotesPayload
                );

                // validate keys
                const schema = Joi.object().keys({
                    quotationId: Joi.number().required(),
                    description: Joi.string().required()
                });

                // let problemImages = upNotesPayload.problemsImages;
                // let noteImages = upNotesPayload.notesImages;
                // // validate params
                const result = Joi.validate(upNotesPayload, schema);

                if (result && result.hasOwnProperty("error") && result.error) {
                    res.status(400).json({
                        errors: [
                            { code: "VALIDATON ERRORS", message: result.message.error }
                        ]
                    });
                }

                const currentTime = new Date().getTime();
                // Insert into survey order post update table
                const insertData = {
                    quotationId: upNotesPayload.quotationId,
                    description: upNotesPayload.description,
                    orgId: req.orgId,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime
                };
                console.log(
                    "[controllers][quotation][quotationPostNotes] : Insert Data ",
                    insertData
                );

                const resultSurveyNotes = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("quotation_post_update");
                notesData = resultSurveyNotes;
                quotationNoteId = notesData[0];

                // const Parallel = require('async-parallel');
                //  let notesResData = await Parallel.map(notesData, async item => {
                //       let username = await knex('users').where({ id: item.createdBy }).select('name');
                //       username = username[0].name;
                //       return notesData;
                //   });
                let usernameRes = await knex('users').where({ id: notesData[0].createdBy }).select('name')
                let username = usernameRes[0].name;
                notesData = {...notesData[0], createdBy: username }

                /*INSERT IMAGE TABLE DATA OPEN */

                if (req.body.images && req.body.images.length) {
                    let imagesData = req.body.images;
                    for (image of imagesData) {
                        let d = await knex
                            .insert({
                                entityId: quotationNoteId.id,
                                ...image,
                                entityType: "quotation_notes",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("images");
                        problemImagesData.push(d[0]);
                    }
                }

                /*INSERT IMAGE TABLE DATA CLOSE */

                if (problemImagesData[0] && problemImagesData[0].s3Url) {
                    notesData = {...notesData, s3Url: problemImagesData[0].s3Url }
                }

                trx.commit;

                res.status(200).json({
                    data: {
                        quotationNotesResponse: {
                            notesData: [notesData]
                        }
                    },
                    message: "Quotation Note updated successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][quotation][quotationPostNotes] : Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationNoteList: async(req, res) => {
        try {
            let quotationNoteList = null;

            //await knex.transaction(async (trx) => {
            let quotation = req.body;

            const schema = Joi.object().keys({
                quotationId: Joi.number().required()
            });
            let result = Joi.validate(quotation, schema);
            console.log(
                "[controllers][quotation][getquotationPostNotes]: JOi Result",
                result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
                });
            }

            let quotationId = quotation.quotationId;

            // surveyOrderNoteResult = await knex
            //   .from("survey_order_post_update")
            //   .select()
            //   .where({
            //     surveyOrderId: surveyOrder.surveyOrderId,
            //     isActive: "true",
            //     orgId: req.orgId
            //   });
            // surveyOrderNoteList = surveyOrderNoteResult;
            let quotationNoteResult = await knex.raw(`select "quotation_post_update".*,"images"."s3Url","users"."name" as "createdBy" from "quotation_post_update"  left join "users" on "quotation_post_update"."createdBy" = "users"."id"  left join "images" on "quotation_post_update"."id" = "images"."entityId"  where "quotation_post_update"."orgId" = ${req.orgId} and "quotation_post_update"."quotationId" = ${quotationId} and "quotation_post_update"."isActive" = 'true'`)

            quotationNoteList = quotationNoteResult.rows;

            return res.status(200).json({
                data: quotationNoteList,
                message: "Quotation Order Details"
            });

            //});
        } catch (err) {
            console.log(
                "[controllers][quotation][getQuotationDetails] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    deleteQuotationRemark: async(req, res) => {
        try {
            let quotation = null;
            await knex.transaction(async trx => {
                let currentTime = new Date().getTime();
                const remarkPayload = req.body;
                const schema = Joi.object().keys({
                    remarkId: Joi.number().required()
                });

                let result = Joi.validate(remarkPayload, schema);
                console.log("[controllers][quotation]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Now soft delete and return
                let updatedRemark = await knex
                    .update({
                        isActive: "false",
                        updatedAt: currentTime,
                        orgId: req.orgId
                    })
                    .where({
                        id: remarkPayload.remarkId
                    })
                    .returning(["*"])
                    .transacting(trx)
                    .into("quotation_post_update");

                trx.commit;

                return res.status(200).json({
                    data: {
                        deletedRemark: updatedRemark
                    },
                    message: "Quotation remarks deleted successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][quotation][remaks] :  Error", err);
            //trx.rollback
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationAssignedAssets: async(req, res) => {
        try {
            let { quotationId } = req.body;
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

                .leftJoin("companies", "asset_master.companyId", "companies.id")
                .select([
                    "asset_master.id as id",
                    "asset_master.assetName as assetName",
                    "asset_master.model as model",
                    "asset_category_master.categoryName as categoryName",
                    "companies.companyName as companyName"
                ])
                .where({
                    entityType: "quotations",
                    entityId: quotationId,
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

                .select([
                    "asset_master.id as id",

                    "asset_master.assetName as assetName",
                    "asset_master.model as model",
                    "asset_category_master.categoryName as categoryName",
                    "companies.companyName as companyName"
                ])
                .where({
                    entityType: "quotations",
                    entityId: quotationId,
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
    approveQuotation: async(req, res) => {
        try {
            let quotation = null;
            let message;
            let approveQuotation;
            await knex.transaction(async trx => {
                let currentTime = new Date().getTime();
                const quotationPayload = req.body;
                let userId = req.me.id;

                const schema = Joi.object().keys({
                    quotationId: Joi.number().required(),
                    status: Joi.string().required()
                });

                let result = Joi.validate(quotationPayload, schema);
                console.log("[controllers][quotation]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }



                if (quotationPayload.status == 'Approved') {
                    // Now approved quotation
                    approveQuotation = await knex
                        .update({
                            quotationStatus: quotationPayload.status,
                            updatedAt: currentTime,
                            updatedBy: userId,
                            approvedBy: userId,
                            orgId: req.orgId
                        })
                        .where({
                            id: quotationPayload.quotationId
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("quotations");

                    message = "Quotation approved successfully !";
                } else if (quotationPayload.status == 'Cancelled') {
                    // Now canceled quotation
                    approveQuotation = await knex
                        .update({
                            quotationStatus: quotationPayload.status,
                            updatedAt: currentTime,
                            updatedBy: userId,
                            cancelledBy: userId,
                            orgId: req.orgId
                        })
                        .where({
                            id: quotationPayload.quotationId
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("quotations");

                    message = "Quotation has been canceled !";
                }

                trx.commit;

                return res.status(200).json({
                    data: {
                        quotation: approveQuotation
                    },
                    message: message
                });
            });
        } catch (err) {
            console.log("[controllers][quotation][remaks] :  Error", err);
            //trx.rollback
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationInvoice: async(req, res) => {
        try {
            let { quotationId } = req.body;
            let rows;
            let userInfo;
            let requesterInfo;
            let orgId = req.orgId;

            let pagination = {};
            [rows] = await Promise.all([
                knex("quotations")
                .leftJoin(
                    "taxes",
                    "quotations.vatId",
                    "taxes.id"
                )
                .select([
                    "taxes.taxCode as taxCode",
                    "quotations.*"
                ])
                .where({
                    "quotations.id": quotationId,
                    "quotations.orgId": req.orgId
                })
            ]);


            let quotationMaster = await knex("quotations")
                .leftJoin("users", "quotations.createdBy", "=", "users.id")
                .select(
                    "quotations.serviceRequestId",
                    "users.name as quotationsCreated",
                    "quotations.unitId",
                    "quotations.createdAt"

                )
                .where({ "quotations.id": quotationId, "quotations.orgId": orgId }).first();

            let serviceRequestId = quotationMaster.serviceRequestId;
            console.log("serviceRequestId", serviceRequestId);

            const DataResult = await knex("service_requests").where({
                id: serviceRequestId,
                isActive: "true"
            }).first();


            requesterInfo = await knex("service_requests")
                .leftJoin("requested_by", "service_requests.requestedBy", "=", "requested_by.id")
                .leftJoin("source_of_request", "service_requests.serviceType", "=", "source_of_request.id")
                .select(
                    "requested_by.name",
                    "source_of_request.requestCode",
                    "service_requests.createdAt",
                    "service_requests.description",
                    "service_requests.location"
                )
                .where({
                    "service_requests.id": serviceRequestId
                }).first();
            requesterData = requesterInfo;
            console.log("requestedByDetails", requesterData);


            tenantInfo = await knex("user_house_allocation")
                .leftJoin("users", "user_house_allocation.userId", "=", "users.id")
                .select(
                    "users.name",
                    "users.mobileNo",
                    "users.email",
                    "users.location",
                    "users.taxId",
                    "users.fax"
                )
                .where({
                    "user_house_allocation.houseId": quotationMaster.unitId
                }).first();
            tenantData = tenantInfo;
            console.log("tenantDataInfo", tenantData);

            propertyInfo = await knex("property_units")
                .leftJoin("companies", "property_units.companyId", "=", "companies.id")
                .leftJoin("projects", "property_units.projectId", "=", "projects.id")
                .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "=", "buildings_and_phases.id")
                .leftJoin("floor_and_zones", "property_units.floorZoneId", "=", "floor_and_zones.id")
                .select(
                    "companies.companyName",
                    "companies.descriptionEng",
                    "companies.description1",
                    "companies.companyAddressEng",
                    "companies.companyAddressThai",
                    "companies.telephone",
                    "companies.fax",
                    "companies.taxId",
                    "projects.project as projectCode",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "buildings_and_phases.description as buildingPhaseDescription",
                    "floor_and_zones.floorZoneCode",
                    "floor_and_zones.description as floorZoneDescription",
                    "property_units.unitNumber as unitNumber",
                    "property_units.description as unitDescription",
                    "property_units.houseId as houseId",
                    "companies.logoFile"
                )
                .where({
                    "property_units.id": quotationMaster.unitId
                }).first();

            console.log("PropertyInfo", propertyInfo);

            let locationResult = await knex("location_tags")
                .leftJoin("location_tags_master", "location_tags.locationTagId", "location_tags_master.id")
                .where({
                    "location_tags.entityType": "service_requests",
                    "location_tags.entityId": serviceRequestId
                })
                .select("location_tags_master.title")
            let tags = _.uniq(locationResult.map(v => v.title)) //[userHouseId.houseId];



            let locationResult2 = await knex("location_tags")
                .leftJoin("location_tags_master", "location_tags.locationTagId", "location_tags_master.id")
                .where({
                    "location_tags.entityType": "quotations",
                    "location_tags.entityId": quotationId
                })
                .select("location_tags_master.title")
            let tags2 = _.uniq(locationResult2.map(v => v.title)) //[userHouseId.houseId];

            propertyInfo.locationTags = tags;
            propertyInfo.locationTags2 = tags2;

            console.log("locationResult", tags);

            // Description IN Invoice
            commentsData = await knex("remarks_master")
                .select(
                    "remarks_master.description"
                )
                .where({
                    "remarks_master.entityId": quotationId,
                    "remarks_master.entityType": "quotations_notes",
                    "remarks_master.orgId": req.orgId
                })
                .orderBy('id', 'desc')
                .limit('1')
                .first();


            userInfo = {...tenantInfo, requesterInfo, propertyInfo, serviceMaster: quotationMaster, comments: commentsData }
            pagination.data = rows;
            pagination.tenant = userInfo;
            // pagination.propertyDetails = userInfo;
            // pagination.companyData = companyInfo;

            return res.status(200).json({
                data: {
                    quotation: pagination
                }
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    updateQuotationsInvoice: async(req, res) => {
        try {
            let orgId = req.orgId;
            let userId = req.me.id;
            let quotationPayload = req.body;
            let updateAssignedParts;
            let updateAssignedCharges;
            await knex.transaction(async trx => {
                // validate keys
                const quotationSinglePart = Joi.object().keys({
                    partName: Joi.string().required(),
                    id: Joi.string().required(),
                    partCode: Joi.string().required(),
                    quantity: Joi.string().required(),
                    unitCost: Joi.number().required(),
                })
                const quotationSingleCharge = Joi.object().keys({
                    chargeCode: Joi.string().required(),
                    id: Joi.string().required(),
                    calculationUnit: Joi.string().required(),
                    rate: Joi.number().required(),
                    totalHours: Joi.string().required(),
                })

                const quotationSingle = Joi.object().keys({
                    parts: Joi.array().items(quotationSinglePart),
                    charges: Joi.array().items(quotationSingleCharge),
                    subTotal: Joi.number().required(),
                    grandTotal: Joi.number().required(),
                    vatId: Joi.number().required(),
                    vatRate: Joi.number().required(),
                })
                const schema = Joi.object().keys({
                    serviceRequestId: Joi.string().allow('').optional(),
                    quotationId: Joi.number().required(),
                    quotationData: Joi.array().items(quotationSingle)
                });

                // const result = Joi.validate(JSON.parse(quotationPayload), schema);
                const result = schema.validate(quotationPayload)

                console.log(
                    "[controllers][quotations][updateQuotationInvoice]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Update in quotation update table,
                const currentTime = new Date().getTime();
                let srId = 0

                if (quotationPayload.serviceRequestId) {
                    srId = quotationPayload.serviceRequestId
                }

                const updateQuotationReq = await knex
                    .update({
                        serviceRequestId: srId,
                        invoiceData: JSON.stringify(quotationPayload.quotationData),
                        updatedAt: currentTime
                    })
                    .where({ id: quotationPayload.quotationId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("quotations");

                // Start Update Assigned Parts In Quotations

                let partsLength = quotationPayload.quotationData[0].parts.length;
                console.log("parts length", partsLength);

                let partsData;
                for (let i = 0; i < partsLength; i++) {
                    console.log("partsArray", quotationPayload.quotationData[0].parts[i]);
                    partsData = quotationPayload.quotationData[0].parts[i];
                    updateAssignedParts = await knex
                        .update({
                            unitCost: partsData.unitCost,
                            quantity: partsData.quantity,
                            updatedAt: currentTime
                        })
                        .where({
                            entityId: quotationPayload.quotationId,
                            entityType: "quotations",
                            partId: partsData.id
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("assigned_parts");
                }


                // Start Update Assigned Charges In Quotations

                let chargesLength = quotationPayload.quotationData[0].charges.length;
                console.log("charges length", chargesLength);

                let chargesData;
                for (let j = 0; j < chargesLength; j++) {
                    console.log("chargesArray", quotationPayload.quotationData[0].charges[j]);
                    chargesData = quotationPayload.quotationData[0].charges[j];
                    updateAssignedCharges = await knex
                        .update({
                            chargeId: chargesData.id,
                            totalHours: chargesData.totalHours,
                            rate: chargesData.rate,
                            updatedAt: currentTime
                        })
                        .where({
                            entityId: quotationPayload.quotationId,
                            entityType: "quotations",
                            chargeId: chargesData.id
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("assigned_service_charges");
                }

                console.log(
                    "[controllers][quotations][updateQuotationInvoice]: Update Data",
                    updateQuotationReq
                );
                quotationsResponse = updateQuotationReq[0];
                trx.commit;

                return res.status(200).json({
                    data: {
                        quotationsResponse
                    },
                    message: "Quotations invoice updated successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][quotation][updateQuotation] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    // deleteQuotation:async (req,res) => {
    //   try {
    //     const id = req.body.id;
    //     const deletedRow = await knex('quotations').where({id}).del().returning(['*'])
    //     return res.status(200).json({
    //       data: {
    //         deletedRow,
    //         message: 'Deleted row successfully!'
    //       }
    //     })
    //   } catch(err) {
    //     return res.status(500).json({
    //       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
    //     });
    //   }
    // },
    deleteQuotation: async(req, res) => {
        try {
            const id = req.body.id;
            const deletedRow = await knex('quotations').where({ id }).del().returning(['*'])
            return res.status(200).json({
                data: {
                    deletedRow,
                    message: 'Deleted row successfully!'
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },


    updateQuotationsStatus: async(req, res) => {
        try {
            let quotationId = req.body.data.quotationId;
            //let serviceOrderId = req.body.data.serviceOrderId;
            let updateStatus = req.body.data.status;
            let invoiceDataRow = null
            let assignedParts = null
                // let finalParts = [];
            const currentTime = new Date();
            console.log('REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7', req.body)
            let status;
            if (updateStatus == 'Approved') {
                let serviceRequestIdRow = await knex('quotations').where({ id: quotationId }).select('serviceRequestId').first()
                let serviceOrderIdRow = await knex('service_orders').select('id').where({ serviceRequestId: serviceRequestIdRow.serviceRequestId }).first()
                status = await knex("quotations")
                    .update({ quotationStatus: updateStatus, approvedOn: currentTime, approvedBy: req.me.id })
                    .where({ id: quotationId });


                if (serviceOrderIdRow) {

                    // Add the invoice Data to SO
                    invoiceDataRow = await knex('quotations').select('invoiceData').where({ id: quotationId }).first()
                    let data = JSON.stringify(invoiceDataRow.invoiceData)
                    await knex('service_orders').update({ invoiceData: data }).where({ id: serviceOrderIdRow.id })

                    // Get assigned parts to quotation
                    assignedParts = await knex('assigned_parts').select('*').where({ entityId: quotationId, entityType: 'quotations' })
                    assignedCharges = await knex('assigned_service_charges').select([

                        "chargeId",
                        "entityId",
                        "entityType",
                        "createdAt",
                        "updatedAt",
                        "isActive",
                        "orgId",
                        "status",
                        "totalHours",
                        "rate",

                    ]).where({ entityId: quotationId, entityType: 'quotations' })

                    if (assignedCharges && assignedCharges.length) {
                        for (let p of assignedCharges) {
                            await knex('assigned_service_charges').insert({...p, status: 'in progress', orgId: req.orgId, createdAt: currentTime.getTime(), updatedAt: currentTime.getTime(), entityId: serviceOrderIdRow.id, entityType: 'service_orders' })
                        }
                    }

                    if (assignedParts && assignedParts.length) {
                        //finalParts = assignedParts.map(v => v.partId)
                        for (let p of assignedParts) {
                            await knex('assigned_parts').insert({ unitCost: p.unitCost, quantity: p.quantity, status: 'in progress', orgId: req.orgId, createdAt: currentTime.getTime(), updatedAt: currentTime.getTime(), partId: p.partId, entityId: serviceOrderIdRow.id, entityType: 'service_orders' })
                        }
                    }

                }

            } else if (updateStatus == 'Cancelled') {
                status = await knex("quotations")
                    .update({ quotationStatus: updateStatus, cancelledOn: currentTime, cancelledBy: req.me.id })
                    .where({ id: quotationId });
            }

            return res.status(200).json({
                data: {
                    status: updateStatus
                },
                message: "Quotation status updated successfully!"
            });

        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }

    ,
    getTagsQuotation: async(req, res) => {

        try {


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

            return res.status(200).json({
                data: result,
                message: "Quotation tags  successfully!"
            });


        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },

    getQuotationCostReport: async(req, res) => {

        try {

            let rows;
            const accessibleProjects = req.userProjectResources[0].projects
            let payload = req.body;
            let result;

            rows = await knex
                // .distinct('quotations.id')
                .from("quotations")
                .leftJoin('companies', 'quotations.companyId', 'companies.id')
                .leftJoin('projects', 'quotations.projectId', 'projects.id')
                .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
                .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
                .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
                .leftJoin(
                    "service_requests",
                    "quotations.serviceRequestId",
                    "service_requests.id"
                )
                // .leftJoin(
                //   "assigned_service_team",
                //   "service_requests.id",
                //   "assigned_service_team.entityId"
                // )
                .leftJoin(
                    "assigned_service_team",
                    "service_requests.id",
                    "assigned_service_team.entityId"
                )
                .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                .leftJoin("users", "quotations.createdBy", "users.id")
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
                .leftJoin(
                    "incident_categories",
                    "service_problems.categoryId",
                    "incident_categories.id"
                )
                .leftJoin(
                    "service_status AS status",
                    "service_requests.serviceStatusCode",
                    "status.statusCode"
                )

            //.leftJoin('user_house_allocation', 'quotations.unitId', 'user_house_allocation.houseId')
            //.leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')

            .select([
                    "quotations.id as QId",
                    "quotations.serviceRequestId as serviceRequestId",
                    "service_requests.description as Description",
                    "service_requests.id as SRID",
                    "service_requests.priority as Priority",
                    "users.name as Created By",
                    "companies.companyName",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "buildings_and_phases.description as buildingDescription",
                    "floor_and_zones.floorZoneCode",
                    "property_units.unitNumber",
                    //"assignUser.name as Tenant Name",
                    "quotations.quotationStatus as Status",
                    "quotations.createdAt",
                    "incident_categories.descriptionEng as problemDescription",
                    "requested_by.name as requestedBy",
                    //"user_house_allocation",
                    "property_units.id as unitId",
                    "quotations.displayId as Q No",
                    "service_requests.displayId as SR#",
                    "companies.companyId",
                    "projects.project",
                    "quotations.displayId as qNo",
                    "quotations.id",
                    'quotations.invoiceData'

                ])
                .where("quotations.orgId", req.orgId)
                .where(qb => {

                    if (payload.companyId) {

                        if (payload.companyId == "all") {

                        } else {
                            qb.where('quotations.companyId', payload.companyId.id);
                        }
                    }
                    if (payload.projectId) {

                        if (payload.projectId == "all") {

                        } else {

                            qb.where('quotations.projectId', payload.projectId.id);
                        }
                    }

                    if (payload.buildingId) {


                        if (payload.buildingId == "all") {

                        } else {

                            qb.where('quotations.buildingId', payload.buildingId.id);
                        }

                    }

                    if (payload.unitId && payload.unitId.length) {


                        if (payload.unitId.includes("all")) {

                        } else {


                            let unit = payload.unitId.map(v => v.id);
                            qb.whereIn('quotations.unitId', unit);
                        }

                    }

                    if (payload.teamId && payload.teamId.length) {

                        if (payload.teamId.includes("all")) {

                        } else {

                            let team = payload.teamId.map(v => v.teamId);
                            qb.whereIn('teams.teamId', team);
                        }
                    }


                    if (payload.serviceStatus && payload.serviceStatus.length) {

                        if (payload.serviceStatus.includes("all")) {

                        } else {

                            qb.whereIn('status.statusCode', payload.serviceStatus);
                        }
                    }

                    if (payload.quotationStatus && payload.quotationStatus.length) {

                        if (payload.quotationStatus.includes("all")) {

                        } else {

                            qb.whereIn('quotations.quotationStatus', payload.quotationStatus);
                        }
                    }

                    if (payload.fromDate && payload.toDate) {
                        qb.whereBetween('quotations.createdAt', [payload.fromDate, payload.toDate])
                    }
                })
                .whereIn('quotations.projectId', accessibleProjects)
                // .havingNotNull('quotations.quotationStatus')
                .groupBy(["quotations.id", "service_requests.id", "users.id", "companies.companyName",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "floor_and_zones.floorZoneCode",
                    "property_units.unitNumber",
                    "requested_by.id",
                    "service_problems.id",
                    "incident_categories.id",
                    "incident_categories.descriptionEng",
                    //"assignUser.id",
                    // "assignUser.name",
                    //"user_house_allocation.id",
                    "buildings_and_phases.description",
                    // "user_house_allocation.userId",
                    "property_units.id",
                    "companies.companyName",
                    "companies.companyId",
                    "projects.project",
                    //"quotations.invoiceData"
                ])
                .orderBy('quotations.id', 'desc');


            const Parallel = require('async-parallel');
            let a = 0;
            const final = await Parallel.map(_.uniqBy(rows, 'id'), async(st) => {

                let partDataResult = await knex.from('assigned_parts')
                    .leftJoin('part_master', 'assigned_parts.partId', 'part_master.id')
                    .select([
                        'assigned_parts.*',
                        'part_master.partName',
                        'part_master.partCode',
                        'part_master.unitOfMeasure',
                    ])
                    .where(qb => {

                    })
                    .where({
                        'assigned_parts.orgId': req.orgId,
                        'assigned_parts.entityId': st.id,
                        'assigned_parts.entityType': 'quotations'
                    })

                let chargeDataResult = await knex.from('assigned_service_charges')
                    .leftJoin('charge_master', 'assigned_service_charges.chargeId', 'charge_master.id')
                    .select([
                        'assigned_service_charges.*',
                        'charge_master.chargeCode',
                        'charge_master.descriptionThai',
                        'charge_master.descriptionEng',
                        'charge_master.calculationUnit'

                    ])
                    .where(qb => {

                    })
                    .where({
                        'assigned_service_charges.orgId': req.orgId,
                        'assigned_service_charges.entityId': st.id,
                        'assigned_service_charges.entityType': 'quotations'
                    })


                let updatePartData = [];
                let updateChargeData = [];
                let totalCost;
                let unitPrice;
                let totalPrice;

                let i = 0;
                for (let d of partDataResult) {



                    unitPrice = d.unitCost;

                    totalPrice = d.quantity * d.unitCost;


                    // if (st.invoiceData) {


                    //   if (st.invoiceData[0]) {

                    //     unitPrice = st.invoiceData[0].parts[i].unitCost;
                    //totalPrice = st.invoiceData[0].parts[i].quantity * st.invoiceData[0].parts[i].unitCost;
                    //   totalPrice = d.quantity * st.invoiceData[0].parts[i].unitCost;
                    // }
                    //}
                    i++;

                    totalCost = d.quantity * d.avgUnitPrice;

                    updatePartData.push({...d, totalCost: totalCost, unitPrice: unitPrice, totalPrice: totalPrice })
                }

                let tagsResult = [];
                tagsResult = await knex('location_tags')
                    .leftJoin('location_tags_master', 'location_tags.locationTagId', 'location_tags_master.id')
                    .where({ 'location_tags.entityId': st.id, 'location_tags.entityType': 'quotations', 'location_tags.orgId': req.orgId })
                    .where(qb => {

                        if (payload.tags && payload.tags.length) {

                            if (payload.tags.includes('all')) {

                            } else {

                                let tag = payload.tags.map(v => v.id);

                                qb.whereIn('location_tags.locationTagId', tag);
                            }

                        }
                    })

                tagsResult = _.uniqBy(tagsResult, 'title');
                tagsResult = tagsResult.map(v => v.title);
                let tag;
                tag = tagsResult.toString();

                let chargeTotalCost;
                let chargeUnitPrice;
                let chargeTotalPrice;

                let j = 0;
                for (let charge of chargeDataResult) {



                    //  if (st.invoiceData) {

                    // if (st.invoiceData[0]) {


                    //     chargeUnitPrice = st.invoiceData[0].charges[j].rate;
                    //     chargeTotalPrice = st.invoiceData[0].charges[j].rate * st.invoiceData[0].charges[j].totalHours;
                    // }
                    // }
                    j++;

                    chargeUnitPrice = charge.rate;
                    chargeTotalPrice = charge.totalHours * charge.rate;

                    chargeTotalCost = charge.totalHours * charge.rate;

                    updateChargeData.push({...charge, chargeTotalCost: chargeTotalCost, chargeUnitPrice: chargeUnitPrice, chargeTotalPrice: chargeTotalPrice })

                }



                let totalRowSpan = 0;

                totalRowSpan = Number(updatePartData.length) + Number(updateChargeData.length);

                return {
                    partData: updatePartData,
                    createdAt: st.createdAt,
                    qNo: st.qNo,
                    tags: tag,
                    chargeData: updateChargeData,
                    rowSpan: totalRowSpan,
                    invoiceData: st.invoiceData
                }
            })





            return res.status(200).json({
                data: final,
                message: "Quotation Cost Report successfully!"
            });


        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    /*GET QUOTATION REGISTER REPORT */

    getQuotationRegisterReport: async(req, res) => {

        try {

            let rows;
            const accessibleProjects = req.userProjectResources[0].projects
            let payload = req.body;
            let result;

            rows = await knex
                .distinct('quotations.id')
                .from("quotations")
                .leftJoin('companies', 'quotations.companyId', 'companies.id')
                .leftJoin('projects', 'quotations.projectId', 'projects.id')
                .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
                .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
                .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
                .leftJoin(
                    "service_requests",
                    "quotations.serviceRequestId",
                    "service_requests.id"
                )
                .leftJoin(
                    "service_orders",
                    "service_requests.id",
                    "service_orders.serviceRequestId"
                )
                .leftJoin(
                    "assigned_service_team",
                    "service_requests.id",
                    "assigned_service_team.entityId"
                )
                .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                .leftJoin("users", "quotations.createdBy", "users.id")
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
                .leftJoin(
                    "incident_categories",
                    "service_problems.categoryId",
                    "incident_categories.id"
                )
                .leftJoin(
                    "service_status AS status",
                    "service_requests.serviceStatusCode",
                    "status.statusCode"
                )

            //.leftJoin('user_house_allocation', 'quotations.unitId', 'user_house_allocation.houseId')
            //.leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')

            .select([
                    "quotations.id as QId",
                    "quotations.serviceRequestId as serviceRequestId",
                    "service_requests.description as Description",
                    "service_requests.id as SRID",
                    "service_requests.priority as Priority",
                    "users.name as Created By",
                    "companies.companyName",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "buildings_and_phases.description as buildingDescription",
                    "floor_and_zones.floorZoneCode",
                    "property_units.unitNumber",
                    //"assignUser.name as Tenant Name",
                    "quotations.quotationStatus as Status",
                    "quotations.createdAt",
                    "incident_categories.descriptionEng as problemDescription",
                    "requested_by.name as requestedBy",
                    //"user_house_allocation",
                    "property_units.id as unitId",
                    "quotations.displayId as Q No",
                    "service_requests.displayId as srNo",
                    "companies.companyId",
                    "projects.project",
                    "quotations.displayId as qNo",
                    "quotations.id",
                    "service_orders.displayId as soNo",
                    "service_requests.createdAt as serviceCreatedDate",
                    "quotations.approvedOn",
                    "status.descriptionEng as ServiceStatus",
                    "service_requests.completedOn"
                ])
                .where("quotations.orgId", req.orgId)
                .where(qb => {

                    if (payload.companyId) {

                        if (payload.companyId == "all") {

                        } else {
                            qb.where('quotations.companyId', payload.companyId.id);
                        }
                    }
                    if (payload.projectId) {

                        if (payload.projectId == "all") {

                        } else {

                            qb.where('quotations.projectId', payload.projectId.id);
                        }
                    }

                    if (payload.buildingId) {


                        if (payload.buildingId == "all") {

                        } else {

                            qb.where('quotations.buildingId', payload.buildingId.id);
                        }

                    }

                    if (payload.unitId && payload.unitId.length) {


                        if (payload.unitId.includes("all")) {

                        } else {


                            let unit = payload.unitId.map(v => v.id);
                            qb.whereIn('quotations.unitId', unit);
                        }

                    }

                    if (payload.teamId && payload.teamId.length) {

                        if (payload.teamId.includes("all")) {

                        } else {

                            let team = payload.teamId.map(v => v.teamId);
                            qb.whereIn('teams.teamId', team);
                        }
                    }


                    if (payload.serviceStatus && payload.serviceStatus.length) {

                        if (payload.serviceStatus.includes("all")) {

                        } else {

                            qb.whereIn('status.statusCode', payload.serviceStatus);
                        }
                    }

                    if (payload.quotationStatus && payload.quotationStatus.length) {

                        if (payload.quotationStatus.includes("all")) {

                        } else {

                            qb.whereIn('quotations.quotationStatus', payload.quotationStatus);
                        }
                    }

                    if (payload.fromDate && payload.toDate) {
                        qb.whereBetween('service_requests.createdAt', [payload.fromDate, payload.toDate])
                    }
                })
                .whereIn('quotations.projectId', accessibleProjects)
                // .havingNotNull('quotations.quotationStatus')
                .groupBy(["quotations.id", "service_requests.id", "users.id", "companies.companyName",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "floor_and_zones.floorZoneCode",
                    "property_units.unitNumber",
                    "requested_by.id",
                    "service_problems.id",
                    "incident_categories.id",
                    "incident_categories.descriptionEng",
                    //"assignUser.id",
                    // "assignUser.name",
                    //"user_house_allocation.id",
                    "buildings_and_phases.description",
                    // "user_house_allocation.userId",
                    "property_units.id",
                    "companies.companyName",
                    "companies.companyId",
                    "projects.project",
                    'service_orders.id',
                    'status.id'
                    //"quotations.invoiceData"
                ])
                .orderBy('quotations.id', 'desc');






            const Parallel = require('async-parallel');
            let a = 0;
            const final = await Parallel.map(_.uniqBy(rows, 'id'), async(st) => {



                let tagsResult = [];
                let remarkResult;
                tagsResult = await knex('location_tags')
                    .leftJoin('location_tags_master', 'location_tags.locationTagId', 'location_tags_master.id')
                    .where({ 'location_tags.entityId': st.id, 'location_tags.entityType': 'quotations', 'location_tags.orgId': req.orgId })
                    .where(qb => {

                        if (payload.tags && payload.tags.length) {

                            if (payload.tags.includes('all')) {

                            } else {

                                let tag = payload.tags.map(v => v.id);

                                qb.whereIn('location_tags.locationTagId', tag);
                            }

                        }
                    })

                tagsResult = _.uniqBy(tagsResult, 'title');
                tagsResult = tagsResult.map(v => v.title);
                let tag;
                tag = tagsResult.toString();

                remarkResult = await knex('remarks_master')
                    .where({ entityId: st.id, entityType: "quotations_notes", orgId: req.orgId }).first();


                let remarks = "";
                if (remarkResult) {
                    remarks = remarkResult.description;

                }


                /* GET TENANT NAME OPEN */
                let tenantName = "";
                let houseResult = await knex.from('user_house_allocation').select('userId').where({ houseId: st.unitId }).first().orderBy('id', 'desc')

                if (houseResult) {
                    let tetantResult = await knex.from('users').select('name').where({ id: houseResult.userId }).first()
                    tenantName = tetantResult.name;
                }
                /* GET TENANT NAME CLOSE */



                return {
                    ...st,
                    tags: tag,
                    remarks: remarks,
                    tenantName: tenantName,

                }
            })


            return res.status(200).json({
                data: final,
                message: "Quotation Cost Report successfully!"
            });


        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }


    }

};

module.exports = quotationsController;