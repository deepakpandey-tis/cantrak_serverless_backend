const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");

const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const facilityBookingController = {
    addFacility: async(req,res) => {
        try {
            const payload = _.omit(req.body,[
                'rules_and_regulations',
                'open_close_times','images',
                'fees_payload',
                'booking_frequency',
                'booking_criteria'
            ]);
            
            const schema = Joi.object().keys({
                "name":Joi.string().required(),
                "companyId":Joi.string().required(),
                "projectId":Joi.string().required(),
                "buildingPhaseId":Joi.string().required(),
                "floorZoneId":Joi.string().required(),
                "description": Joi.string().required(),
                "descriptionAlternateLang":Joi.string().required(),
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

            // Insert Facility
            let addedFacilityResultData = await knex('facility_master')
            .insert({...payload,updatedAt:currentTime,createdAt:currentTime,orgId:req.orgId,createdBy:req.me.id}).returning(['*'])
            let addedFacilityResult = addedFacilityResultData[0]


            // Insert Rules
            
            let rulesPayload = req.body.rules_and_regulations
            let addedRules = []
            for (let rule of rulesPayload){
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
            let addedOpenCloseTimeResult = await knex('entity_open_close_times').insert({ entityId: addedFacilityResult.id, entityType: 'facility_master', ...open_close_times, updatedAt: currentTime, createdAt: currentTime, orgId: req.orgId }).returning(['*'])
            

            // Images
            const images = req.body.images;
            let insertedImages = []
            for(let img of images){
                let insertedImage = await knex('images').insert({ entityType: 'facility_master',
                 entityId: addedFacilityResult.id,
                 s3Url:img.s3Url,
                 name:img.filename,
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
            const feesResult = await knex('entity_fees_master').insert({
                ...fees_payload,
                entityId:addedFacilityResult.id,
                entityType:'facility_master',
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
            const bookingFrequencyResult = await knex('entity_booking_limit')
                .insert({ ...booking_frequency,
                    entityType:'facility_master',
                    entityId:addedFacilityResult.id,
                    updatedAt: currentTime,
                    createdAt: currentTime,
                    orgId: req.orgId,
                    
                }).returning(['*'])

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
            const addedBookingCriteriaResult = await knex('entity_booking_criteria')
                .insert({ ...bookingCriteriaPayload,
                    entityId:addedFacilityResult.id,
                    entityType:'facility_master',
                    updatedAt: currentTime,
                    createdAt: currentTime,
                    orgId: req.orgId,
                    
                }).returning(['*'])
            

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
        } catch(err) {
            console.log('ADD FACILITY ERROR: ',err)
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },

    deleteFacility:async(req,res) => {
        try {
            const id = req.body.id;

            const deactivatedFacility = await knex('facility_master').update({isActive:false}).where({id:id}).returning(['*'])
            return res.status(200).json({
                data:{
                    deactivatedFacility
                },
                message:'Facility deactivated Successfully!'
            })
        } catch(err) {
            console.log('DELETE FACILITY ERROR: ', err)
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    }

}


module.exports = facilityBookingController;