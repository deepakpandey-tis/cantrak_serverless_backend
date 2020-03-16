const knex = require("../../db/knex");
const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
const _ = require("lodash");
const emailHelper = require('../../helpers/email')

const facilityBookingController = {

    /*GET USER FACILITY LIST */
    getUserFacilityList: async (req, res) => {

        try {
            let id = req.me.id;
            let propertUnitresult = null;
            let userHouseResult = null;
            let propertyUnitFinalResult = null;
            //let resourceProject = req.userProjectResources[0].projects;
            let { startDateTime, endDateTime, projectId, buildingId } = req.body;
            let resultData;

            // propertUnitresult = await knex.from('property_units')
            //     .where({ orgId: req.orgId })
            //     .whereIn('projectId', resourceProject);

            //let propertyUnitArray = propertUnitresult.map(v => v.id);

            userHouseResult = await knex.from('user_house_allocation')
                .where({ userId: id, orgId: req.orgId })
            //.whereIn('houseId', propertyUnitArray);
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


                let feeResult = await knex.from('entity_fees_master').select("feesType", "feesAmount", "duration", 'id as feeId')
                    .where({ "entityId": pd.id, "entityType": 'facility_master', orgId: req.orgId }).first();

                let charges;

                if (feeResult) {
                    charges = feeResult;
                }


                return {
                    ...pd,
                    uploadedImages: imageResult,
                    todayTotalBooking,
                    charges
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
                openingClosingDetail,
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
                knex.from('entity_open_close_times').where({ entityId: payload.id, entityType: 'facility_master',orgId:req.orgId})
                ,
                knex.from('rules_and_regulations').where({ entityId: payload.id, entityType: 'facility_master',orgId:req.orgId})
                ,
                knex.from('entity_booking_criteria').where({ entityId: payload.id, entityType: 'facility_master',orgId:req.orgId}).first()
                ,
                knex.from('images').where({ entityId: payload.id, entityType: 'facility_master',orgId:req.orgId}),
                knex('entity_fees_master').select(['feesType', 'feesAmount', 'duration']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId }),
                knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })

            ])

            return res.status(200).json({
                
                facilityDetails: {
                    ...facilityDetails, openingClosingDetail: _.uniqBy(openingClosingDetail, 'day'), ruleRegulationDetail: _.uniqBy(ruleRegulationDetail,'rules'),
                    bookingCriteriaDetail, facilityImages, feeDetails, bookingLimits: _.uniqBy(bookingLimits,'limitType')
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
            let { listType } = req.query;
            let endTime = new Date().getTime();



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
                .where(qb => {
                    if (listType) {

                        if (listType == "upcoming") {
                            qb.where('entity_bookings.bookingEndDateTime', '>=', endTime)
                        }

                        if (listType == "expired") {
                            qb.where('entity_bookings.bookingEndDateTime', '<=', endTime)
                        }
                    }
                })
                .where({ 'entity_bookings.entityType': 'facility_master', 'entity_bookings.orgId': req.orgId })
                .where({ 'entity_bookings.bookedBy': id })


            const Parallel = require('async-parallel');

            resultData = await Parallel.map(resultData, async pd => {

                let imageResult = await knex.from('images').select('s3Url', 'title', 'name')
                    .where({ "entityId": pd.facilityId, "entityType": 'facility_master', orgId: req.orgId })

                return {
                    ...pd,
                    uploadedImages: imageResult
                }
            })



            return res.status(200).json({
                bookingData: resultData,
                message: "Your booking list successfully!"

            })


        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }]
            })
        }
    },
    /*FACILITY BOOK NOW */
    facilityBookNow: async (req, res) => {

        try {
            let id = req.me.id;
            let payload = req.body;
            let resultData;
            const schema = Joi.object().keys({
                facilityId: Joi.string().required(),
                bookingStartDateTime: Joi.date().required(),
                bookingEndDateTime: Joi.date().required(),
                noOfSeats: Joi.number().required(),

            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let facilityData = await knex.from('facility_master').where({ id: payload.facilityId }).first();


            let startTime = new Date(payload.bookingStartDateTime).getTime();
            let endTime = new Date(payload.bookingEndDateTime).getTime();

            let currentTime = new Date().getTime();

            let insertData = {
                entityId: payload.facilityId,
                entityType: "facility_master",
                bookedAt: currentTime,
                bookedBy: id,
                noOfSeats: payload.noOfSeats,
                feesPaid: 0,
                bookingStartDateTime: startTime,
                bookingEndDateTime: endTime,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId
            }

            let insertResult = await knex('entity_bookings').insert(insertData).returning(['*']);
            resultData = insertResult[0];

            const user = await knex('users').select(['email', 'name']).where({ id: id }).first()

            await emailHelper.sendTemplateEmail({ to: user.email, subject: 'Booking Confirmed', template: 'booking-confirmed.ejs', templateData: { fullName: user.name, bookingStartDateTime: moment(Number(resultData.bookingStartDateTime)).format('YYYY-MM-DD HH:MM A'), bookingEndDateTime: moment(+resultData.bookingEndDateTime).format('YYYY-MM-DD HH:MM A'), noOfSeats: resultData.noOfSeats } })


            res.status(200).json({
                result: resultData,
                message: "Your facility booked successfully!"
            })


        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }]
            })
        }
    },
    /* GET FACILITY AVAILABLE SEATS */
    getFacilityAvailableSeats: async (req, res) => {

        try {

            let id = req.me.id;
            let payload = req.body;

            const schema = Joi.object().keys({
                facilityId: Joi.string().required(),
                bookingStartDateTime: Joi.date().required(),
                bookingEndDateTime: Joi.date().required()
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let startTime = new Date(payload.bookingStartDateTime).getTime();
            let endTime = new Date(payload.bookingEndDateTime).getTime();
            let availableSeats = 0;

            let bookingData = await knex('entity_bookings').sum('noOfSeats as totalBookedSeats')
                .where('entity_bookings.bookingStartDateTime', '>=', startTime)
                .where('entity_bookings.bookingStartDateTime', '<=', endTime)
                .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', 'orgId': req.orgId }).first();

            let facilityData = await knex.from('facility_master')
                .leftJoin('entity_booking_criteria', 'facility_master.id', 'entity_booking_criteria.entityId')
                .select([
                    'facility_master.id',
                    'facility_master.name',
                    'facility_master.multipleSeatsLimit',
                    'entity_booking_criteria.allowConcurrentBooking',
                ])
                .where({ 'facility_master.id': payload.facilityId, 'facility_master.orgId': req.orgId })
                .first();

            availableSeats = Number(facilityData.multipleSeatsLimit) - Number(bookingData.totalBookedSeats);

            let QuotaData = await knex('entity_booking_limit')
                .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', orgId: req.orgId });


            return res.status(200).json({
                data: {
                    facility: { ...facilityData, availableSeats, userQuota: _.uniqBy(QuotaData,'facilityId') }
                },
                message: "Facility Data successfully!"
            })


        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }]
            })

        }
    }
}


module.exports = facilityBookingController;