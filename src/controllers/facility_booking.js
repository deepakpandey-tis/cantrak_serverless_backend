const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");

const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const facilityBookingController = {
    addFacility: async (req, res) => {
        try {
            let addedFacilityResult = null
            let addedRules = []
            let addedOpenCloseTimeResult = []
            let insertedImages = []
            let feesResult = []
            let bookingFrequencyResult = []
            let addedBookingCriteriaResult = []
            await knex.transaction(async () => {


                const payload = _.omit(req.body, [
                    'rules_and_regulations',
                    'open_close_times', 'images',
                    'fees_payload',
                    'booking_frequency',
                    'booking_criteria',
                    'facilityId',
                    'descriptionAlternateLang',
                    'statuses'
                ]);

                const schema = Joi.object().keys({
                    name: Joi.string().required(),
                    companyId: Joi.string().required(),
                    projectId: Joi.string().required(),
                    buildingPhaseId: Joi.string().required(),
                    floorZoneId: Joi.string().required(),
                    description: Joi.string().required(),
                    // "descriptionAlternateLang": Joi.string().required(),
                })

                const result = Joi.validate(payload, schema);
                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }



                let currentTime = new Date().getTime()
                let descriptionAlternateLang = req.body.descriptionAlternateLang ? req.body.descriptionAlternateLang : ''
                // Insert Facility
                let addedFacilityResultData = await knex('facility_master')
                    .update({
                        ...payload,
                        descriptionAlternateLang,
                        updatedAt: currentTime,
                        createdAt: currentTime,
                        orgId: req.orgId,
                        createdBy: req.me.id,
                        bookingStatus: req.body.statuses.bookingStatus,
                        moderationStatus: true,
                        multipleSeatsLimit: req.body.statuses.multipleSeatsLimit
                    }).where({ id: req.body.facilityId }).returning(['*'])
                addedFacilityResult = addedFacilityResultData[0]

                // Insert Rules

                let rulesPayload = req.body.rules_and_regulations
                addedRules = []
                for (let rule of rulesPayload) {
                    /*
                    {rules,
                    "rulesAlternateLang",}
                    */
                    let addedRulesResult = await knex('rules_and_regulations').insert({ entityId: addedFacilityResult.id, entityType: 'facility_master', ...rule, updatedAt: currentTime, createdAt: currentTime, orgId: req.orgId, createdBy: req.me.id }).returning(['*'])
                    addedRules.push(addedRulesResult[0])
                }


                // Open Close Time
                /*
                {"day",
                "openTime",
                "closeTime"
                */

                const open_close_times = req.body.open_close_times
                addedOpenCloseTimeResult = []
                for (let a of open_close_times) {
                    if (a.day && a.openTime && a.closeTime) {
                        addedOpenCloseTimeResultData = await knex('entity_open_close_times').insert({ entityId: addedFacilityResult.id, entityType: 'facility_master', ...a, updatedAt: currentTime, createdAt: currentTime, orgId: req.orgId }).returning(['*'])
                        addedOpenCloseTimeResult.push(addedOpenCloseTimeResultData[0])
                    }
                }



                // Images
                const images = req.body.images;
                insertedImages = []
                for (let img of images) {
                    let insertedImage = await knex('images').insert({
                        entityType: 'facility_master',
                        entityId: addedFacilityResult.id,
                        s3Url: img.s3Url,
                        name: img.filename,
                        title: img.title,
                        orgId: req.orgId,
                        updatedAt: currentTime,
                        createdAt: currentTime,

                    }).returning(['*'])
                    insertedImages.push(insertedImage[0])
                }


                // Fees
                const fees_payload = req.body.fees_payload
                /**
                 * "feesType"
                    "feesAmount"
                    duration
                 */
                feesResult = await knex('entity_fees_master').insert({
                    ...fees_payload,
                    entityId: addedFacilityResult.id,
                    entityType: 'facility_master',
                    updatedAt: currentTime,
                    createdAt: currentTime,
                    orgId: req.orgId,

                }).returning(['*'])



                // Booking Frequency limit
                const booking_frequency = req.body.booking_frequency;
                /*
                    "limitType" 
                    "limitValue"
                */
                bookingFrequencyResult = []
                for (let b of booking_frequency) {
                    let bookingFrequencyResultData = await knex('entity_booking_limit')
                        .insert({
                            ...b,
                            entityType: 'facility_master',
                            entityId: addedFacilityResult.id,
                            updatedAt: currentTime,
                            createdAt: currentTime,
                            orgId: req.orgId,

                        }).returning(['*'])
                    bookingFrequencyResult.push(bookingFrequencyResultData)
                }

                // Booking Criteria
                /**
                 * {"bookingAllowedAdvanceTime"
                    "bookingCloseAdvanceTime"
                    "allowConcurrentBooking"
                    "concurrentBookingLimit"
                    "minBookingPeriod"
                    "maxBookingPeriod"}
                 */

                const bookingCriteriaPayload = req.body.booking_criteria;
                addedBookingCriteriaResult = await knex('entity_booking_criteria')
                    .insert({
                        ...bookingCriteriaPayload,
                        entityId: addedFacilityResult.id,
                        entityType: 'facility_master',
                        updatedAt: currentTime,
                        createdAt: currentTime,
                        orgId: req.orgId,

                    }).returning(['*'])
            })
            return res.status(200).json({
                data: {
                    addedFacility: addedFacilityResult,
                    addedRules: addedRules,
                    addedOpenCloseTime: addedOpenCloseTimeResult,
                    addedImages: insertedImages,
                    addedFees: feesResult,
                    addedBookingFrequency: bookingFrequencyResult,
                    addedBookingCriteria: addedBookingCriteriaResult
                }
            })

            trx.commit


        } catch (err) {
            console.log('ADD FACILITY ERROR: ', err)
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },

    deleteFacility: async (req, res) => {
        try {
            const id = req.body.id;

            const deactivatedFacility = await knex('facility_master').update({ isActive: false }).where({ id: id }).returning(['*'])
            return res.status(200).json({
                data: {
                    deactivatedFacility
                },
                message: 'Facility deactivated Successfully!'
            })
        } catch (err) {
            console.log('DELETE FACILITY ERROR: ', err)
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    /*FACILITY DETAILS*/
    facilityDetails: async (req, res) => {

        try {

            let orgId = req.orgId;
            let payload = req.body;
            const schema = Joi.object().keys({
                id: Joi.string().required()
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let [facilityDetails,
                openingCloseingDetail,
                ruleRegulationDetail,
                bookingCriteriaDetail,
                facilityImages,
                feeDetails,
                bookingLimits
            ] = await Promise.all([

                knex.from('facility_master')
                    .leftJoin("companies", "facility_master.companyId", "companies.id")
                    .leftJoin("projects", "facility_master.projectId", "projects.id")
                    .leftJoin("buildings_and_phases", "facility_master.buildingPhaseId", "buildings_and_phases.id")
                    .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                    .select([
                        'facility_master.id',
                        'facility_master.name',
                        'facility_master.description',
                        'facility_master.descriptionAlternateLang',
                        'companies.companyId',
                        'companies.id as cid',
                        'projects.id as pid',
                        'buildings_and_phases.id as bid',
                        'floor_and_zones.id as fid',
                        'companies.companyName',
                        'projects.project as projectId',
                        'projects.projectName',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as buildingName',
                        'floor_and_zones.floorZoneCode',
                        'floor_and_zones.description as floorName',
                    ])
                    .where({ 'facility_master.id': payload.id }).first()
                ,
                knex.from('entity_open_close_times').where({ entityId: payload.id, entityType: 'facility_master' })
                ,
                knex.from('rules_and_regulations').where({ entityId: payload.id, entityType: 'facility_master' })
                ,
                knex.from('entity_booking_criteria').where({ entityId: payload.id, entityType: 'facility_master' }).first()
                ,
                knex.from('images').where({ entityId: payload.id, entityType: 'facility_master' }),
                knex('entity_fees_master').select(['feesType', 'feesAmount', 'duration']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId }),
                knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })
            ])

            return res.status(200).json({
                facilityDetails: { ...facilityDetails, openingCloseingDetail, ruleRegulationDetail, bookingCriteriaDetail, facilityImages, feeDetails, bookingLimits },
                message: "Facility Details!"
            });

        } catch (err) {

            console.log("controller[facility-booking][facilityDetails]")

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    },
    facilityListing: async (req, res) => {
        try {
            let reqData = req.query;
            //let filters = req.body;
            let total, rows;
            // const accessibleProjects = req.userProjectResources[0].projects

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let filters = {};
            let { companyId,
                projectId,
                buildingPhaseId,
                floorZoneId,
                facilityName } = req.body;


            if (companyId || projectId || buildingPhaseId || floorZoneId || facilityName) {
                try {
                    [total, rows] = await Promise.all([
                        knex
                            .count("* as count")
                            .from("facility_master")
                            .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                            .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                            .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                            .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')

                            .where(qb => {
                                if (facilityName) {
                                    qb.where('facility_master.name', 'iLIKE', `%${facilityName}%`)
                                }
                                if (projectId) {
                                    qb.where('facility_master.projectId', projectId)

                                }
                                if (buildingPhaseId) {
                                    qb.where('facility_master.buildingPhaseId', buildingPhaseId)
                                }
                                if (floorZoneId) {
                                    qb.where('facility_master.floorZoneId', floorZoneId)
                                }
                                if (companyId) {
                                    qb.where('facility_master.companyId', companyId)
                                }
                                qb.where("facility_master.orgId", req.orgId)

                            })
                            .groupBy([
                                "facility_master.id",
                                "companies.id",
                                "projects.id",
                                "buildings_and_phases.id",
                                "floor_and_zones.id"
                            ]),
                        knex
                            .from("facility_master")
                            .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                            .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                            .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                            .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')

                            .select([
                                "facility_master.id",
                                "facility_master.name",
                                "companies.companyName",
                                "projects.projectName",
                                "buildings_and_phases.buildingPhaseCode",
                                "buildings_and_phases.description as buildingDescription",
                                "floor_and_zones.floorZoneCode"
                            ])
                            .where(qb => {
                                if (facilityName) {
                                    qb.where('facility_master.name', 'iLIKE', `%${facilityName}%`)
                                }
                                if (projectId) {
                                    qb.where('facility_master.projectId', projectId)

                                }
                                if (buildingPhaseId) {
                                    qb.where('facility_master.buildingPhaseId', buildingPhaseId)
                                }
                                if (floorZoneId) {
                                    qb.where('facility_master.floorZoneId', floorZoneId)
                                }
                                if (companyId) {
                                    qb.where('facility_master.companyId', companyId)
                                }
                                qb.where("facility_master.orgId", req.orgId)

                            })
                            .offset(offset)
                            .limit(per_page)
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
                } catch (e) {
                    // Error
                }

            } else {

                [total, rows] = await Promise.all([
                    knex
                        .count("* as count")
                        .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                        .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                        .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                        .from("facility_master")
                        .where("facility_master.orgId", req.orgId)
                        .groupBy([
                            "facility_master.id",
                            "companies.id",
                            "projects.id",
                            "buildings_and_phases.id",
                            "floor_and_zones.id"
                        ]),
                    knex
                        .from("facility_master")
                        .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                        .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                        .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                        .where("facility_master.orgId", req.orgId)
                        .select([
                            "facility_master.id",
                            "facility_master.name",
                            "companies.companyName",
                            "projects.projectName",
                            "buildings_and_phases.buildingPhaseCode",
                            "buildings_and_phases.description as buildingDescription",
                            "floor_and_zones.floorZoneCode"
                        ])
                        .groupBy([
                            "facility_master.id",
                            "companies.id",
                            "projects.id",
                            "buildings_and_phases.id",
                            "floor_and_zones.id"
                        ])
                        .orderBy('facility_master.id', 'desc')
                        .offset(offset)
                        .limit(per_page)
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
            }



            return res.status(200).json({
                data: {
                    facilities: pagination
                },
                message: "Facility List!"
            });
        } catch (err) {
            console.log("[controllers][facilityBooking][list] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    generateFacilityId: async (req, res) => {
        try {
            const generatedId = await knex('facility_master').insert({ createdAt: new Date().getTime() }).returning(['*'])
            return res.status(200).json({
                data: {
                    id: generatedId[0].id
                }
            })
        } catch (err) {
            console.log("[controllers][facilityBooking][list] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
    ,
    /*GET FACILITY BOOKING LIST  */
    getFacilityBookingList: async (req, res) => {

        try {

            let { fromDate, toDate, id } = req.query;
            let orgId = req.orgId;
            let newFromDate;
            let newToDate;
            if (fromDate) {
                newFromDate = new Date(fromDate).getTime();
            }
            if (toDate) {
                newToDate = new Date(toDate).getTime();
            }

            let result;

            if (id || fromDate && toDate) {

                result = await knex.from('entity_bookings')
                    .where({ orgId })
                    .where(qb => {


                        if (fromDate && toDate) {

                            qb.where('bookingStartDateTime', '>=', newFromDate)
                            qb.where('bookingEndDateTime', '<', newToDate)
                            //qb.whereBetween("entity_bookings.bookingStartDateTime", [newFromDate, newFromDate]);
                            // qb.whereBetween("entity_bookings.bookingEndDateTime", [newToDate, newToDate]);
                        }

                        if (id === "undefined") {

                        } else {

                            qb.where('entity_bookings.entityId', id)
                            qb.where('entity_bookings.entityType', 'facility_master')
                        }

                    })

            } else {
                result = await knex.from('entity_bookings')
                    .where({ orgId })

            }


            const Parallel = require('async-parallel');
            result = await Parallel.map(result, async item => {
                let id = item.bookedBy;
                let book = await knex('users').where({ id: id }).select('name', 'email', 'mobileNo', 'id').first();
                return {
                    ...item,
                    bookedBy: book
                };
            })

            return res.status(200).json({
                data: {
                    bookedData: result
                },
                message: "Booked List!"
            });


        } catch (err) {
            console.log("[controllers][facilityBooking]:  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }

    },
    /*GET USER FACILITY LIST */
    getUserFacilityList: async (req, res) => {

        try {
            let id = req.me.id;
            let propertUnitresult = null;
            let userHouseResult = null;
            let propertyUnitFinalResult = null;
            let resourceProject = req.userProjectResources[0].projects;
            let { startDateTime, endDateTime, projectId, buildingId } = req.body;
            let resultData;

            propertUnitresult = await knex.from('property_units')
                .where({ orgId: req.orgId })
                .whereIn('projectId', resourceProject);

            let propertyUnitArray = propertUnitresult.map(v => v.id);

            userHouseResult = await knex.from('user_house_allocation')
                .where({ userId: id, orgId: req.orgId })
                .whereIn('houseId', propertyUnitArray);
            let houseIdArray = userHouseResult.map(v => v.houseId)

            propertyUnitFinalResult = await knex.from('property_units')
                .where({ orgId: req.orgId })
                .whereIn('id', houseIdArray);

            let projectArray = _.uniqBy(propertyUnitFinalResult, 'projectId').map(v => v.projectId)


            resultData = await knex.from('facility_master')
                .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                .leftJoin('entity_open_close_times', 'facility_master.id', 'entity_open_close_times.entityId')
                .select([
                    'facility_master.*',
                    'companies.companyId as companyCode',
                    'companies.companyName',
                    'projects.project as projectCode',
                    'projects.projectName',
                    'buildings_and_phases.buildingPhaseCode',
                    'buildings_and_phases.description as buildingName',
                    'floor_and_zones.floorZoneCode',
                    'floor_and_zones.description as floorName',
                ])
                .where(qb => {
                    if (projectId) {
                        qb.where('facility_master.projectId', projectId)
                    }
                    if (buildingId) {
                        qb.where('facility_master.buildingPhaseId', buildingId)
                    }
                    if (startDateTime && endDateTime) {

                        qb.where('entity_open_close_times.openTime', '>=', startDateTime)
                        qb.where('entity_open_close_times.closeTime', '<=', endDateTime)

                    }
                })
                .where({ 'facility_master.orgId': req.orgId, 'facility_master.moderationStatus': true })
                .whereIn('facility_master.projectId', projectArray)
                .orderBy('facility_master.id', 'desc')
                .groupBy('facility_master.id', 'companies.id', 'projects.id', 'buildings_and_phases.id', 'floor_and_zones.id')
                .distinct('facility_master.id')


            const Parallel = require('async-parallel');
            resultData = await Parallel.map(resultData, async pd => {

                let imageResult = await knex.from('images').select('s3Url', 'title', 'name')
                    .where({ "entityId": pd.id, "entityType": 'facility_master', orgId: req.orgId })


                let currentTime = new Date().getTime();
                let startDate = moment(currentTime).startOf('date').format();
                let endDate = moment(currentTime).endOf('date').format();
                let startTime = new Date(startDate).getTime();
                let endTime = new Date(endDate).getTime();

                let bookingResult = await knex.from('entity_bookings')
                    .where({ "entityId": pd.id, "entityType": 'facility_master', orgId: req.orgId })
                    .whereBetween('bookedAt', [startTime, endTime]);

                let todayTotalBooking = 0;
                if (bookingResult.length) {
                    todayTotalBooking = bookingResult.length;
                }

                return {
                    ...pd,
                    uploadedImages: imageResult,
                    todayTotalBooking
                }

            })

            res.status(200).json({
                data: {
                    facilityData: resultData
                },
                message: "Facility list successfully!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },
    /*FACILITY DETAILS */
    userFacilityDetails: async (req, res) => {

        try {

            let resultData;
            let payload = req.body;

            const schema = Joi.object().keys({
                id: Joi.string().required()
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let [facilityDetails,
                openingCloseingDetail,
                ruleRegulationDetail,
                bookingCriteriaDetail,
                facilityImages,
                feeDetails,
                bookingLimits
            ] = await Promise.all([

                await knex.from('facility_master')
                    .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                    .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                    .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                    .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                    .select([
                        'facility_master.*',
                        'companies.companyId as companyCode',
                        'companies.companyName',
                        'projects.project as projectCode',
                        'projects.projectName',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as buildingName',
                        'floor_and_zones.floorZoneCode',
                        'floor_and_zones.description as floorName',
                    ])
                    .where({ 'facility_master.id': payload.id }).first(),
                knex.from('entity_open_close_times').where({ entityId: payload.id, entityType: 'facility_master' })
                ,
                knex.from('rules_and_regulations').where({ entityId: payload.id, entityType: 'facility_master' })
                ,
                knex.from('entity_booking_criteria').where({ entityId: payload.id, entityType: 'facility_master' }).first()
                ,
                knex.from('images').where({ entityId: payload.id, entityType: 'facility_master' }),
                knex('entity_fees_master').select(['feesType', 'feesAmount', 'duration']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId }),
                knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })

            ])

            res.status(200).json({

                facilityDetails: {
                    ...facilityDetails, openingCloseingDetail, ruleRegulationDetail,
                    bookingCriteriaDetail, facilityImages, feeDetails, bookingLimits
                },
                message: "Facility Details Successfully!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*YOUR FACILITY BOOKING LIST */
    yourFacilityBookingList: async (req, res) => {

        try {

            let resultData;
            let id = req.me.id;

            resultData = await knex.from('entity_bookings')
                .leftJoin('facility_master', 'entity_bookings.entityId', 'facility_master.id')
                .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                .select([
                    'entity_bookings.*',
                    'facility_master.id as facilityId',
                    'facility_master.name as facilityName',
                    'companies.companyId as companyCode',
                    'companies.companyName',
                    'projects.project as projectCode',
                    'projects.projectName',
                    'buildings_and_phases.buildingPhaseCode',
                    'buildings_and_phases.description as buildingName',
                    'floor_and_zones.floorZoneCode',
                    'floor_and_zones.description as floorName',
                ])
                .where({ 'entity_bookings.entityType': 'facility_master', 'entity_bookings.orgId': req.orgId })
                .where({ 'entity_bookings.bookedBy': id })

            res.status(200).json({
                bookingData: resultData,
                message: "Your booking list successfully!"

            })


        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }]
            })
        }
    }
}


module.exports = facilityBookingController;