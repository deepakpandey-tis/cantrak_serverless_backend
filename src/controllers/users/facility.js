const knex = require("../../db/knex");
const Joi = require("@hapi/joi");
const moment = require("moment-timezone");
// const momentWithTZ = require("moment");
const _ = require("lodash");
const emailHelper = require('../../helpers/email')


const SUNDAY = 'Sun';
const MONDAY = 'Mon';
const TUESDAY = 'Tue';
const WEDNESDAY = 'Wed';
const THURSDAY = 'Thu';
const FRIDAY = 'Fri';
const SATURDAY = 'Sat';

const WEEK_DAYS = [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY];

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

            console.log("customerHouseInfo", req.me.houseIds);
            let houseIdArray = req.me.houseIds;

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
                    .where({ "entityId": pd.id, "entityType": 'facility_master' })


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
                knex.from('entity_open_close_times').where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })
                ,
                knex.from('rules_and_regulations').where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })
                ,
                knex.from('entity_booking_criteria').where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId }).first()
                ,
                knex.from('images').where({ entityId: payload.id, entityType: 'facility_master' }),
                knex('entity_fees_master').select(['feesType', 'feesAmount', 'duration']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId }),
                knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })

            ])

            return res.status(200).json({

                facilityDetails: {
                    ...facilityDetails, openingClosingDetail: _.uniqBy(openingClosingDetail, 'day'), ruleRegulationDetail: _.uniqBy(ruleRegulationDetail, 'rules'),
                    bookingCriteriaDetail, facilityImages, feeDetails, bookingLimits: _.uniqBy(bookingLimits, 'limitType')
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
            let { listType } = req.body;
            let endTime = new Date().getTime();

            console.log("listType+++++++", listType);

            if (listType == "upcoming") {

                console.log("upcoming++++++++++++++++++++");

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
                        'facility_master.isActive'
                    ])
                    // .where(qb => {
                    //     if (listType) {

                    //         if (listType == "upcoming") {
                    //             qb.where('entity_bookings.bookingEndDateTime', '>=', endTime)
                    //         }

                    //         if (listType == "expired") {
                    //             qb.where('entity_bookings.bookingEndDateTime', '<=', endTime)
                    //         }
                    //     }
                    // })
                    .where('entity_bookings.bookingStartDateTime', '>=', endTime)
                    .where({ 'entity_bookings.entityType': 'facility_master', 'entity_bookings.orgId': req.orgId })
                    .where({ 'entity_bookings.bookedBy': id })
                    .orderBy('entity_bookings.bookingStartDateTime', 'asc')
            }

            if (listType == "expired") {

                console.log("expired++++++++++++++++++++");

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
                        'facility_master.isActive'
                    ])
                    // .where(qb => {
                    //     if (listType) {

                    //         if (listType == "upcoming") {
                    //             qb.where('entity_bookings.bookingEndDateTime', '>=', endTime)
                    //         }

                    //         if (listType == "expired") {
                    //             qb.where('entity_bookings.bookingEndDateTime', '<=', endTime)
                    //         }
                    //     }
                    // })
                    .where('entity_bookings.bookingEndDateTime', '<=', endTime)
                    .where({ 'entity_bookings.entityType': 'facility_master', 'entity_bookings.orgId': req.orgId })
                    .where({ 'entity_bookings.bookedBy': id })
                    .orderBy('entity_bookings.bookingEndDateTime', 'desc')

            }

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
            console.log("customerHouseInfo", req.me.houseIds);
            let unitId = req.me.houseIds[0];

            let startTime = new Date(payload.bookingStartDateTime).getTime();
            let endTime = new Date(payload.bookingEndDateTime).getTime();

            let currentTime = new Date().getTime();

            let price = await knex.from('entity_fees_master').where({ entityId: payload.facilityId }).first();

            let facilitySlot = await knex.from('entity_booking_criteria').where({ entityId: payload.facilityId }).first();

            let totalFees = 0;

            if (price.feesType == '1') {
                totalFees = price.feesAmount * payload.noOfSeats;
            } else if (price.feesType == '2') {
                let calDuration = facilitySlot.slotDuration * price.feesAmount / price.duration;
                totalFees = calDuration * payload.noOfSeats;
            } else {
                totalFees = 0;
            }


            // Confirmed Status (1=>Auto Confirmed, 2=>Manually Confirmed)
            if (facilityData.bookingStatus == 1) {
                confirmedStatus = true;
            } else {
                confirmedStatus = false;
            }

            let insertData = {
                entityId: payload.facilityId,
                entityType: "facility_master",
                bookedAt: currentTime,
                bookedBy: id,
                noOfSeats: payload.noOfSeats,
                feesPaid: totalFees,
                bookingStartDateTime: startTime,
                bookingEndDateTime: endTime,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
                unitId: unitId,
                companyId: facilityData.companyId,
                isBookingConfirmed: confirmedStatus
            }

            let insertResult = await knex('entity_bookings').insert(insertData).returning(['*']);
            resultData = insertResult[0];

            const user = await knex('users').select(['email', 'name']).where({ id: id }).first();

            await emailHelper.sendTemplateEmail({ to: user.email, subject: 'Booking Confirmed', template: 'booking-confirmed.ejs', templateData: { fullName: user.name, bookingStartDateTime: moment(Number(resultData.bookingStartDateTime)).format('YYYY-MM-DD HH:MM A'), bookingEndDateTime: moment(+resultData.bookingEndDateTime).format('YYYY-MM-DD HH:MM A'), noOfSeats: resultData.noOfSeats } })

            let updateDisplayId = await knex('entity_bookings').update({ isActive: true }).where({ isActive: true });

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
            console.log("customerHouseInfo", req.me.houseIds);
            let unitIds = req.me.houseIds[0];

            const schema = Joi.object().keys({
                facilityId: Joi.string().required(),
                bookingStartDateTime: Joi.date().required(),
                bookingEndDateTime: Joi.date().required(),
                offset: Joi.number().required(),
                currentTime: Joi.date().required(),
                timezone: Joi.string().required(),
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            // Set timezone for moment
            moment.tz.setDefault(payload.timezone);
            let currentTime = moment();
            console.log('Current Time:', currentTime.format('MMMM Do YYYY, h:mm:ss a'));


            let bookingStartTime = moment(+payload.bookingStartDateTime).seconds(0).milliseconds(0).valueOf();
            let bookingEndTime = moment(+payload.bookingEndDateTime).seconds(0).milliseconds(0).valueOf();
            console.log('User Selected Booking Start/End Time: ', moment(bookingStartTime).format('YYYY-MM-DD HH:mm'), moment(bookingEndTime).format('YYYY-MM-DD HH:mm'));

            let bookingDay = moment(bookingStartTime).format('ddd');
            console.log('Checking Booking Availability of Day: ', bookingDay);

            let openCloseTimes = await knex.from('entity_open_close_times').where({
                entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId,
                day: bookingDay
            }).first();
            console.log('openCloseTimes:', openCloseTimes);

            let bookingFullDay = moment(bookingStartTime).format('dddd');

            if (!openCloseTimes) {
                return res.status(400).json({
                    errors: [
                        { code: "BOOKING_CLOSED_FOR_THE_DAY", message: `Booking is not opened for selected day (${bookingFullDay}).` }
                    ]
                });
            }

            let bookingCriteria = await knex('entity_booking_criteria').select('*').where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId }).first();
            console.log("bookingCriteria", bookingCriteria);

            if (bookingCriteria && bookingCriteria.bookingType == '1') {   // Flexible Booking

                if (bookingEndTime <= bookingStartTime) {
                    return res.status(400).json({
                        errors: [
                            { code: "INVALID_DATE_TIME_SELECTION", message: `Booking end time should be greater than start time. Please correct!` }
                        ]
                    });
                }

                let openingTimeOnBookingDay = moment(bookingStartTime).hours(moment(+openCloseTimes.openTime).hours())
                    .minutes(moment(+openCloseTimes.openTime).minutes()).seconds(0).milliseconds(0);


                let closingTimeOnBookingDay = moment(bookingStartTime).hours(moment(+openCloseTimes.closeTime).hours())
                    .minutes(moment(+openCloseTimes.closeTime).minutes()).seconds(0).milliseconds(0);

                console.log('openingTimeOnBookingDay:', openingTimeOnBookingDay.format('YYYY-MM-DD HH:mm:ss'));    
                console.log('closingTimeOnBookingDay:', closingTimeOnBookingDay.format('YYYY-MM-DD HH:mm:ss'));    


                if (openingTimeOnBookingDay.valueOf() > moment(bookingStartTime).valueOf()) {
                    return res.status(400).json({
                        errors: [
                            { code: "INVALID_DATE_TIME_SELECTION", message: `Please select booking start and end time b/w opening and closing hours for the day.` }
                        ]
                    });
                }


                if (closingTimeOnBookingDay.valueOf() < moment(bookingEndTime).valueOf()) {
                    return res.status(400).json({
                        errors: [
                            { code: "INVALID_DATE_TIME_SELECTION", message: `Please select booking start and end time b/w opening and closing hours for the day.` }
                        ]
                    });
                }

                let bookingPeriodAllow = await knex('entity_booking_criteria').select(['maxBookingPeriod', 'minBookingPeriod']).where({ entityId: payload.facilityId, bookingType: 1, entityType: 'facility_master', orgId: req.orgId }).first();
                console.log("maxBookingPeriodAllow", bookingPeriodAllow);
                let maxDuration;
                let minDuration;

                if (bookingPeriodAllow && bookingPeriodAllow.maxBookingPeriod) {
                    maxDuration = moment(+payload.bookingEndDateTime) - moment(+payload.bookingStartDateTime);
                    let maxDurationInMinutes = maxDuration / 1000 / 60;
                    console.log("maxDuration", maxDurationInMinutes);

                    if (maxDurationInMinutes > bookingPeriodAllow.maxBookingPeriod) {
                        return res.status(400).json({
                            errors: [
                                { code: "MAX_BOOKING_DURATION", message: `Maximum booking duration allowed is ${bookingPeriodAllow.maxBookingPeriod} minutes. You can not book more then max duration.` }
                            ]
                        });
                    }
                }

                if (bookingPeriodAllow && bookingPeriodAllow.minBookingPeriod) {
                    minDuration = moment(+payload.bookingEndDateTime) - moment(+payload.bookingStartDateTime);
                    let minDurationInMinutes = minDuration / 1000 / 60;
                    console.log("minDuration", minDurationInMinutes);

                    if (minDurationInMinutes < bookingPeriodAllow.minBookingPeriod) {
                        return res.status(400).json({
                            errors: [
                                { code: "MIN_BOOKING_DURATION", message: `Minimum booking duration allowed is ${bookingPeriodAllow.minBookingPeriod} minutes. You can not book less then min duration.` }
                            ]
                        });
                    }
                }

            }


            let bookingAllowingTiming = await knex('entity_booking_criteria').select(['bookingAllowedAdvanceTime', 'bookingCloseAdvanceTime']).where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId }).first();

            console.log('Booking Start Time:', moment(bookingStartTime).format('MMMM Do YYYY, h:mm:ss a'));
            console.log('bookingAllowingTiming', bookingAllowingTiming);

            if (bookingAllowingTiming && bookingAllowingTiming.bookingAllowedAdvanceTime) {

                console.log('Advance Allow Time:', moment(currentTime).add(+bookingAllowingTiming.bookingAllowedAdvanceTime, 'minutes').format('MMMM Do YYYY, h:mm:ss a'));

                let isValidBookingInsideAllowPeriod = moment(currentTime).add(+bookingAllowingTiming.bookingAllowedAdvanceTime, 'minutes') > moment(bookingStartTime);

                console.log("isValidBookingInsideAllowPeriod", isValidBookingInsideAllowPeriod);


                if (!isValidBookingInsideAllowPeriod) {

                    let advanceString = bookingAllowingTiming.bookingAllowedAdvanceTime;
                    if (parseInt(advanceString / 24 / 60) > 0) {
                        advanceString = parseInt(advanceString / 24 / 60) + " days, " + parseInt(advanceString / 60 % 24) + ' hours, ' + parseInt(advanceString % 60) + ' minutes';
                    } else {
                        advanceString = parseInt(advanceString / 60 % 24) + ' hours, ' + parseInt(advanceString % 60) + ' minutes';
                    }

                    return res.status(400).json({
                        errors: [
                            { code: "ADVANCED_BOOKING_ALLOW_DURATION", message: `Advance booking upto ${advanceString} is allowed only.` }
                        ]
                    });
                }
            }



            if (bookingAllowingTiming && bookingAllowingTiming.bookingCloseAdvanceTime) {

                console.log('Advance Booking Close Time:', moment(currentTime).add(+bookingAllowingTiming.bookingCloseAdvanceTime, 'minutes').format('MMMM Do YYYY, h:mm:ss a'));


                let isValidBookingBeforeLockPeriod = moment(currentTime).add(+bookingAllowingTiming.bookingCloseAdvanceTime, 'minutes') < moment(bookingStartTime);

                console.log("isValidBookingBeforeLockPeriod", isValidBookingBeforeLockPeriod);

                if (!isValidBookingBeforeLockPeriod) {
                    return res.status(400).json({
                        errors: [
                            { code: "ADVANCED_BOOKING_LOCK_DURATION", message: `Booking needs to be made before ${bookingAllowingTiming.bookingCloseAdvanceTime} minutes of booking start period.` }
                        ]
                    });
                }
            }


            // Validate Daily Quota Limit, Weekly Quota Limit, And Monthly Quota Limit
            let dailyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 1, entityType: 'facility_master', orgId: req.orgId }).first();

            if (dailyQuota) {
                let startOfDay = moment(+payload.bookingStartDateTime).startOf('day').valueOf();
                let endOfDay = moment(+payload.bookingStartDateTime).endOf('day').valueOf();
                console.log("startOfDay", startOfDay, endOfDay);

                let rawQuery = await knex.raw(`select COALESCE(SUM("noOfSeats"),0) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfDay}  and "bookingEndDateTime"  <= ${endOfDay} and "isBookingConfirmed" = true and "unitId" = ${unitIds}`);
                let totalBookedSeatForADay = rawQuery.rows[0].totalseats;
                console.log("total Bookings Done for a day", totalBookedSeatForADay);

                // Checking Daily Booking Quota Limit Is Completed
                if (dailyQuota.limitValue <= totalBookedSeatForADay) {
                    return res.status(400).json({
                        errors: [
                            { code: "DAILY_QUOTA_EXCEEDED", message: `Your daily quota of ${dailyQuota.limitValue} seat bookings is full. You can not book any more seats today.` }
                        ]
                    });
                }
            }

            let weeklyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 2, entityType: 'facility_master', orgId: req.orgId }).first();

            if (weeklyQuota) {

                let startOfWeek = moment(+payload.bookingStartDateTime).startOf('week').valueOf();
                let endOfWeek = moment(+payload.bookingStartDateTime).endOf('week').valueOf();
                console.log("startOfWeek", startOfWeek, endOfWeek);

                let rawQuery = await knex.raw(`select COALESCE(SUM("noOfSeats"),0) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfWeek}  and "bookingEndDateTime"  <= ${endOfWeek} and "isBookingConfirmed" = true  and "unitId" = ${unitIds}`);
                let totalBookedSeatForAWeek = rawQuery.rows[0].totalseats;
                console.log("total Bookings Done for a week", totalBookedSeatForAWeek);

                // Checking Weekly Booking Quota Limit Is Completed
                if (weeklyQuota.limitValue <= totalBookedSeatForAWeek) {
                    return res.status(400).json({
                        errors: [
                            { code: "WEEKLY_QUOTA_EXCEEDED", message: `Your weekly quota of ${weeklyQuota.limitValue} seat bookings is full. You can not book any more seats in this week.` }
                        ]
                    });
                }
            }

            let monthlyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 3, entityType: 'facility_master', orgId: req.orgId }).first();

            if (monthlyQuota) {
                let startOfMonth = moment(+payload.bookingStartDateTime).startOf('month').valueOf();
                let endOfMonth = moment(+payload.bookingStartDateTime).endOf('month').valueOf();
                console.log("startOfMonth", startOfMonth, endOfMonth);

                let rawQuery = await knex.raw(`select COALESCE(SUM("noOfSeats"),0) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfMonth}  and "bookingEndDateTime"  <= ${endOfMonth} and "isBookingConfirmed" = true  and "unitId" = ${unitIds}`);
                let totalBookedSeatForAMonth = rawQuery.rows[0].totalseats;
                console.log("total Bookings Done for a month", totalBookedSeatForAMonth);

                // Checking Monthly Booking Quota Limit Is Completed
                if (monthlyQuota.limitValue <= totalBookedSeatForAMonth) {
                    return res.status(400).json({
                        errors: [
                            { code: "MONTHLY_QUOTA_EXCEEDED", message: `Your monthly quota of ${monthlyQuota.limitValue} seat bookings is full. You can not book any more seats in this month.` }
                        ]
                    });
                }
            }


            let availableSeats = 0;

            let bookingData = await knex('entity_bookings').sum('noOfSeats as totalBookedSeats')
                .where('entity_bookings.bookingStartDateTime', '>=', bookingStartTime)
                .where('entity_bookings.bookingStartDateTime', '<=', bookingEndTime)
                .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', 'orgId': req.orgId }).first();

            let facilityData = await knex.from('facility_master')
                .leftJoin('entity_booking_criteria', 'facility_master.id', 'entity_booking_criteria.entityId')
                .select([
                    'facility_master.id',
                    'facility_master.name',
                    'facility_master.multipleSeatsLimit',
                    'entity_booking_criteria.minBookingPeriod',
                    'entity_booking_criteria.maxBookingPeriod',
                    'entity_booking_criteria.bookingAllowedAdvanceTime',
                    'entity_booking_criteria.bookingCloseAdvanceTime',
                    'entity_booking_criteria.allowConcurrentBooking',
                    'entity_booking_criteria.concurrentBookingLimit',
                ])
                .where({ 'facility_master.id': payload.facilityId, 'facility_master.orgId': req.orgId })
                .first();

            availableSeats = Number(facilityData.concurrentBookingLimit) - Number(bookingData.totalBookedSeats);

            let QuotaData = await knex('entity_booking_limit')
                .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', orgId: req.orgId })
                .orderBy('limitType');


            const Parallel = require('async-parallel');
            let startOf;
            let endOf;
            QuotaData = await Parallel.map(QuotaData, async item => {

                if (item.limitType == 1) {
                    startOf = moment(+payload.bookingStartDateTime).startOf('day').valueOf();
                    endOf = moment(+payload.bookingStartDateTime).endOf('day').valueOf();
                }

                if (item.limitType == 2) {
                    startOf = moment(+payload.bookingStartDateTime).startOf('week').valueOf();
                    endOf = moment(+payload.bookingStartDateTime).endOf('week').valueOf();
                }

                if (item.limitType == 3) {
                    startOf = moment(+payload.bookingStartDateTime).startOf('month').valueOf();
                    endOf = moment(+payload.bookingStartDateTime).endOf('month').valueOf();
                }


                let rawQuery = await knex.raw(`select COALESCE(SUM("noOfSeats"),0) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf} and "isBookingConfirmed" = true and "unitId" = ${unitIds}`);
                console.log("totalBookedSeats", rawQuery.rows);
                let totalBookedSeat = rawQuery.rows[0].totalseats;

                console.log("totalSeats", item.limitValue);

                let id = item.limitType;

                let remainingLimit = item.limitValue - totalBookedSeat;
                let bookedSeat = totalBookedSeat;

                return {
                    ...item,
                    remaining: Number(remainingLimit),
                    bookedSeats: Number(bookedSeat)
                };
            })


            return res.status(200).json({
                data: {
                    facility: { ...facilityData, availableSeats, userQuota: QuotaData }
                },
                message: "Facility Data successfully!"
            })


        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            })

        }
    },



    /* User Can Cancel booking facility */
    cancelBooking: async (req, res) => {
        try {
            const { bookingId, cancellationReason } = req.body;
            const currentTime = new Date().getTime()
            const cancelled = await knex('entity_bookings').update({ cancellationReason, cancelledAt: currentTime, cancelledBy: req.me.id, isBookingCancelled: true, isBookingConfirmed: false }).where({ id: bookingId }).returning(['*'])
            const bookedByUser = await knex('entity_bookings').select('*').where({ id: bookingId }).first()
            const user = await knex('users').select(['email', 'name']).where({ id: bookedByUser.bookedBy }).first()
            await emailHelper.sendTemplateEmail({ to: user.email, subject: 'Booking Cancelled', template: 'booking-cancelled.ejs', templateData: { fullName: user.name, reason: cancellationReason, bookingStartDateTime: moment(Number(bookedByUser.bookingStartDateTime)).format('YYYY-MM-DD HH:MM A'), bookingEndDateTime: moment(+bookedByUser.bookingEndDateTime).format('YYYY-MM-DD HH:MM A'), noOfSeats: bookedByUser.noOfSeats } })
            return res.status(200).json({ message: 'cancelled!', data: cancelled })
        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            })
        }
    }
}


module.exports = facilityBookingController;