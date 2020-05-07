const Joi = require('@hapi/joi');
const _ = require('lodash');
const AWS = require('aws-sdk');
const knex = require("../db/knex");
const moment = require("moment-timezone");




AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const SHOULD_QUEUE = false;
const facilityHelper = {
    getFacilityBookingCapacity: async ({ facilityId, bookingStartDateTime, bookingEndDateTime, offset, currentTime, timezone, unitId, orgId }) => {
        try {

            // console.log('[helpers][facility][getFacilityBookingCapacity] To:', to);
            // console.log('[helpers][facility][getFacilityBookingCapacity] Template Data:', templateData);

            const schema = Joi.object().keys({
                facilityId: Joi.string().required(),
                bookingStartDateTime: Joi.date().required(),
                bookingEndDateTime: Joi.date().required(),
                offset: Joi.number().required(),
                currentTime: Joi.date().required(),
                timezone: Joi.string().required(),
                unitId: Joi.string().required(),
                orgId: Joi.string().required()
            });

            const result = Joi.validate({ facilityId, bookingStartDateTime, bookingEndDateTime, offset, currentTime, timezone, unitId, orgId }, schema);
            console.log('[helpers][facility][getFacilityBookingCapacity]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return { code: 'PARAMS_VALIDATION_ERROR', message: + result.error.message, error: new Error('Could Not Get Facility Quota to params Validations Failed.') };
            }

           // Get project id

            let facilityMaster = await knex('facility_master').select('projectId')
                .where({ id: facilityId, orgId: orgId, isActive: true }).first();

            let getPropertyUnits = await knex('property_units').select('*')
                .where({ projectId: facilityMaster.projectId, orgId: orgId, id: unitId })

          
            unitIds = getPropertyUnits[0].id//;
            // Case 2: If property unit does not have any property unit type set
            // Error : 
            if (getPropertyUnits[0].propertyUnitType == null) {
                return { code: 'PROPERTY_UNIT_TYPE_STATUS', message: + result.error.message, error: new Error('Property unit type of one of your properties is not defined please contact admin.....') };
            }

            let getFacilityQuotaData = await knex('facility_property_unit_type_quota_limit').select('*').where({ entityId: facilityId, entityType: 'facility_master', propertyUnitTypeId: getPropertyUnits[0].propertyUnitType, orgId: orgId });
        
            let facilityData = await knex.from('entity_booking_criteria')
                .select('entity_booking_criteria.concurrentBookingLimit')
                .where({ 'entity_booking_criteria.entityId': facilityId, 'entity_booking_criteria.entityType': 'facility_master', 'entity_booking_criteria.orgId': orgId })
                .first();

            if (facilityData.concurrentBookingLimit == null || getFacilityQuotaData == '') {
                // Case 1 : concurrent booking is not defined and property unit type not set quota for this facility,  all quota type  will set as unlimited
                dailyQuota = 999999;
                monthlyQuota = 999999;
                weeklyQuota = 999999;
            } else {
                dailyQuota = getFacilityQuotaData[0].daily;
                weeklyQuota = getFacilityQuotaData[0].weekly;
                monthlyQuota = getFacilityQuotaData[0].monthly;
            }
          
            // Set timezone for moment
            moment.tz.setDefault(timezone);
            currentTime = moment();
           

            let bookingStartTime = moment(+bookingStartDateTime).seconds(0).milliseconds(0).valueOf();
            let bookingEndTime = moment(+bookingEndDateTime).seconds(0).milliseconds(0).valueOf();
          
            let bookingDay = moment(bookingStartTime).format('ddd');
          
            let openCloseTimes = await knex.from('entity_open_close_times').where({
                entityId: facilityId, entityType: 'facility_master', orgId: orgId,
                day: bookingDay
            }).first();
          
            let bookingFullDay = moment(bookingStartTime).format('dddd');

            if (!openCloseTimes) {

                return { code: 'BOOKING_CLOSED_FOR_THE_DAY', message: + result.error.message, error: new Error(`Booking is not opened for selected day (${bookingFullDay}).`) };

                // return res.status(400).json({
                //     errors: [
                //         { code: "BOOKING_CLOSED_FOR_THE_DAY", message: `Booking is not opened for selected day (${bookingFullDay}).` }
                //     ]
                // });
            }

            // check facility is closed

            let closeFacility = await knex('facility_master')
                .select('inActiveReason')
                .where({ id: facilityId, orgId: orgId, isActive: false })
                .first();

            if (closeFacility) {

                let closeReasonMessage = closeFacility.inActiveReason;
                return { code: 'FACILITY_CLOSED_STATUS', message: + result.error.message, error: new Error(`Facility is closed : Reason- ${closeReasonMessage}.`) };

                // return res.status(400).json({
                //     errors: [
                //         { code: "FACILITY_CLOSED_STATUS", message: `Facility is closed : Reason- ${closeReasonMessage}.` }
                //     ]
                // });
            }

            // check facility is closed

            let closeFacilityTiming = await knex('facility_close_date')
                .select('*')
                .where({ entityId: facilityId, entityType: 'facility_master', orgId: orgId })
                .where('facility_close_date.endDate', '>', bookingStartTime)
                .where('facility_close_date.startDate', '<', bookingEndTime)
                .first();

            if (closeFacilityTiming) {

                let closeReason = await knex('facility_close_date')
                    .select('closeReason')
                    .where({ entityId: facilityId, entityType: 'facility_master', orgId: orgId })
                    .first();

                let closeReasonMessage = closeReason.closeReason;
                return { code: 'FACILITY_CLOSED', message: + result.error.message, error: new Error(`Facility is closed : Reason- ${closeReasonMessage}.`) };

                // return res.status(400).json({
                //     errors: [
                //         { code: "FACILITY_CLOSED", message: `Facility is closed for selected time slot : Reason- ${closeReasonMessage}.` }
                //     ]
                // });
            }


            let bookingCriteria = await knex('entity_booking_criteria').select('*').where({ entityId: facilityId, entityType: 'facility_master', orgId: orgId }).first();
          
            if (bookingCriteria && bookingCriteria.bookingType == '1') {   // Flexible Booking

                if (bookingEndTime <= bookingStartTime) {
                    return { code: 'INVALID_DATE_TIME_SELECTION', message: + result.error.message, error: new Error(`Booking end time should be greater than start time. Please correct!`) };

                    // return res.status(400).json({
                    //     errors: [
                    //         { code: "INVALID_DATE_TIME_SELECTION", message: `Booking end time should be greater than start time. Please correct!` }
                    //     ]
                    // });
                }

                let openingTimeOnBookingDay = moment(bookingStartTime).hours(moment(+openCloseTimes.openTime).hours())
                    .minutes(moment(+openCloseTimes.openTime).minutes()).seconds(0).milliseconds(0);


                let closingTimeOnBookingDay = moment(bookingStartTime).hours(moment(+openCloseTimes.closeTime).hours())
                    .minutes(moment(+openCloseTimes.closeTime).minutes()).seconds(0).milliseconds(0);

             

                if (openingTimeOnBookingDay.valueOf() > moment(bookingStartTime).valueOf()) {
                    return { code: 'INVALID_DATE_TIME_SELECTION', message: + result.error.message, error: new Error(`Please select booking start and end time b/w opening and closing hours for the day.`) };


                    // return res.status(400).json({
                    //     errors: [
                    //         { code: "INVALID_DATE_TIME_SELECTION", message: `Please select booking start and end time b/w opening and closing hours for the day.` }
                    //     ]
                    // });
                }


                if (closingTimeOnBookingDay.valueOf() < moment(bookingEndTime).valueOf()) {
                    return { code: 'INVALID_DATE_TIME_SELECTION', message: + result.error.message, error: new Error(`Please select booking start and end time b/w opening and closing hours for the day.`) };

                    // return res.status(400).json({
                    //     errors: [
                    //         { code: "INVALID_DATE_TIME_SELECTION", message: `Please select booking start and end time b/w opening and closing hours for the day.` }
                    //     ]
                    // });
                }

                let bookingPeriodAllow = await knex('entity_booking_criteria').select(['maxBookingPeriod', 'minBookingPeriod']).where({ entityId: facilityId, bookingType: 1, entityType: 'facility_master', orgId: orgId }).first();
                let maxDuration;
                let minDuration;

                if (bookingPeriodAllow && bookingPeriodAllow.maxBookingPeriod) {
                    maxDuration = moment(+bookingEndDateTime) - moment(+bookingStartDateTime);
                    let maxDurationInMinutes = maxDuration / 1000 / 60;
                
                    if (maxDurationInMinutes > bookingPeriodAllow.maxBookingPeriod) {
                        return { code: 'MAX_BOOKING_DURATION', message: + result.error.message, error: new Error(`Maximum booking duration allowed is ${bookingPeriodAllow.maxBookingPeriod} minutes. You can not book more then max duration.`) };

                        // return res.status(400).json({
                        //     errors: [
                        //         { code: "MAX_BOOKING_DURATION", message: `Maximum booking duration allowed is ${bookingPeriodAllow.maxBookingPeriod} minutes. You can not book more then max duration.` }
                        //     ]
                        // });
                    }
                }

                if (bookingPeriodAllow && bookingPeriodAllow.minBookingPeriod) {
                    minDuration = moment(+bookingEndDateTime) - moment(+bookingStartDateTime);
                    let minDurationInMinutes = minDuration / 1000 / 60;
                 
                    if (minDurationInMinutes < bookingPeriodAllow.minBookingPeriod) {
                        return { code: 'MIN_BOOKING_DURATION', message: + result.error.message, error: new Error(`Minimum booking duration allowed is ${bookingPeriodAllow.minBookingPeriod} minutes. You can not book less then min duration.`) };

                        // return res.status(400).json({
                        //     errors: [
                        //         { code: "MIN_BOOKING_DURATION", message: `Minimum booking duration allowed is ${bookingPeriodAllow.minBookingPeriod} minutes. You can not book less then min duration.` }
                        //     ]
                        // });
                    }
                }

            }


            let bookingAllowingTiming = await knex('entity_booking_criteria').select(['bookingAllowedAdvanceTime', 'bookingCloseAdvanceTime']).where({ entityId: facilityId, entityType: 'facility_master', orgId: orgId }).first();

          
            if (bookingAllowingTiming && bookingAllowingTiming.bookingAllowedAdvanceTime) {

              
                let isValidBookingInsideAllowPeriod = moment(currentTime).add(+bookingAllowingTiming.bookingAllowedAdvanceTime, 'minutes') > moment(bookingStartTime);

              
                if (!isValidBookingInsideAllowPeriod) {

                    let advanceString = bookingAllowingTiming.bookingAllowedAdvanceTime;
                    if (parseInt(advanceString / 24 / 60) > 0) {
                        advanceString = parseInt(advanceString / 24 / 60) + " days, " + parseInt(advanceString / 60 % 24) + ' hours, ' + parseInt(advanceString % 60) + ' minutes';
                    } else {
                        advanceString = parseInt(advanceString / 60 % 24) + ' hours, ' + parseInt(advanceString % 60) + ' minutes';
                    }

                    return { code: 'ADVANCED_BOOKING_ALLOW_DURATION', message: + result.error.message, error: new Error(`Advance booking upto ${advanceString} is allowed only.`) };


                    // return res.status(400).json({
                    //     errors: [
                    //         { code: "ADVANCED_BOOKING_ALLOW_DURATION", message: `Advance booking upto ${advanceString} is allowed only.` }
                    //     ]
                    // });
                }
            }



            if (bookingAllowingTiming && bookingAllowingTiming.bookingCloseAdvanceTime) {

              
                let isValidBookingBeforeLockPeriod = moment(currentTime).add(+bookingAllowingTiming.bookingCloseAdvanceTime, 'minutes') < moment(bookingStartTime);

              
                if (!isValidBookingBeforeLockPeriod) {
                    return { code: 'ADVANCED_BOOKING_LOCK_DURATION', message: + result.error.message, error: new Error(`Booking needs to be made before ${bookingAllowingTiming.bookingCloseAdvanceTime} minutes of booking start period.`) };

                    // return res.status(400).json({
                    //     errors: [
                    //         { code: "ADVANCED_BOOKING_LOCK_DURATION", message: `Booking needs to be made before ${bookingAllowingTiming.bookingCloseAdvanceTime} minutes of booking start period.` }
                    //     ]
                    // });
                }
            }

            let quotaBooked = 0;

            if (dailyQuota && dailyQuota > 0) {
                let dailyQuotas = Number(dailyQuota);
                let startOfDay = moment(+bookingStartDateTime).startOf('day').valueOf();
                let endOfDay = moment(+bookingStartDateTime).endOf('day').valueOf();
             
                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${facilityId}  and  "bookingStartDateTime" >= ${startOfDay}  and "bookingEndDateTime"  <= ${endOfDay} and "isBookingCancelled" = false  and "unitId" = ${unitIds} `);
                let totalBookedSeatForADay = rawQuery.rows[0].totalseats;
                quotaBooked = dailyQuota;
                // Checking Daily Booking Quota Limit Is Completed
                if (dailyQuotas <= totalBookedSeatForADay) {
                    return { code: 'DAILY_QUOTA_EXCEEDED', message: + result.error.message, error: new Error(`Your daily quota of ${dailyQuota} seat bookings is full. You can not book any more seats today.`) };

                    // return res.status(400).json({
                    //     errors: [
                    //         { code: "DAILY_QUOTA_EXCEEDED", message: `Your daily quota of ${dailyQuota} seat bookings is full. You can not book any more seats today.` }
                    //     ]
                    // });
                }
            }

            if (weeklyQuota && weeklyQuota > 0) {
                let weeklyQuotas = Number(weeklyQuota);
                let startOfWeek = moment(+bookingStartDateTime).startOf('week').valueOf();
                let endOfWeek = moment(+bookingStartDateTime).endOf('week').valueOf();
                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${facilityId}  and  "bookingStartDateTime" >= ${startOfWeek}  and "bookingEndDateTime"  <= ${endOfWeek} and "isBookingCancelled" = false  and "unitId" = ${unitIds} `);
                let totalBookedSeatForAWeek = rawQuery.rows[0].totalseats;
                quotaBooked = weeklyQuota;
                // Checking Weekly Booking Quota Limit Is Completed
                if (weeklyQuotas <= totalBookedSeatForAWeek) {
                    return { code: 'WEEKLY_QUOTA_EXCEEDED', message: + result.error.message, error: new Error(`Your weekly quota of ${weeklyQuota} seat bookings is full. You can not book any more seats in this week.`) };

                    // return res.status(400).json({
                    //     errors: [
                    //         { code: "WEEKLY_QUOTA_EXCEEDED", message: `Your weekly quota of ${weeklyQuota} seat bookings is full. You can not book any more seats in this week.` }
                    //     ]
                    // });
                }
            }


            if (monthlyQuota && monthlyQuota > 0) {
                let monthlyQuotas = Number(monthlyQuota);
             
                let startOfMonth = moment(+bookingStartDateTime).startOf('month').valueOf();
                let endOfMonth = moment(+bookingStartDateTime).endOf('month').valueOf();
              
                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${facilityId}  and  "bookingStartDateTime" >= ${startOfMonth}  and "bookingEndDateTime"  <= ${endOfMonth} and "isBookingCancelled" = false and "unitId" = ${unitIds} `);
                let totalBookedSeatForAMonth = rawQuery.rows[0].totalseats;
                quotaBooked = monthlyQuota;
                // Checking Monthly Booking Quota Limit Is Completed
                if (monthlyQuotas <= totalBookedSeatForAMonth) {
                    return { code: 'MONTHLY_QUOTA_EXCEEDED', message: + result.error.message, error: new Error(`Your monthly quota of ${monthlyQuota} seat bookings is full. You can not book any more seats in this month.`) };

                    // return res.status(400).json({
                    //     errors: [
                    //         { code: "MONTHLY_QUOTA_EXCEEDED", message: `Your monthly quota of ${monthlyQuota} seat bookings is full. You can not book any more seats in this month.` }
                    //     ]
                    // });
                }
            }


            let availableSeats = 0;

            let bookingData = await knex('entity_bookings').sum('noOfSeats as totalBookedSeats')
                .where('entity_bookings.bookingEndDateTime', '>', bookingStartTime)
                .where('entity_bookings.bookingStartDateTime', '<', bookingEndTime)
                .where({ 'entityId': facilityId, 'entityType': 'facility_master', 'isBookingCancelled': false, 'orgId': orgId }).first();
            console.log("totalBookingSeats/bookingData", bookingData);


            let facilityDatas = await knex.from('facility_master')
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
                .where({ 'facility_master.id': facilityId, 'facility_master.orgId': orgId })
                .first();

            // Check if pax capacity disable and set NO
            if (facilityDatas.allowConcurrentBooking == true) {
                availableSeats = Number(facilityDatas.concurrentBookingLimit) - Number(bookingData.totalBookedSeats);
            } else if (dailyQuota == 999999 && weeklyQuota == 999999 && monthlyQuota == 999999) {
                availableSeats = Number(5000);
            } else {
                if (facilityDatas.concurrentBookingLimit == 0) {
                    availableSeats = Number(quotaBooked) - Number(bookingData.totalBookedSeats);
                } else {
                    availableSeats = Number(facilityDatas.concurrentBookingLimit) - Number(bookingData.totalBookedSeats);
                }
            }


            console.log("totalSeatAvailable", facilityDatas.concurrentBookingLimit, bookingData.totalBookedSeats)
            console.log("availableSeats", availableSeats);


            let startOf;
            let endOf;
            let dailyLimit = 0;
            let weeklyLimit = 0;
            let monthlyLimit = 0;
            let dailyRemainingLimit = 0;
            let dailyBookedSeat = 0;
            let weeklyRemainingLimit = 0;
            let weeklyBookedSeat = 0;
            let monthlyRemainingLimit = 0;
            let monthlyBookedSeat = 0;


            if (dailyQuota && dailyQuota > 0) {
                startOf = moment(+bookingStartDateTime).startOf('day').valueOf();
                endOf = moment(+bookingStartDateTime).endOf('day').valueOf();

                let rawQuery = await knex.raw(`select COALESCE(SUM("noOfSeats"),0) AS totalSeats from entity_bookings where "entityId"  = ${facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf} and "isBookingCancelled" = false and "unitId" = ${unitIds} `);
                let totalBookedSeat = rawQuery.rows[0].totalseats;

                dailyLimit = dailyQuota;
                dailyRemainingLimit = dailyQuota - totalBookedSeat;
                dailyBookedSeat = totalBookedSeat;
            }

            if (weeklyQuota && weeklyQuota > 0) {
                startOf = moment(+bookingStartDateTime).startOf('week').valueOf();
                endOf = moment(+bookingStartDateTime).endOf('week').valueOf();

                let rawQuery = await knex.raw(`select COALESCE(SUM("noOfSeats"),0) AS totalSeats from entity_bookings where "entityId"  = ${facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf}  and "isBookingCancelled" = false and "unitId" = ${unitIds} `);
                let totalBookedSeat = rawQuery.rows[0].totalseats;

                weeklyLimit = weeklyQuota;
                weeklyRemainingLimit = weeklyQuota - totalBookedSeat;
                weeklyBookedSeat = totalBookedSeat;
            }

            if (monthlyQuota && monthlyQuota > 0) {
                startOf = moment(+bookingStartDateTime).startOf('month').valueOf();
                endOf = moment(+bookingStartDateTime).endOf('month').valueOf();

                let rawQuery = await knex.raw(`select COALESCE(SUM("noOfSeats"),0) AS totalSeats from entity_bookings where "entityId"  = ${facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf} and  "isBookingCancelled" = false and "unitId" = ${unitIds} `);
                let totalBookedSeat = rawQuery.rows[0].totalseats;

                monthlyLimit = monthlyQuota;
                monthlyRemainingLimit = monthlyQuota - totalBookedSeat;
                monthlyBookedSeat = totalBookedSeat;
            }
            
            let bookingQuota = availableSeats
            console.log("HelperRemaining", bookingQuota);

            return bookingQuota;

        } catch (err) {
            console.log('[helpers][facility][sendFacilityBooking]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    }

};

module.exports = facilityHelper;