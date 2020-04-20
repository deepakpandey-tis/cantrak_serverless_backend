const Joi = require('@hapi/joi');
const _ = require('lodash');
const AWS = require('aws-sdk');
const knex = require("../db/knex");



AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const SHOULD_QUEUE = false;



const facilityHelper = {
    getFacilityBookingCapacity: async ({ facilityId, propertyUnitTypeId, orgId }) => {
        try {

            // console.log('[helpers][facility][getFacilityBookingCapacity] To:', to);
            // console.log('[helpers][facility][getFacilityBookingCapacity] Template Data:', templateData);

            const schema = Joi.object().keys({
                facilityId: Joi.string().required(),
                propertyUnitTypeId: Joi.string().required(),
                orgId: Joi.string().required(),
            });

            const result = Joi.validate({ facilityId, propertyUnitTypeId, orgId }, schema);
            console.log('[helpers][facility][getFacilityBookingCapacity]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return { code: 'PARAMS_VALIDATION_ERROR', message: + result.error.message, error: new Error('Could Not Get Facility Quota to params Validations Failed.') };
            }

            // Get Facility Quota By Facility Id           

            let AllQuotaData = await knex('facility_property_unit_type_quota_limit')
                .where({ 'entityId': facilityId, 'entityType': 'facility_master', propertyUnitTypeId: propertyUnitTypeId, orgId: orgId }).first();
           
            let dailyLimit;
            let weeklyLimit;
            let monthlyLimit;
           

            if (AllQuotaData && AllQuotaData.daily && AllQuotaData.daily > 0) {
                dailyLimit = AllQuotaData.daily;               
            }

            if (AllQuotaData && AllQuotaData.weekly && AllQuotaData.weekly > 0) {
                weeklyLimit = AllQuotaData.weekly;               
            }

            if (AllQuotaData && AllQuotaData.monthly && AllQuotaData.monthly > 0) {
                monthlyLimit = AllQuotaData.monthly;               
            }

            let bookingQuota = {
                'daily': Number(dailyLimit),
                'weekly': Number(weeklyLimit),
                'monthly': Number(monthlyLimit)
            };

            return bookingQuota;

        } catch (err) {
            console.log('[helpers][facility][getFacilityBookingCapacity]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    }
};

module.exports = facilityHelper;